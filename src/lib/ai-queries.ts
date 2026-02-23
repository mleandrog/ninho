import { supabase } from './supabase';
import type { CustomerBag, CustomerOrder, CustomerStats } from '@/types/ai.types';

/**
 * Busca sacolas pendentes do cliente
 */
export async function getCustomerBags(phone: string): Promise<CustomerBag[]> {
    try {
        // Buscar sacolas abertas do cliente pelo telefone
        const { data: bags, error } = await supabase
            .from('bags')
            .select(`
        id,
        status,
        total_amount,
        created_at,
        last_interaction,
        bag_items (
          id,
          product_id,
          quantity,
          added_at,
          products (
            name,
            price
          )
        )
      `)
            .eq('customer_phone', phone)
            .eq('status', 'open')
            .order('created_at', { ascending: false });

        if (error) throw error;

        return (bags || []).map((bag: any) => ({
            id: bag.id,
            status: bag.status,
            total_amount: bag.total_amount,
            created_at: bag.created_at,
            last_interaction: bag.last_interaction,
            items: (bag.bag_items || []).map((item: any) => ({
                id: item.id,
                product_id: item.product_id,
                product_name: item.products?.name || 'Produto',
                product_price: item.products?.price || 0,
                quantity: item.quantity,
                added_at: item.added_at,
            })),
        }));
    } catch (error) {
        console.error('Erro ao buscar sacolas:', error);
        return [];
    }
}

/**
 * Busca histórico completo de pedidos do cliente
 */
export async function getCustomerOrders(phone: string): Promise<CustomerOrder[]> {
    try {
        // Nota: Ajustar conforme estrutura real da tabela de pedidos
        const { data: orders, error } = await supabase
            .from('orders')
            .select(`
        id,
        order_number,
        total_amount,
        status,
        created_at,
        order_items (
          product_name,
          quantity,
          price
        )
      `)
            .eq('customer_phone', phone)
            .order('created_at', { ascending: false })
            .limit(10);

        if (error) throw error;

        return (orders || []).map((order: any) => ({
            id: order.id,
            order_number: order.order_number,
            total_amount: order.total_amount,
            status: order.status,
            created_at: order.created_at,
            items: order.order_items || [],
        }));
    } catch (error) {
        console.error('Erro ao buscar pedidos:', error);
        return [];
    }
}

/**
 * Busca o último pedido do cliente
 */
export async function getLastOrder(phone: string): Promise<CustomerOrder | null> {
    try {
        const orders = await getCustomerOrders(phone);
        return orders.length > 0 ? orders[0] : null;
    } catch (error) {
        console.error('Erro ao buscar último pedido:', error);
        return null;
    }
}

/**
 * Busca estatísticas gerais do cliente
 */
export async function getCustomerStats(phone: string): Promise<CustomerStats> {
    try {
        const [bags, orders] = await Promise.all([
            getCustomerBags(phone),
            getCustomerOrders(phone),
        ]);

        const totalSpent = orders.reduce((sum, order) => sum + order.total_amount, 0);
        const lastOrder = orders.length > 0 ? orders[0] : null;

        return {
            total_orders: orders.length,
            total_spent: totalSpent,
            pending_bags: bags.length,
            last_order_date: lastOrder?.created_at,
        };
    } catch (error) {
        console.error('Erro ao buscar estatísticas:', error);
        return {
            total_orders: 0,
            total_spent: 0,
            pending_bags: 0,
        };
    }
}
