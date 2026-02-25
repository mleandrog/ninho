import { NextResponse } from "next/server";
import { automationService } from "@/services/automation";

// Proteção por chave secreta para evitar execuções maliciosas
const CRON_SECRET = process.env.CRON_SECRET;

export async function GET(req: Request) {
    const { searchParams } = new URL(req.url);
    const secret = searchParams.get("secret");

    if (CRON_SECRET && secret !== CRON_SECRET) {
        return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
    }

    try {
        // Executar automações
        await automationService.processQueueExpirations();
        await automationService.processOrderExpirations();
        await automationService.processBagAlerts();

        return NextResponse.json({
            status: "success",
            timestamp: new Date().toISOString(),
            message: "Automações executadas com sucesso."
        });
    } catch (error: any) {
        console.error("Erro no Cron de Automação:", error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
