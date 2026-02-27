import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin as supabase } from '@/lib/supabaseAdmin';
import { evolutionService } from '@/services/evolution';
import { bagService } from '@/services/bags';

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

        console.log(`[ASAAS Webhook] Evento recebido: ${event} para ref: ${payment?.externalReference}`);

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
            const { error: updateError } = await supabase
                .from('orders')
                .update({
                    status: 'paid',
                    payment_status: 'paid',
                    updated_at: new Date().toISOString()
                })
                .eq('id', order.id);

            if (updateError) throw updateError;

            console.log(`[ASAAS Webhook] Pedido ${order.order_number} marcado como PAGO.`);

            // Fechar sacola correspondente, se houver
            await supabase
                .from('bags')
                .update({ status: 'closed' })
                .eq('final_order_id', order.id);

            // Encontrar itens na fila para esta campanha/cliente
            // O status pode ser 'processing' (fluxo sacola/geral) ou 'completed' (fluxo direto campanha)
            const { data: queueItems } = await supabase
                .from('priority_queue')
                .select('*')
                .eq('customer_phone', order.customer_phone)
                .in('status', ['processing', 'completed', 'notified']);

            if (queueItems && queueItems.length > 0) {
                for (const item of queueItems) {
                    await supabase.from('priority_queue').update({ status: 'paid' }).eq('id', item.id);

                    // Marcar produto como vendido
                    if (item.product_id) {
                        await supabase
                            .from('products')
                            .update({ status: 'sold', available_in_store: false })
                            .eq('id', item.product_id);
                    }
                }
            }

            // 2. Notificar cliente via WhatsApp
            try {
                const isSacola = order.payment_method === 'sacola' || (order.delivery_address as any)?.type === 'sacola';
                const firstName = order.customer_name?.split(' ')[0] || 'Cliente';

                if (isSacola) {
                    // MIGRAR PARA SACOLA
                    const { data: items } = await supabase
                        .from('order_items')
                        .select('*')
                        .eq('order_id', order.id);

                    if (items && items.length > 0) {
                        const bag = await bagService.findOrCreateOpenBag(order.customer_phone, order.customer_id);
                        for (const item of items) {
                            await bagService.addItemToBag(bag.id, item.product_id, item.quantity);
                        }

                        // Calcular dias para expirar
                        const expiresAt = new Date(bag.expires_at);
                        const today = new Date();
                        const diffTime = Math.abs(expiresAt.getTime() - today.getTime());
                        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
                        const dateFormatted = expiresAt.toLocaleDateString('pt-BR');

                        const bagUrl = `https://ninhoelar.com.br/checkout/sacola/${bag.id}`;

                        await evolutionService.sendMessage(
                            order.customer_phone,
                            `✅ *Pagamento aprovado!* Sua sacola foi criada/atualizada com sucesso. 🧸\n\n` +
                            `Obrigado, ${firstName}! Você tem até *${diffDays} dias* (vence em ${dateFormatted}) para acumular mais produtos e solicitar o envio único. 💛\n\n` +
                            `🔗 *Link para fechar sacola e enviar:*\n${bagUrl}`
                        );
                    }
                } else {
                    // MENSAGEM PADRÃO DELIVERY
                    await evolutionService.sendMessage(
                        order.customer_phone,
                        `✅ *Pagamento confirmado!*\n\nObrigado, ${firstName}! Seu pedido *#${order.order_number}* foi confirmado e já estamos preparando tudo com muito carinho. 💛\n\nEm breve você receberá atualizações sobre a entrega!`
                    );
                }
            } catch (notifyErr) {
                console.error('[ASAAS Webhook] Erro ao enviar notificação WhatsApp:', notifyErr);
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
