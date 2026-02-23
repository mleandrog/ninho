import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { queueService } from '@/services/queue';

/**
 * Webhook de notificações do ASAAS.
 * Configure no painel ASAAS > Integrações > Webhooks:
 *   URL: https://ninhoelar.com.br/api/webhooks/asaas
 *   Eventos: PAYMENT_RECEIVED, PAYMENT_CONFIRMED
 */
export async function POST(req: NextRequest) {
    try {
        const body = await req.json();
        const { event, payment } = body;

        // Apenas processar eventos de pagamento confirmado
        if (event !== 'PAYMENT_RECEIVED' && event !== 'PAYMENT_CONFIRMED') {
            return NextResponse.json({ status: 'ignored' });
        }

        const externalRef = payment?.externalReference; // Pode ser queue_id ou order_id
        if (!externalRef) {
            return NextResponse.json({ status: 'no_reference' });
        }

        // 1. Tentar identificar se é um Pedido (orders)
        const { data: order } = await supabase
            .from('orders')
            .select('*')
            .eq('id', externalRef)
            .maybeSingle();

        if (order) {
            // Atualizar status do pedido
            await supabase
                .from('orders')
                .update({
                    status: 'paid',
                    payment_status: 'paid',
                    updated_at: new Date().toISOString()
                })
                .eq('id', order.id);

            console.log(`[ASAAS Webhook] Pedido ${order.order_number} marcado como PAGO.`);

            // Opcional: Se for um pedido vindo do WhatsApp, encontrar o item da fila
            const { data: queueItem } = await supabase
                .from('priority_queue')
                .select('*')
                .eq('customer_phone', order.customer_phone)
                .eq('status', 'processing')
                .maybeSingle();

            if (queueItem) {
                await supabase.from('priority_queue').update({ status: 'paid' }).eq('id', queueItem.id);
                // Marcar produto como vendido
                if (queueItem.product_id) {
                    await supabase
                        .from('products')
                        .update({ status: 'sold', available_in_store: false })
                        .eq('id', queueItem.product_id);
                }
            }
        } else {
            // 2. Fallback: Tentar identificar como item da fila diretamente (fluxo antigo)
            const { data: queueItem, error: queueError } = await supabase
                .from('priority_queue')
                .update({ status: 'paid' })
                .eq('id', externalRef)
                .select()
                .single();

            if (!queueError && queueItem) {
                console.log(`[ASAAS Webhook] Item da fila ${externalRef} marcado como PAGO (fluxo antigo).`);
                if (queueItem.product_id) {
                    await supabase
                        .from('products')
                        .update({ status: 'sold', available_in_store: false })
                        .eq('id', queueItem.product_id);
                }
            } else {
                console.error('[ASAAS Webhook] Referência não encontrada:', externalRef);
                return NextResponse.json({ status: 'not_found' }, { status: 404 });
            }
        }

        return NextResponse.json({ status: 'success' });
    } catch (error: any) {
        console.error('[ASAAS Webhook] Erro:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
