import { supabaseAdmin as supabase } from '@/lib/supabaseAdmin';
import { evolutionService } from './evolution';

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
};
