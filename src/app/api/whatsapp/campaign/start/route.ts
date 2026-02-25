import { NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";
import { evolutionService } from "@/services/evolution";
import { consolidateCartForCampaign } from "@/services/consolidateCart";

export async function POST(req: Request) {
    try {
        const { campaignId } = await req.json();

        console.log(`[Campaign ${campaignId}] Buscando dados da campanha...`);
        const { data: campaign, error: campaignError } = await supabase
            .from("whatsapp_campaigns")
            .select("*, categories(name)")
            .eq("id", campaignId)
            .single();

        if (campaignError || !campaign) {
            return NextResponse.json({ error: "Campanha não encontrada" }, { status: 404 });
        }

        const { data: products } = await supabase
            .from("products")
            .select("*")
            .eq("category_id", campaign.category_id)
            .eq("status", "available")
            .order("id", { ascending: true });

        if (!products || products.length === 0) {
            return NextResponse.json({ error: "Nenhum produto disponível nesta categoria" }, { status: 400 });
        }

        const { data: settings } = await supabase
            .from("whatsapp_settings")
            .select("*")
            .limit(1)
            .single();

        const { data: groups } = await supabase
            .from("whatsapp_groups")
            .select("*")
            .in("id", campaign.group_ids);

        if (!groups || groups.length === 0) {
            return NextResponse.json({ error: "Grupos de destino não encontrados" }, { status: 404 });
        }

        // Mensagens: prioriza campanha, fallback para settings globais
        const initialMessage = campaign.initial_message || null;
        const initialInterval = (campaign.initial_message_interval || 10) * 1000;
        const rulesMessage = campaign.rules_message || settings?.rules_message || null;
        const rulesInterval = (campaign.rules_interval || 10) * 1000;
        const finalMessage = campaign.final_message || settings?.final_message || null;
        const categoryInterval = (campaign.interval_seconds || settings?.default_interval_seconds || 30) * 1000;
        const keyword = settings?.keyword || "NINHO";
        const categoryName = campaign.categories?.name || "esta categoria";

        console.log(`[Campaign ${campaignId}] Iniciando disparos para ${groups.length} grupos. Produtos: ${products.length}`);

        const startExecution = async () => {
            try {
                await supabase
                    .from("whatsapp_campaigns")
                    .update({ status: "running", started_at: new Date().toISOString(), total_products: products.length })
                    .eq("id", campaignId);

                const broadcast = async (text: string) => {
                    for (const group of groups) {
                        try {
                            await evolutionService.sendMessage(group.group_jid, text);
                        } catch (err) {
                            console.error(`[Campaign ${campaignId}] Erro ao enviar para ${group.name}:`, err);
                        }
                    }
                };

                // 1. Mensagem Inicial
                if (initialMessage) {
                    console.log(`[Campaign ${campaignId}] Enviando mensagem inicial...`);
                    await broadcast(initialMessage);
                    await new Promise(r => setTimeout(r, initialInterval));
                }

                // 2. Mensagem de Regras
                if (rulesMessage) {
                    console.log(`[Campaign ${campaignId}] Enviando mensagem de regras...`);
                    await broadcast(rulesMessage);
                    await new Promise(r => setTimeout(r, rulesInterval));
                }

                // 3. Disparar produtos
                let productsSent = 0;
                for (const product of products) {
                    // Verificar se a campanha ainda está ativa antes de cada envio
                    const { data: currentStatus } = await supabase
                        .from("whatsapp_campaigns")
                        .select("status")
                        .eq("id", campaignId)
                        .single();

                    if (!currentStatus || currentStatus.status !== "running") {
                        console.log(`[Campaign ${campaignId}] Interrompida externamente. Abortando disparos após ${productsSent} produto(s) enviado(s).`);
                        break;
                    }

                    const msg = `🧸 *${product.name}*\n\n💰 R$ ${Number(product.price).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}\n\n✨ Digite *${keyword}* para reservar!`;

                    for (const group of groups) {
                        try {
                            if (product.image_url) {
                                await evolutionService.sendMedia(group.group_jid, product.image_url, msg, `${product.name}.jpg`);
                            } else {
                                await evolutionService.sendMessage(group.group_jid, msg);
                            }

                            // REGISTRAR DISPARO PARA MAPEAMENTO PRECISO NO WEBHOOK
                            await supabase.from("whatsapp_campaign_dispatches").insert({
                                campaign_id: campaignId,
                                product_id: product.id,
                                group_jid: group.group_jid,
                                sent_at: new Date().toISOString()
                            });

                        } catch (err) {
                            console.error(`[Campaign ${campaignId}] Erro ao enviar para ${group.name}:`, err);
                        }
                    }

                    productsSent++;
                    await supabase.from("whatsapp_campaigns").update({ products_sent: productsSent }).eq("id", campaignId);

                    if (productsSent < products.length) {
                        await new Promise(r => setTimeout(r, categoryInterval));
                    }
                }

                // 4. Aguardar antes da mensagem final
                await new Promise(r => setTimeout(r, categoryInterval));

                // 5. Mensagem Final
                if (finalMessage) {
                    const endMsg = finalMessage.replace(/{categoryName}/g, categoryName);
                    console.log(`[Campaign ${campaignId}] Enviando mensagem final...`);
                    await broadcast(endMsg);
                }

                // 6. Finalizar
                await supabase
                    .from("whatsapp_campaigns")
                    .update({ status: "completed", completed_at: new Date().toISOString() })
                    .eq("id", campaignId);

                console.log(`[Campaign ${campaignId}] Campanha concluída com sucesso. Consolidando carrinhos...`);

                // ENVIAR LINKS INDIVIDUAIS PARA TODOS OS PARTICIPANTES
                await consolidateCartForCampaign(campaignId);

            } catch (err) {
                console.error(`[Campaign ${campaignId}] Erro fatal:`, err);
                await supabase.from("whatsapp_campaigns").update({ status: "stopped" }).eq("id", campaignId);
            }
        };

        startExecution();

        return NextResponse.json({ success: true, message: "Disparos iniciados em segundo plano." });

    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
