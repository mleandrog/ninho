import { NextResponse } from "next/server";
import { supabaseAdmin as supabase } from "@/lib/supabaseAdmin";
import { evolutionService } from "@/services/evolution";

export async function POST(req: Request) {
    try {
        const { orderId } = await req.json();
        if (!orderId) return NextResponse.json({ error: "orderId obrigatório" }, { status: 400 });

        const { data: order, error } = await supabase
            .from('orders')
            .select('id, order_number, customer_name, customer_phone, asaas_invoice_url, pix_payload, pix_qr_code, total_amount')
            .eq('id', orderId)
            .single();

        if (error || !order) return NextResponse.json({ error: "Pedido não encontrado" }, { status: 404 });

        const { data: profile } = await supabase
            .from('profiles')
            .select('phone')
            .eq('phone', order.customer_phone)
            .maybeSingle();

        const destination = profile?.phone || order.customer_phone;
        if (!destination) return NextResponse.json({ error: "Telefone não encontrado" }, { status: 400 });

        const firstName = order.customer_name?.split(' ')[0] || 'Cliente';

        let msg = `💛 Olá, ${firstName}! Aqui está o link do seu pedido *#${order.order_number}*:\n\n`;

        if (order.pix_payload) {
            msg += `💠 *Pagamento via PIX (Copia e Cola):*\n\`${order.pix_payload}\`\n\n`;
        }
        if (order.asaas_invoice_url) {
            msg += `🔗 *Ou acesse a fatura completa:*\n${order.asaas_invoice_url}\n\n`;
        }
        msg += `⚠️ Realize o pagamento para garantir sua reserva!`;

        await evolutionService.sendMessage(destination, msg);

        return NextResponse.json({ success: true, message: "Fatura reenviada com sucesso!" });
    } catch (e: any) {
        return NextResponse.json({ error: e.message }, { status: 500 });
    }
}
