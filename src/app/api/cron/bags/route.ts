import { NextResponse } from "next/server";
import { supabaseAdmin as supabase } from "@/lib/supabaseAdmin";
import { evolutionService } from "@/services/evolution";

// O servidor Linux do cliente (CRONTAB) deve chamar essa rota 1x por dia, contendo o header Authorization Bearer <CRON_SECRET>
export async function GET(req: Request) {
    const authHeader = req.headers.get("authorization");
    if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    try {
        console.log("[CRON BAGS] Iniciando rotina de verificação de sacolas...");
        const now = new Date();

        // Buscar as configurações para saber prazos de aviso
        const { data: settings } = await supabase.from('whatsapp_settings').select('bag_reminder_days').single();
        // Exemplo: "15, 10, 7, 3"
        const reminderDaysText = (settings?.bag_reminder_days || "15, 10, 7, 3").split(',').map((d: string) => parseInt(d.trim())).filter((d: number) => !isNaN(d));

        // 1. Procurar todas as sacolas ATIVAS
        const { data: bags, error } = await supabase
            .from('bags')
            .select(`
                id, expires_at, customer_id, customer_phone,
                profiles(full_name, phone),
                bag_items(product_id, quantity)
            `)
            .eq('status', 'open');

        if (error) throw error;

        let expiredCount = 0;
        let remindedCount = 0;

        for (const bag of bags || []) {
            const expDate = new Date(bag.expires_at);
            const diffTime = expDate.getTime() - now.getTime();
            const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)); // Diferença em dias completos

            const phone = (bag.profiles as any)?.phone || bag.customer_phone;
            const customerName = (bag.profiles as any)?.full_name || "Cliente";

            if (diffDays <= 0) {
                // EXPIROU
                console.log(`[CRON BAGS] Sacola ${bag.id} expirada. Cancelando e devolvendo estoque.`);

                // 1. Marcar como expiada
                await supabase.from('bags').update({ status: 'expired' }).eq('id', bag.id);

                // 2. Devolver produtos ao estoque
                // Como não controlamos o 'estoque' real por unidade no DB original e sim o status availability vs category,
                // vamos reabilitar os produtos:
                const productIds = bag.bag_items.map((bi: any) => bi.product_id);
                if (productIds.length > 0) {
                    await supabase.from('products')
                        .update({ status: 'available', available_in_store: true })
                        .in('id', productIds);
                }

                expiredCount++;

                // 3. Notificar o cliente
                if (phone) {
                    const msg = `Olá *${customerName}*! Sua sacola da Ninho Lar expirou o prazo de 30 dias. 🛍️\n\nNós devolvemos os itens para o estoque para que outros clientes possam aproveitá-los. Se desejar, fique à vontade para acessar nosso catálogo novamente e criar uma nova sacola!`;
                    await evolutionService.sendMessage(phone, msg);
                }
            } else if (reminderDaysText.includes(diffDays)) {
                // NOTIFICAR LEMBRETE
                if (phone) {
                    console.log(`[CRON BAGS] Sacola ${bag.id} prestes a expirar (${diffDays} dias). Aviando cliente.`);
                    const msg = `⚠️ *Aviso de Sacola* ⚠️\n\nOlá *${customerName}*! Faltam apenas *${diffDays} dias* para a sua sacola expirar.\n\nAcesse seu perfil no site da Ninho Lar para realizar o Fechamento:\n\n🔗 https://ninhoelar.com.br/perfil\n\nGaranta seus produtos antes que retornem ao estoque!`;
                    await evolutionService.sendMessage(phone, msg);
                    remindedCount++;
                }
            }
        }

        return NextResponse.json({
            message: "Rotina concluída com sucesso.",
            expired: expiredCount,
            reminded: remindedCount
        });

    } catch (error: any) {
        console.error("[CRON BAGS] Erro na engine:", error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
