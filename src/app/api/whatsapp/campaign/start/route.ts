import { NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";
import { evolutionService } from "@/services/evolution";

export async function POST(req: Request) {
    try {
        const { campaignId } = await req.json();

        // 1. Buscar dados da campanha
        console.log(`[Campaign ${campaignId}] Buscando dados da campanha...`);
        const { data: campaign, error: campaignError } = await supabase
            .from("whatsapp_campaigns")
            .select("*, categories(name)")
            .eq("id", campaignId)
            .single();

        if (campaignError || !campaign) {
            console.error(`[Campaign ${campaignId}] Erro ao buscar campanha:`, campaignError);
            return NextResponse.json({ error: "Campanha não encontrada" }, { status: 404 });
        }

        // 2. Buscar produtos da categoria
        console.log(`[Campaign ${campaignId}] Buscando produtos da categoria ${campaign.category_id}...`);
        const { data: products } = await supabase
            .from("products")
            .select("*")
            .eq("category_id", campaign.category_id)
            .eq("status", "available")
            .order('id', { ascending: true });

        if (!products || products.length === 0) {
            console.error(`[Campaign ${campaignId}] Nenhum produto disponível.`);
            return NextResponse.json({ error: "Nenhum produto disponível nesta categoria" }, { status: 400 });
        }

        console.log(`[Campaign ${campaignId}] Encontrados ${products.length} produtos.`);

        // 3. Buscar configurações e grupos
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
            console.error(`[Campaign ${campaignId}] Nenhum grupo de destino encontrado.`);
            return NextResponse.json({ error: "Grupos de destino não encontrados" }, { status: 404 });
        }

        console.log(`[Campaign ${campaignId}] Iniciando disparos para ${groups.length} grupos.`);

        // 4. Atualizar status da campanha e retornar
        const startExecution = async () => {
            try {
                // 4. Atualizar status inicial
                await supabase
                    .from("whatsapp_campaigns")
                    .update({
                        status: "running",
                        started_at: new Date().toISOString(),
                        total_products: products.length
                    })
                    .eq("id", campaignId);

                // 5. Disparar mensagem de regras primeiro
                if (settings?.rules_message) {
                    console.log(`[Campaign ${campaignId}] Enviando mensagem de regras...`);
                    for (const group of groups) {
                        try {
                            await evolutionService.sendMessage(group.group_jid, settings.rules_message);
                            console.log(`[Campaign ${campaignId}] Regras enviadas para ${group.name}`);
                        } catch (err) {
                            console.error(`[Campaign ${campaignId}] Erro ao enviar regras para ${group.name}:`, err);
                        }
                    }
                    // Aguardar 5 segundos após as regras
                    await new Promise(resolve => setTimeout(resolve, 5000));
                }

                // 6. Disparar produtos com intervalo
                let productsSent = 0;
                for (const product of products) {
                    const message = `🧸 *${product.name}*\n\n💰 R$ ${Number(product.price).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}\n\n✨ Digite *${settings?.keyword || 'NINHO'}* para reservar!`;

                    console.log(`[Campaign ${campaignId}] Enviando produto ${product.id} (${product.name})...`);

                    for (const group of groups) {
                        try {
                            if (product.image_url) {
                                const isBase64 = product.image_url.startsWith('data:');
                                console.log(`[Campaign ${campaignId}] Enviando mídia para ${group.name} (Base64: ${isBase64})`);

                                await evolutionService.sendMedia(
                                    group.group_jid,
                                    product.image_url,
                                    message,
                                    `${product.name}.jpg`
                                );
                            } else {
                                await evolutionService.sendMessage(group.group_jid, message);
                            }
                            console.log(`[Campaign ${campaignId}] Sucesso ao enviar para ${group.name}`);
                        } catch (err) {
                            console.error(`[Campaign ${campaignId}] Erro ao enviar para ${group.name}:`, err);
                        }
                    }

                    productsSent++;

                    // Atualizar progresso
                    console.log(`[Campaign ${campaignId}] Atualizando progresso: ${productsSent}/${products.length}`);
                    await supabase
                        .from("whatsapp_campaigns")
                        .update({ products_sent: productsSent })
                        .eq("id", campaignId);

                    // Aguardar intervalo antes do próximo produto
                    if (productsSent < products.length) {
                        console.log(`[Campaign ${campaignId}] Aguardando ${campaign.interval_seconds} segundos...`);
                        await new Promise(resolve => setTimeout(resolve, campaign.interval_seconds * 1000));
                    }
                }

                // 7. Aguardar intervalo final mesmo após o último produto
                console.log(`[Campaign ${campaignId}] Último produto enviado. Aguardando intervalo final de ${campaign.interval_seconds} segundos...`);
                await new Promise(resolve => setTimeout(resolve, campaign.interval_seconds * 1000));

                // 8. Enviar mensagem de finalização em todos os grupos
                const categoryName = campaign.categories?.name || "esta categoria";
                const endMessageTemplate = settings?.final_message || `🏁 *Campanha Finalizada!* \n\nAgradecemos a todos que participaram dos lançamentos de *{categoryName}*. \n\nFiquem ligados para as próximas novidades! 🧸✨`;
                const endMessage = endMessageTemplate.replace(/{categoryName}/g, categoryName);

                console.log(`[Campaign ${campaignId}] Enviando mensagem de finalização para os grupos...`);
                for (const group of groups) {
                    try {
                        await evolutionService.sendMessage(group.group_jid, endMessage);
                    } catch (err) {
                        console.error(`[Campaign ${campaignId}] Erro ao enviar encerramento para ${group.name}:`, err);
                    }
                }

                // 9. Finalizar campanha no banco
                console.log(`[Campaign ${campaignId}] Finalizando campanha...`);
                await supabase
                    .from("whatsapp_campaigns")
                    .update({
                        status: "completed",
                        completed_at: new Date().toISOString()
                    })
                    .eq("id", campaignId);

                console.log(`[Campaign ${campaignId}] Campanha concluída com sucesso.`);
            } catch (err) {
                console.error(`[Campaign ${campaignId}] Erro fatal na execução:`, err);
                await supabase
                    .from("whatsapp_campaigns")
                    .update({ status: "error" }) // Opcional: adicionar coluna de erro se desejar
                    .eq("id", campaignId);
            }
        };

        // Inicia em background e não aguarda
        startExecution();

        return NextResponse.json({
            success: true,
            message: "Disparos iniciados em segundo plano. Você pode acompanhar o progresso na dashboard."
        });

    } catch (error: any) {
        console.error("Erro ao preparar campanha:", error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
