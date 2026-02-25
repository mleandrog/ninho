import { supabaseAdmin as supabase } from '@/lib/supabaseAdmin';
import { evolutionService } from './evolution';

const APP_URL = process.env.NEXT_PUBLIC_APP_URL || 'https://ninhoelar.com.br';

export const queueService = {
    /**
     * Registra o interesse de um cliente em um produto durante a campanha.
     * NÃO cria pedido — apenas acumula no carrinho (priority_queue).
     * Envia uma DM simples de confirmação.
     */
    async addToQueue(campaignId: string, productId: number, phone: string, phoneRaw: string, customerName: string, keyword: string) {
        console.log('[Queue] Registrando interesse:', { campaignId, productId, phone, phoneRaw, customerName });
        try {
            // Verificar se o cliente já demonstrou interesse neste produto nesta campanha
            const { data: existing } = await supabase
                .from('priority_queue')
                .select('id')
                .eq('campaign_id', campaignId)
                .eq('product_id', productId)
                .eq('customer_phone', phone)
                .single();

            if (existing) {
                console.log('[Queue] Interesse duplicado ignorado:', { phone, productId });
                return { success: false, message: 'Interesse já registrado.' };
            }

            // Buscar nome do produto para a mensagem de confirmação
            const { data: product } = await supabase
                .from('products')
                .select('name')
                .eq('id', productId)
                .single();

            // Inserir interesse no carrinho da campanha
            const { error: insertError } = await supabase
                .from('priority_queue')
                .insert({
                    campaign_id: campaignId,
                    product_id: productId,
                    customer_phone: phone,
                    customer_phone_raw: phoneRaw,
                    customer_name: customerName,
                    keyword_used: keyword,
                    status: 'waiting'
                });

            if (insertError) throw insertError;

            console.log('[Queue] Interesse registrado. Enviando confirmação para:', phoneRaw);

            // Enviar DM de confirmação simples
            const productName = product?.name || 'Produto';
            const confirmMsg =
                `🧸 Anotei, ${customerName}! O produto *${productName}* foi guardado no seu carrinho da campanha.\n\n` +
                `Quando a campanha encerrar, você vai receber um link para revisar tudo e escolher a forma de entrega. Aguarda! 😊`;

            const destination = phoneRaw || phone;
            await evolutionService.sendMessage(destination, confirmMsg);

            return { success: true };
        } catch (error) {
            console.error('[QueueService] Erro addToQueue:', error);
            throw error;
        }
    },

    /**
     * Libera um item da fila (expirado, removido pelo cliente, ou cancelado).
     * 1. Marca o item com o novo status
     * 2. Procura o próximo interessado no mesmo produto/campanha
     * 3. Se encontrar → notifica com link de checkout
     * 4. Se NÃO encontrar → reativa o produto (status: 'available')
     */
    async releaseItem(queueItemId: string, reason: 'expired' | 'skipped' | 'cancelled') {
        console.log(`[Queue] Liberando item ${queueItemId} (motivo: ${reason})`);
        try {
            // 1. Buscar o item atual para obter product_id e campaign_id
            const { data: item, error: fetchError } = await supabase
                .from('priority_queue')
                .select('*, products(name)')
                .eq('id', queueItemId)
                .single();

            if (fetchError || !item) {
                console.error('[Queue] Item não encontrado:', queueItemId);
                return { success: false };
            }

            // 2. Marcar o item com o novo status
            await supabase
                .from('priority_queue')
                .update({ status: reason })
                .eq('id', queueItemId);

            console.log(`[Queue] Item ${queueItemId} marcado como '${reason}'.`);

            // 3. Procurar o próximo interessado (status 'waiting') no mesmo produto/campanha
            const { data: nextInLine } = await supabase
                .from('priority_queue')
                .select('*')
                .eq('campaign_id', item.campaign_id)
                .eq('product_id', item.product_id)
                .eq('status', 'waiting')
                .order('created_at', { ascending: true })
                .limit(1)
                .maybeSingle();

            if (nextInLine) {
                // Notificar o próximo da fila
                console.log(`[Queue] Próximo da fila encontrado: ${nextInLine.customer_name} (${nextInLine.customer_phone})`);

                await supabase
                    .from('priority_queue')
                    .update({ status: 'notified' })
                    .eq('id', nextInLine.id);

                const productName = (item.products as any)?.name || 'Produto';
                const firstName = nextInLine.customer_name?.split(' ')[0] || 'Cliente';
                const reviewLink = `${APP_URL}/checkout/campanha/${item.campaign_id}/${encodeURIComponent(nextInLine.customer_phone)}`;

                const msg =
                    `🎉 Boa notícia, ${firstName}! O produto *${productName}* ficou disponível para você!\\n\\n` +
                    `Acesse o link abaixo para revisar e finalizar seu pedido:\\n\\n` +
                    `🔗 ${reviewLink}\\n\\n` +
                    `⏳ Corra! Outros clientes também podem estar na fila.`;

                const destination = nextInLine.customer_phone_raw || nextInLine.customer_phone;
                await evolutionService.sendMessage(destination, msg);

                console.log(`[Queue] Próximo notificado: ${nextInLine.customer_name}`);
                return { success: true, action: 'next_notified', nextCustomer: nextInLine.customer_name };
            } else {
                // Ninguém mais na fila — reativar o produto
                console.log(`[Queue] Ninguém na fila para produto ${item.product_id}. Reativando produto.`);

                await supabase
                    .from('products')
                    .update({ status: 'available' })
                    .eq('id', item.product_id);

                console.log(`[Queue] Produto ${item.product_id} reativado como 'available'.`);
                return { success: true, action: 'product_reactivated', productId: item.product_id };
            }
        } catch (error) {
            console.error('[QueueService] Erro releaseItem:', error);
            throw error;
        }
    },
};
