import { NextResponse } from "next/server";
import { supabaseAdmin as supabase } from "@/lib/supabaseAdmin";
import { consolidateCartForCampaign } from "@/services/consolidateCart";

export async function POST(req: Request) {
    try {
        const { campaignId } = await req.json();

        if (!campaignId) {
            return NextResponse.json({ error: "ID da campanha não fornecido" }, { status: 400 });
        }

        console.log(`[Campaign ${campaignId}] Interrompendo campanha e consolidando carrinhos...`);

        // 1. Buscar a mensagem final e grupos antes de encerrar
        const { data: campaign } = await supabase
            .from("whatsapp_campaigns")
            .select("*, whatsapp_groups(*), categories(name)")
            .eq("id", campaignId)
            .single();

        if (campaign && campaign.status === 'running') {
            const { data: settings } = await supabase
                .from("whatsapp_settings")
                .select("final_message")
                .limit(1)
                .single();

            const finalMsg = campaign.final_message || settings?.final_message;
            const groups = campaign.whatsapp_groups || [];
            const categoryName = campaign.categories?.name || "esta categoria";

            if (finalMsg && groups.length > 0) {
                console.log(`[Campaign ${campaignId}] Enviando mensagem final imediata na interrupção...`);
                const endMsg = finalMsg.replace(/{categoryName}/g, categoryName);

                for (const group of groups) {
                    try {
                        await evolutionService.sendMessage(group.group_jid, endMsg);
                    } catch (err) {
                        console.error(`[Campaign ${campaignId}] Erro ao enviar mensagem final para ${group.group_jid}:`, err);
                    }
                }
            }
        }

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

        // Consolidar carrinhos — enviar DM de revisão para cada cliente
        await consolidateCartForCampaign(campaignId);

        return NextResponse.json({
            success: true,
            message: "Campanha encerrada. DMs de revisão de carrinho enviadas aos clientes."
        });

    } catch (error: any) {
        console.error("Erro ao parar campanha:", error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
