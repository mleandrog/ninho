import { NextResponse } from "next/server";
import { supabaseAdmin as supabase } from "@/lib/supabaseAdmin";

export async function POST(req: Request) {
    try {
        const { campaignId } = await req.json();

        if (!campaignId) {
            return NextResponse.json({ error: "ID da campanha não fornecido" }, { status: 400 });
        }

        console.log(`[Campaign ${campaignId}] Interrompendo campanha via STOP...`);

        const { error } = await supabase
            .from("whatsapp_campaigns")
            .update({
                status: "completed",
                completed_at: new Date().toISOString()
            })
            .eq("id", campaignId);

        if (error) {
            console.error(`[Campaign ${campaignId}] Erro ao parar campanha:`, error);
            return NextResponse.json({ error: "Erro ao atualizar status da campanha" }, { status: 500 });
        }

        return NextResponse.json({ success: true, message: "Campanha interrompida com sucesso. Os disparos em fila serão abortados." });

    } catch (error: any) {
        console.error("Erro ao parar campanha:", error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
