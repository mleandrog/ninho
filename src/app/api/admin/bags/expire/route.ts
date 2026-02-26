import { NextResponse } from "next/server";
import { bagService } from "@/services/bags";

/**
 * Rota para expiração manual de sacolas via Admin
 */
export async function POST(req: Request) {
    try {
        const { bagId } = await req.json();

        if (!bagId) {
            return NextResponse.json({ error: "bagId é obrigatório" }, { status: 400 });
        }

        await bagService.expireBag(bagId, 'manual_admin_expiration');

        return NextResponse.json({ success: true, message: "Sacola expirada e estoque devolvido com sucesso." });
    } catch (error: any) {
        console.error("[AdminExpireBag] Erro:", error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
