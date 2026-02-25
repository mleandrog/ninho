import { supabaseAdmin as supabase } from '@/lib/supabaseAdmin';

export const orderService = {
    /**
     * Cancela um pedido e devolve os produtos ao estoque.
     * Também cancela os itens correspondentes na fila de prioridade (priority_queue).
     */
    async cancelOrder(orderId: string, reason: string = 'manual_cancellation') {
        console.log(`[OrderService] Cancelando pedido ${orderId}. Motivo: ${reason}`);

        try {
            // 1. Buscar os itens do pedido para saber quais produtos devolver
            const { data: orderItems, error: itemsError } = await supabase
                .from('order_items')
                .select('product_id, quantity')
                .eq('order_id', orderId);

            if (itemsError) throw itemsError;

            // 2. Buscar dados do pedido para encontrar o telefone (usado para limpar a fila)
            const { data: order, error: orderFetchError } = await supabase
                .from('orders')
                .select('customer_phone')
                .eq('id', orderId)
                .single();

            if (orderFetchError) throw orderFetchError;

            // 3. Atualizar status do pedido para 'canceled'
            const { error: updateOrderError } = await supabase
                .from('orders')
                .update({
                    status: 'canceled',
                    payment_status: 'cancelled',
                    updated_at: new Date().toISOString()
                })
                .eq('id', orderId);

            if (updateOrderError) throw updateOrderError;

            // 4. Devolver produtos ao estoque
            if (orderItems && orderItems.length > 0) {
                const productIds = orderItems.map(item => item.product_id);

                const { error: productError } = await supabase
                    .from('products')
                    .update({
                        status: 'available',
                        available_in_store: true
                    })
                    .in('id', productIds);

                if (productError) throw productError;
                console.log(`[OrderService] ${productIds.length} produtos devolvidos ao estoque.`);
            }

            // 5. Marcar itens na priority_queue como 'cancelled'
            // Isso evita que o cron de automação tente processar esses itens novamente
            if (order.customer_phone) {
                const { error: queueError } = await supabase
                    .from('priority_queue')
                    .update({ status: 'cancelled' })
                    .eq('customer_phone', order.customer_phone)
                    .in('status', ['processing', 'notified', 'completed']);

                if (queueError) {
                    console.warn('[OrderService] Aviso ao limpar priority_queue:', queueError.message);
                }
            }

            return { success: true };
        } catch (error: any) {
            console.error(`[OrderService] Erro ao cancelar pedido ${orderId}:`, error);
            throw error;
        }
    }
};
