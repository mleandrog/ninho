import { supabaseAdmin as supabase } from '@/lib/supabaseAdmin';

export const bagService = {
    /**
     * Expira uma sacola e devolve os produtos ao estoque.
     */
    async expireBag(bagId: string, reason: string = 'manual_admin_expiration') {
        console.log(`[BagService] Expirando sacola ${bagId}. Motivo: ${reason}`);

        try {
            // 1. Buscar os itens da sacola para saber quais produtos devolver
            const { data: bagItems, error: itemsError } = await supabase
                .from('bag_items')
                .select('product_id, quantity')
                .eq('bag_id', bagId);

            if (itemsError) throw itemsError;

            // 2. Buscar dados da sacola para encontrar o telefone (usado para limpar a fila)
            const { data: bag, error: bagFetchError } = await supabase
                .from('bags')
                .select('customer_phone')
                .eq('id', bagId)
                .single();

            if (bagFetchError) throw bagFetchError;

            // 3. Atualizar status da sacola para 'expired'
            const { error: updateBagError } = await supabase
                .from('bags')
                .update({
                    status: 'expired'
                })
                .eq('id', bagId);

            if (updateBagError) throw updateBagError;

            // 4. Devolver produtos ao estoque
            if (bagItems && bagItems.length > 0) {
                const productIds = bagItems.map(item => item.product_id);

                // No sistema do Ninho Lar, marcar como 'available' e 'available_in_store'
                const { error: productError } = await supabase
                    .from('products')
                    .update({
                        status: 'available',
                        available_in_store: true
                    })
                    .in('id', productIds);

                if (productError) throw productError;
                console.log(`[BagService] ${productIds.length} produtos da sacola devolvidos ao estoque.`);
            }

            // 5. Opcional: Limpar itens correspondentes na priority_queue
            if (bag.customer_phone) {
                const { error: queueError } = await supabase
                    .from('priority_queue')
                    .update({ status: 'expired' })
                    .eq('customer_phone', bag.customer_phone)
                    .in('status', ['processing', 'notified', 'completed']);

                if (queueError) {
                    console.warn('[BagService] Aviso ao limpar priority_queue:', queueError.message);
                }
            }

            return { success: true };
        } catch (error: any) {
            console.error(`[BagService] Erro ao expirar sacola ${bagId}:`, error);
            throw error;
        }
    }
};
