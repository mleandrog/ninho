import { supabaseAdmin as supabase } from '@/lib/supabaseAdmin';
import { evolutionService } from './evolution';

const APP_URL = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';

/**
 * Consolida os carrinhos de todos os clientes ao finalizar uma campanha.
 * Agrupa os itens por cliente e envia uma DM com link de revisão.
 */
export async function consolidateCartForCampaign(campaignId: string | number) {
    console.log(`[ConsolidateCart] Iniciando consolidação para campanha ${campaignId}...`);
    try {
        // 1. Buscar configurações do WhatsApp
        const { data: settings } = await supabase
            .from('whatsapp_settings')
            .select('*')
            .limit(1)
            .single();

        const CART_EXPIRATION_MINUTES = settings?.cart_expiration_minutes || 60;

        // 2. Buscar itens da fila para esta campanha
        const { data: items, error } = await supabase
            .from('priority_queue')
            .select('*, products(id, name, price)')
            .eq('campaign_id', campaignId)
            .eq('status', 'waiting');

        if (error) throw error;
        if (!items || items.length === 0) {
            console.log(`[ConsolidateCart] Nenhum item pendente para campanha ${campaignId}.`);
            return;
        }

        // 2. Agrupar por cliente (customer_phone)
        const byClient: Record<string, typeof items> = {};
        for (const item of items) {
            const phone = item.customer_phone;
            if (!byClient[phone]) byClient[phone] = [];
            byClient[phone].push(item);
        }

        console.log(`[ConsolidateCart] ${Object.keys(byClient).length} cliente(s) com carrinho para notificar.`);

        // 3. Para cada cliente, enviar 1 DM com link de revisão
        for (const [phone, clientItems] of Object.entries(byClient)) {
            const firstName = clientItems[0].customer_name?.split(' ')[0] || 'Cliente';
            const destination = clientItems[0].customer_phone_raw || phone;

            // Calcular total estimado
            const total = clientItems.reduce((acc, item) => acc + Number(item.products?.price || 0), 0);
            const totalFormatted = total.toLocaleString('pt-BR', { minimumFractionDigits: 2 });

            // Montar lista de produtos
            const productList = clientItems
                .map(item => `• *${item.products?.name || 'Produto'}* — R$ ${Number(item.products?.price || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`)
                .join('\n');

            // Link de revisão do carrinho
            const reviewLink = `${APP_URL}/checkout/campanha/${campaignId}/${encodeURIComponent(phone)}`;

            const message =
                `🎉 A campanha encerrou, ${firstName}!\n\n` +
                `Você se interessou por ${clientItems.length} produto(s):\n` +
                `${productList}\n\n` +
                `💰 *Total estimado: R$ ${totalFormatted}*\n\n` +
                `Acesse o link abaixo para revisar seu carrinho, remover o que não quiser e escolher entre *entrega imediata* ou *sacola*:\n\n` +
                `🔗 ${reviewLink}\n\n` +
                `⏳ O link estará disponível por ${CART_EXPIRATION_MINUTES} minutos.`;

            await evolutionService.sendMessage(destination, message);
            console.log(`[ConsolidateCart] DM de revisão enviada para ${phone} (${clientItems.length} itens).`);

            // Marcar itens como 'notified' para não reenviar
            const itemIds = clientItems.map(i => i.id);
            await supabase
                .from('priority_queue')
                .update({ status: 'notified' })
                .in('id', itemIds);
        }

        console.log(`[ConsolidateCart] Consolidação concluída para campanha ${campaignId}.`);
    } catch (error) {
        console.error('[ConsolidateCart] Erro:', error);
    }
}
