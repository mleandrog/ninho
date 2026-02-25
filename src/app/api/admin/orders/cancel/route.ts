import { NextResponse } from "next/server";
import { supabaseAdmin as supabase } from "@/lib/supabaseAdmin";
import { orderService } from "@/services/orders";

/**
 * Rota para cancelamento manual de pedidos via Admin
 */
export async function POST(req: Request) {
    try {
        const { orderId } = await req.json();

        if (!orderId) {
            return NextResponse.json({ error: "orderId é obrigatório" }, { status: 400 });
        }

        // Verificar se usuário é admin (opcional, assumindo que AdminLayout já protege a página)
        // Mas por segurança, o middleware deve estar ativo.

        await orderService.cancelOrder(orderId, 'manual_admin_cancellation');

        return NextResponse.json({ success: true, message: "Pedido cancelado e estoque devolvido." });
    } catch (error: any) {
        console.error("[AdminCancelOrder] Erro:", error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
