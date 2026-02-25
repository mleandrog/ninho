import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { asaasService } from '@/services/asaas';

export async function POST(req: NextRequest) {
    try {
        const body = await req.json();
        const { bagId, deliveryType, address, freight, customerName, phone, amount } = body;

        if (!bagId) {
            return NextResponse.json({ error: 'bagId é obrigatório' }, { status: 400 });
        }

        // 1. Buscar a sacola e os itens
        const { data: bag, error: bagError } = await supabase
            .from('bags')
            .select('*, bag_items(*, products(name, price))')
            .eq('id', bagId)
            .single();

        if (bagError || !bag) {
            return NextResponse.json({ error: 'Sacola não encontrada.' }, { status: 404 });
        }

        if (bag.status === 'closed') {
            return NextResponse.json({ error: 'Esta sacola já foi finalizada.' }, { status: 400 });
        }

        // 2. Criar pedido (Order)
        const orderNumber = `BAG${Date.now().toString().slice(-6)}${Math.floor(Math.random() * 100)}`;
        const { data: order, error: orderError } = await supabase
            .from('orders')
            .insert({
                customer_phone: phone,
                customer_name: customerName,
                status: 'pending',
                total_amount: amount,
                payment_status: 'pending',
                order_number: orderNumber,
                customer_id: bag.customer_id,
                delivery_address: deliveryType === 'delivery' ? address : { type: 'pickup' },
                payment_method: 'pix'
            })
            .select()
            .single();

        if (orderError) throw orderError;

        // 3. Criar itens do Pedido
        const orderItems = bag.bag_items.map((bi: any) => ({
            order_id: order.id,
            product_id: bi.product_id,
            quantity: bi.quantity,
            price_at_purchase: bi.products?.price || 0,
            product_name: bi.products?.name || 'Produto',
            product_price: bi.products?.price || 0,
            subtotal: Number(bi.products?.price || 0) * bi.quantity
        }));
        await supabase.from('order_items').insert(orderItems);

        // 4. Se o valor for > 0, integrar ASaaS
        let paymentData: any = { invoiceUrl: '', qrCode: '', qrCodePayload: '' };
        if (amount > 0) {
            const customerId = await asaasService.findOrCreateCustomer({
                name: customerName || 'Cliente Ninho Lar',
                phone: phone,
            });

            const dueDate = new Date(Date.now() + 15 * 60 * 1000).toISOString().split('T')[0];

            const payment = await asaasService.createPixPayment({
                customerId,
                value: amount,
                description: `Fechamento de Sacola ${bagId.slice(0, 8)} - Ninho Lar`,
                expirationDate: dueDate,
                externalReference: order.id,
            });

            paymentData = {
                invoiceUrl: payment.invoiceUrl,
                qrCode: payment.qrCode,
                qrCodePayload: payment.qrCodePayload,
            };
        } else {
            // Se for R$ 0,00, a transação termina aqui e já aprova o pedido.
            // Para isso, atualizar a sacola e o pedido
            await supabase.from('orders').update({ payment_status: 'paid', status: 'processing' }).eq('id', order.id);
            await supabase.from('bags').update({ status: 'closed' }).eq('id', bag.id);
            paymentData = { success: true };
        }

        // 5. Atualizar sacola
        await supabase
            .from('bags')
            .update({ status: 'processing', final_order_id: order.id }) // Status pendente intermediario ate o webhook do ASAAS
            .eq('id', bagId);

        return NextResponse.json({
            success: true,
            invoiceUrl: paymentData.invoiceUrl,
            qrCode: paymentData.qrCode,
            qrCodePayload: paymentData.qrCodePayload,
            total: amount,
        });

    } catch (error: any) {
        console.error('[Bag Checkout API Error]', error);
        return NextResponse.json({ error: error.message || 'Erro interno servidor' }, { status: 500 });
    }
}
