import { NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";

// Segurança: valida o token do cron enviado pela Vercel
export async function GET(req: Request) {
    const authHeader = req.headers.get("authorization");
    if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    try {
        const now = new Date().toISOString();

        // Busca campanhas agendadas cujo horário já chegou
        const { data: due, error } = await supabase
            .from("whatsapp_campaigns")
            .select("id, name")
            .eq("status", "scheduled")
            .lte("scheduled_at", now);

        if (error) throw error;

        if (!due || due.length === 0) {
            return NextResponse.json({ message: "No campaigns due.", triggered: 0 });
        }

        console.log(`[CRON] ${due.length} campanha(s) prontas para disparo.`);

        const baseUrl = process.env.NEXTAUTH_URL || process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000";

        // Dispara cada campanha chamando a API de start existente
        const results = await Promise.allSettled(
            due.map(async (campaign) => {
                console.log(`[CRON] Iniciando campanha: ${campaign.name} (#${campaign.id})`);

                // Marca como "running" antes de chamar o start (evita duplo-trigger)
                await supabase
                    .from("whatsapp_campaigns")
                    .update({ status: "running" })
                    .eq("id", campaign.id)
                    .eq("status", "scheduled"); // condição de race-safe

                const res = await fetch(`${baseUrl}/api/whatsapp/campaign/start`, {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json",
                        "x-internal-cron": process.env.CRON_SECRET || "",
                    },
                    body: JSON.stringify({ campaignId: campaign.id }),
                });

                const body = await res.json();
                console.log(`[CRON] Resultado campanha #${campaign.id}:`, body);
                return { id: campaign.id, name: campaign.name, ok: res.ok };
            })
        );

        const triggered = results.filter(r => r.status === "fulfilled").length;

        return NextResponse.json({
            message: `${triggered} campanha(s) disparadas com sucesso.`,
            triggered,
            results: results.map(r =>
                r.status === "fulfilled" ? r.value : { error: String(r.reason) }
            ),
        });

    } catch (err: any) {
        console.error("[CRON] Erro fatal:", err);
        return NextResponse.json({ error: err.message }, { status: 500 });
    }
}
