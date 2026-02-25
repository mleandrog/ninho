import { NextResponse } from "next/server";
import { supabaseAdmin as supabase } from "@/lib/supabaseAdmin";
import { evolutionService } from "@/services/evolution";

export async function POST(req: Request) {
    try {
        const { campaignId, phone, customerName, cpfCnpj, selectedItemIds, deliveryType, address, shippingFee } = await req.json();

        if (!campaignId || !phone || !selectedItemIds?.length) {
            return NextResponse.json({ error: "Dados obrigatórios ausentes" }, { status: 400 });
        }

        console.log(`[CampaignConfirm] Confirmando pedido. Campanha ${campaignId} / Phone: ${phone}`);

        // 1. Buscar configurações do WhatsApp
        const { data: settings } = await supabase
            .from('whatsapp_settings')
            .select('*')
            .limit(1)
            .single();

        // 2. Buscar os itens selecionados da priority_queue
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

        // 3. Calcular total
        const itemsTotal = items.reduce((acc, item) => acc + Number(item.products?.price || 0), 0);
        const totalAmount = itemsTotal + (Number(shippingFee) || 0);

        // 4. Tentar encontrar o perfil do cliente
        const { data: profile } = await supabase
            .from('profiles')
            .select('id')
            .eq('phone', phone)
            .maybeSingle();

        // 5. Criar pedido único consolidado
        const orderNumber = `WA${Date.now().toString().slice(-6)}${Math.floor(Math.random() * 100)}`;
        const { data: order, error: orderError } = await supabase
            .from('orders')
            .insert({
                customer_phone: phone,
                customer_name: customerName || items[0].customer_name,
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

        // 6. Criar itens do pedido
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

        // 7. Marcar produtos como indisponíveis
        const productIds = items.map(item => item.product_id);
        await supabase
            .from('products')
            .update({ status: 'unavailable' })
            .in('id', productIds);

        // 8. Marcar itens da fila como 'completed'
        await supabase
            .from('priority_queue')
            .update({ status: 'completed' })
            .in('id', selectedItemIds);

        // --- INTEGRAÇÃO ASAAS ---
        let paymentData: any = {};
        let asaasError: string | null = null;
        try {
            const { asaasService } = await import('@/services/asaas');

            const asaasCustomerId = await asaasService.findOrCreateCustomer({
                name: customerName || items[0].customer_name || 'Cliente Ninho Lar',
                phone: phone,
                cpfCnpj: cpfCnpj,
            });

            const expirationMinutes = settings?.payment_expiration_minutes || 60;
            const dueDate = new Date(Date.now() + expirationMinutes * 60 * 1000).toISOString().split('T')[0];
            const description = `Pedido #${orderNumber} - Campanha Ninho Lar`;

            if (req.headers.get('x-payment-method') === 'pix') {
                const pix = await asaasService.createPixPayment({
                    customerId: asaasCustomerId,
                    value: totalAmount,
                    description,
                    expirationDate: dueDate,
                    externalReference: order.id
                });
                paymentData = { type: 'pix', ...pix };
            } else {
                const link = await asaasService.createPaymentLink({
                    customerId: asaasCustomerId,
                    value: totalAmount,
                    description,
                    expirationDate: dueDate,
                    externalReference: order.id
                });
                paymentData = { type: 'link', ...link };
            }

            if (paymentData.chargeId) {
                await supabase
                    .from('orders')
                    .update({ payment_method: paymentData.type, payment_status: 'pending' })
                    .eq('id', order.id);
            }
        } catch (err: any) {
            asaasError = err?.message || 'Erro desconhecido no Asaas';
            console.error('[CampaignConfirm] ⚠️ ERRO ASAAS — pagamento não gerado:', asaasError);
        }

        // 9. Enviar DM de confirmação via WhatsApp
        const firstName = items[0].customer_name?.split(' ')[0] || 'Cliente';
        const phoneRaw = items[0].customer_phone_raw || phone;

        // Fallback URL caso o Asaas falhe
        const checkoutUrl = `${process.env.NEXT_PUBLIC_APP_URL || 'https://ninhoelar.com.br'}/checkout/campanha/${campaignId}/${encodeURIComponent(phone)}`;

        let confirmMsg = `✅ Seu pedido *#${orderNumber}* foi reservado com sucesso!\n\n` +
            `Obrigado, ${firstName}! Para garantir sua reserva e concluir a compra, realize o pagamento agora. 💛\n\n`;

        if (paymentData.type === 'pix' && paymentData.invoiceUrl) {
            confirmMsg += `💠 *Pagamento via PIX:*\nAcesse o link abaixo para escanear o QR Code ou copiar o código:\n${paymentData.invoiceUrl}\n\n`;
            confirmMsg += `⚠️ *ATENÇÃO:* Pague agora para garantir o produto! O código expira em breve.\n\n`;
        } else if (paymentData.invoiceUrl) {
            confirmMsg += `🔗 *Link de Pagamento Seguro (Cartão/Boleto):*\n${paymentData.invoiceUrl}\n\n`;
        } else {
            // Fallback: Asaas falhou — manda link do checkout
            confirmMsg += `🔗 *Acesse o link abaixo para finalizar o pagamento:*\n${checkoutUrl}\n\n`;
            if (asaasError) {
                console.warn(`[CampaignConfirm] Fallback ativado. Erro Asaas: ${asaasError}`);
            }
        }

        confirmMsg += `Se precisar de ajuda, é só chamar aqui mesmo!`;

        await evolutionService.sendMessage(phoneRaw, confirmMsg);

        console.log(`[CampaignConfirm] Pedido ${orderNumber} criado. Asaas: ${paymentData.type || 'FALHOU - ' + asaasError}`);

        return NextResponse.json({
            success: true,
            orderNumber,
            orderId: order.id,
            payment: paymentData,
            ...(asaasError && { asaasWarning: 'Pagamento não gerado automaticamente. Verifique as credenciais do Asaas.' })
        });

    } catch (error: any) {
        console.error('[CampaignConfirm] Erro:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
