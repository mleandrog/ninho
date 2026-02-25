import { NextResponse } from "next/server";

export async function POST(req: Request) {
    try {
        const { id } = await req.json();

        if (!id) {
            return NextResponse.json({ error: "ID obrigatório" }, { status: 400 });
        }

        // Usar releaseItem para: marcar skipped + notificar próximo OU reativar produto
        const { queueService } = await import('@/services/queue');
        const result = await queueService.releaseItem(id, 'skipped');

        return NextResponse.json({ ...result });
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
