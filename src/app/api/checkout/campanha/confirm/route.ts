import { NextResponse } from "next/server";
import { supabaseAdmin as supabase } from "@/lib/supabaseAdmin";
import { evolutionService } from "@/services/evolution";

export async function POST(req: Request) {
    try {
        const { campaignId, phone, selectedItemIds, deliveryType, address } = await req.json();

        if (!campaignId || !phone || !selectedItemIds?.length) {
            return NextResponse.json({ error: "Dados obrigatórios ausentes" }, { status: 400 });
        }

        console.log(`[CampaignConfirm] Confirmando pedido. Campanha ${campaignId} / Phone: ${phone}`);

        // 1. Buscar os itens selecionados da priority_queue
        const { data: items, error: fetchError } = await supabase
            .from('priority_queue')
            .select('*, products(id, name, price)')
            .in('id', selectedItemIds)
            .eq('customer_phone', phone)
            .eq('campaign_id', campaignId);

        if (fetchError) throw fetchError;
        if (!items || items.length === 0) {
            return NextResponse.json({ error: "Nenhum item encontrado" }, { status: 404 });
        }

        // 2. Calcular total
        const totalAmount = items.reduce((acc, item) => acc + Number(item.products?.price || 0), 0);

        // 3. Tentar encontrar o perfil do cliente
        const { data: profile } = await supabase
            .from('profiles')
            .select('id')
            .eq('phone', phone)
            .maybeSingle();

        // 4. Criar pedido único consolidado
        const orderNumber = `WA${Date.now().toString().slice(-6)}${Math.floor(Math.random() * 100)}`;
        const { data: order, error: orderError } = await supabase
            .from('orders')
            .insert({
                customer_phone: phone,
                customer_name: items[0].customer_name,
                status: 'pending',
                total_amount: totalAmount,
                payment_status: 'pending',
                order_number: orderNumber,
                customer_id: profile?.id || null,
                delivery_address: deliveryType === 'delivery' ? address : { type: 'sacola' },
                payment_method: deliveryType === 'delivery' ? 'delivery' : 'sacola'
            })
            .select()
            .single();

        if (orderError) throw orderError;

        // 5. Criar itens do pedido
        const orderItems = items.map(item => ({
            order_id: order.id,
            product_id: item.product_id,
            quantity: 1,
            price_at_purchase: item.products?.price || 0,
            product_name: item.products?.name || 'Produto',
            product_price: item.products?.price || 0,
            subtotal: item.products?.price || 0
        }));
        await supabase.from('order_items').insert(orderItems);

        // 6. Marcar produtos como indisponíveis
        const productIds = items.map(item => item.product_id);
        await supabase
            .from('products')
            .update({ status: 'unavailable' })
            .in('id', productIds);

        // 7. Marcar itens da fila como 'completed'
        await supabase
            .from('priority_queue')
            .update({ status: 'completed' })
            .in('id', selectedItemIds);

        // 8. Enviar DM de confirmação
        const firstName = items[0].customer_name?.split(' ')[0] || 'Cliente';
        const phoneRaw = items[0].customer_phone_raw || phone;
        const confirmMsg =
            `✅ Pedido *#${orderNumber}* confirmado com sucesso!\n\n` +
            `Obrigado, ${firstName}! Em breve nossa equipe entrará em contato para combinar os detalhes da ${deliveryType === 'delivery' ? 'entrega' : 'sua sacola'}. 💛\n\n` +
            `Qualquer dúvida, é só chamar aqui mesmo no WhatsApp.`;

        await evolutionService.sendMessage(phoneRaw, confirmMsg);

        console.log(`[CampaignConfirm] Pedido ${orderNumber} criado com ${items.length} item(ns). Produtos ${productIds.join(',')} marcados como indisponíveis.`);

        return NextResponse.json({ success: true, orderNumber, orderId: order.id });

    } catch (error: any) {
        console.error('[CampaignConfirm] Erro:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
