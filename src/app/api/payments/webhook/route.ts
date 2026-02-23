import { NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";
import { evolutionService } from "@/services/evolution";

export async function POST(req: Request) {
    try {
        const { searchParams } = new URL(req.url);
        const topic = searchParams.get("topic") || searchParams.get("type");
        const id = searchParams.get("id") || searchParams.get("data.id");

        if (topic === "payment") {
            // 1. Buscar detalhes do pagamento no Mercado Pago
            const response = await fetch(`https://api.mercadopago.com/v1/payments/${id}`, {
                headers: {
                    Authorization: `Bearer ${process.env.MERCADO_PAGO_ACCESS_TOKEN}`
                }
            });
            const payment = await response.json();

            if (payment.status === "approved") {
                const orderId = payment.external_reference;

                // 2. Atualizar pedido no Supabase
                const { data: order } = await supabase
                    .from("orders")
                    .update({ status: "paid" })
                    .eq("id", orderId)
                    .select()
                    .single();

                if (order) {
                    // 3. Se for um pedido do WhatsApp, limpar a fila de prioridades
                    await supabase
                        .from("priority_queue")
                        .update({ status: "paid" })
                        .eq("product_id", order.product_id)
                        .eq("customer_phone", order.customer_phone);

                    // 4. Notificar cliente via WhatsApp
                    await evolutionService.sendMessage(
                        order.customer_phone,
                        `✅ Pagamento confirmado! Seu pedido #${orderId} está sendo preparado com muito carinho e em breve sairá para entrega. 🧸`
                    );
                }
            }
        }

        return NextResponse.json({ status: "received" });
    } catch (error: any) {
        console.error("Erro no Webhook Mercado Pago:", error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
