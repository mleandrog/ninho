import { supabase } from '@/lib/supabase';
import { evolutionService } from './evolution';

const EXPIRATION_MINUTES = 15;

export const queueService = {
    /**
     * Adiciona um lead na fila de um produto. Se for o primeiro (ou se a fila estiver vazia de 'processing'), aciona.
     */
    async addToQueue(campaignId: string, productId: number, phone: string, customerName: string, keyword: string) {
        try {
            // Verificar se o cliente já está na fila deste produto
            const { data: existing } = await supabase
                .from('priority_queue')
                .select('id')
                .eq('campaign_id', campaignId)
                .eq('product_id', productId)
                .eq('customer_phone', phone)
                .single();

            if (existing) {
                return { success: false, message: 'Cliente já está na fila.' };
            }

            // Inserir na fila
            const { error: insertError } = await supabase
                .from('priority_queue')
                .insert({
                    campaign_id: campaignId,
                    product_id: productId,
                    customer_phone: phone,
                    customer_name: customerName,
                    keyword_used: keyword,
                    status: 'waiting'
                });

            if (insertError) throw insertError;

            // Tentar processar a fila (caso ele seja o primeiro e não tenha ninguém processing)
            await this.processNextInQueue(campaignId, productId);
            return { success: true };
        } catch (error) {
            console.error('[QueueService] Erro addToQueue:', error);
            throw error;
        }
    },

    /**
     * Puxa o próximo da fila e envia o link de pagamento.
     */
    async processNextInQueue(campaignId: string, productId: number) {
        try {
            // Verificar se já tem alguém 'processing' para este produto
            const { data: currentProcessing } = await supabase
                .from('priority_queue')
                .select('id')
                .eq('campaign_id', campaignId)
                .eq('product_id', productId)
                .eq('status', 'processing')
                .maybeSingle();

            if (currentProcessing) {
                // Já tem alguém comprando, não faz nada.
                return;
            }

            // Pegar o próximo 'waiting' ordenado por created_at
            const { data: nextUsers, error: fetchError } = await supabase
                .from('priority_queue')
                .select('*, products(name)')
                .eq('campaign_id', campaignId)
                .eq('product_id', productId)
                .eq('status', 'waiting')
                .order('created_at', { ascending: true })
                .limit(1);

            if (fetchError || !nextUsers || nextUsers.length === 0) {
                // Fila vazia
                return;
            }

            const nextInLine = nextUsers[0];

            // 1. Buscar preço e detalhes do produto para o pedido
            const { data: product } = await supabase
                .from('products')
                .select('*')
                .eq('id', productId)
                .single();

            if (!product) {
                console.error(`[QueueService] Produto ${productId} não encontrado.`);
                return;
            }

            // 2. Tentar encontrar perfil do cliente pelo telefone
            const { data: profile } = await supabase
                .from('profiles')
                .select('id')
                .eq('phone', nextInLine.customer_phone)
                .maybeSingle();

            // 3. Criar Pedido Automático
            const orderNumber = `WA${Date.now().toString().slice(-6)}${Math.floor(Math.random() * 100)}`;
            const { data: order, error: orderError } = await supabase
                .from('orders')
                .insert({
                    customer_phone: nextInLine.customer_phone,
                    customer_name: nextInLine.customer_name,
                    status: 'pending',
                    total_amount: product.price,
                    payment_status: 'pending',
                    order_number: orderNumber,
                    customer_id: profile?.id || null
                })
                .select()
                .single();

            if (orderError) {
                console.error('[QueueService] Erro ao criar pedido:', orderError);
                throw orderError;
            }

            // 4. Criar Item do Pedido
            const { error: itemError } = await supabase
                .from('order_items')
                .insert({
                    order_id: order.id,
                    product_id: productId,
                    quantity: 1,
                    price_at_purchase: product.price,
                    product_name: product.name,
                    product_price: product.price,
                    subtotal: product.price
                });

            if (itemError) {
                console.error('[QueueService] Erro ao criar item do pedido:', itemError);
                // Não trava o fluxo, mas loga o erro
            }

            // Gerar link de pagamento / checkout
            const queueId = nextInLine.id;
            const checkoutLink = `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/checkout/wa/${queueId}`;

            // Mensagem
            const productName = product.name || 'Produto';
            const message = `🎉 Parabéns, ${nextInLine.customer_name}! Você é o próximo da fila para o *${productName}*.\n\n` +
                `✅ *Pedido Gerado:* #${orderNumber}\n` +
                `⏳ *Atenção:* Você tem exatamente *${EXPIRATION_MINUTES} minutos* para concluir o pagamento, senão a reserva passará para o próximo da fila.\n\n` +
                `💳 Para calcular o frete e pagar com segurança, acesse o seu link exclusivo abaixo:\n\n` +
                `🔗 ${checkoutLink}`;

            // Atualiza status para processing e seta expires_at
            const expiresAt = new Date();
            expiresAt.setMinutes(expiresAt.getMinutes() + EXPIRATION_MINUTES);

            await supabase
                .from('priority_queue')
                .update({
                    status: 'processing',
                    expires_at: expiresAt.toISOString()
                })
                .eq('id', queueId);

            // Enviar mensagem via Evolution API
            await evolutionService.sendMessage(nextInLine.customer_phone, message);

            console.log(`[QueueService] Pedido ${orderNumber} criado e usuário ${nextInLine.customer_name} notificado. Queue ID: ${queueId}`);

        } catch (error) {
            console.error('[QueueService] Erro processNextInQueue:', error);
        }
    },

    /**
     * Roda via CRON: Busca links expirados, derruba eles e chama o próximo.
     */
    async handleQueueExpirations() {
        try {
            console.log(`[QueueService] Verificando expirações na fila de prioridade...`);

            const { data: expiredLeads, error } = await supabase
                .from('priority_queue')
                .select('*')
                .eq('status', 'processing')
                .lt('expires_at', new Date().toISOString());

            if (error) throw error;

            if (expiredLeads && expiredLeads.length > 0) {
                for (const lead of expiredLeads) {
                    // Update status to expired
                    await supabase
                        .from('priority_queue')
                        .update({ status: 'expired' })
                        .eq('id', lead.id);

                    // Notificar o cliente
                    const message = `⏰ Poxa, seu tempo esgotou! Como o pagamento não foi identificado, o sistema repassou a vez para o próximo da fila.`;
                    await evolutionService.sendMessage(lead.customer_phone, message);

                    console.log(`[QueueService] Lead ${lead.customer_phone} expirado. Chamando o próximo.`);

                    // Chamar próximo para o mesmo produto / campanha
                    await this.processNextInQueue(lead.campaign_id, lead.product_id);
                }
            } else {
                console.log(`[QueueService] Nenhuma expiração detectada agora.`);
            }

        } catch (error) {
            console.error('[QueueService] Erro handleQueueExpirations:', error);
        }
    }
};
