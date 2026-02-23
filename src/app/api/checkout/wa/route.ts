import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { asaasService } from '@/services/asaas';

/**
 * POST /api/checkout/wa
 * Gera a cobrança ASAAS para o checkout vindo do WhatsApp.
 * Body: { queue_id, customer_name, cep, address, freight }
 */
export async function POST(req: NextRequest) {
    try {
        const body = await req.json();
        const { queue_id, customer_name, cep, address, freight } = body;

        if (!queue_id) {
            return NextResponse.json({ error: 'queue_id é obrigatório' }, { status: 400 });
        }

        // Buscar item da fila com o produto
        const { data: queueItem, error: queueError } = await supabase
            .from('priority_queue')
            .select('*, products(name, price)')
            .eq('id', queue_id)
            .single();

        if (queueError || !queueItem) {
            return NextResponse.json({ error: 'Item da fila não encontrado' }, { status: 404 });
        }

        if (queueItem.status !== 'processing') {
            return NextResponse.json({ error: 'Este link não está mais ativo ou já foi utilizado.' }, { status: 400 });
        }

        const product = (queueItem as any).products;
        const productPrice = Number(product?.price || 0);
        const total = productPrice + (freight || 0);

        // --- INTEGRAÇÃO COM PEDIDO EXISTENTE ---
        // 1. Tentar encontrar o pedido criado pelo QueueService
        const { data: existingOrder } = await supabase
            .from('orders')
            .select('*')
            .eq('customer_phone', queueItem.customer_phone)
            .eq('status', 'pending')
            .order('created_at', { ascending: false })
            .limit(1)
            .maybeSingle();

        if (existingOrder) {
            // Atualizar pedido com endereço e total final (incluindo frete)
            await supabase
                .from('orders')
                .update({
                    delivery_address: { address, cep },
                    delivery_cost: freight || 0,
                    total_amount: total,
                    updated_at: new Date().toISOString()
                })
                .eq('id', existingOrder.id);

            console.log(`[Checkout WA] Pedido ${existingOrder.order_number} atualizado com frete e endereço.`);
        }

        // --- ASAAS ---
        // Criar ou encontrar cliente no ASAAS
        const customerId = await asaasService.findOrCreateCustomer({
            name: customer_name || queueItem.customer_name || 'Cliente Ninho Lar',
            phone: queueItem.customer_phone,
        });

        // Data de expiração da cobrança (mesmo que a da fila)
        const dueDate = queueItem.expires_at
            ? new Date(queueItem.expires_at).toISOString().split('T')[0]
            : new Date(Date.now() + 15 * 60 * 1000).toISOString().split('T')[0];

        // Gerar cobrança PIX no ASAAS
        const payment = await asaasService.createPixPayment({
            customerId,
            value: total,
            description: `Ninho Lar – ${product?.name || 'Produto'}`,
            expirationDate: dueDate,
            externalReference: existingOrder?.id || queue_id, // Usar order.id se existir
        });

        // Salvar informações na fila
        await supabase
            .from('priority_queue')
            .update({
                customer_name: customer_name,
            })
            .eq('id', queue_id);

        return NextResponse.json({
            success: true,
            invoiceUrl: payment.invoiceUrl,
            qrCode: payment.qrCode,
            qrCodePayload: payment.qrCodePayload,
            total,
        });

    } catch (error: any) {
        console.error('[Checkout WA] Erro:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
