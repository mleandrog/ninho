import { NextRequest, NextResponse } from 'next/server';
import axios from 'axios';
import { supabaseAdmin as supabase } from '@/lib/supabaseAdmin';

/**
 * Webhook para receber mensagens do Evolution API
 * 
 * Configuração no Evolution:
 * - URL: https://ninhoelar.com.br/api/whatsapp/webhook
 * - Events: MESSAGES_UPSERT, CONNECTION_UPDATE, etc.
 */
export async function POST(request: NextRequest) {
    // LOG IMEDIATO - Pra saber se o sinal sequer chegou
    const requestId = Math.random().toString(36).substring(7);
    await supabase.from('debug_logs').insert({
        event_type: 'WEBHOOK_HIT',
        payload: { requestId, method: request.method, timestamp: new Date().toISOString() }
    });

    let payload: any = null;
    let headers: any = {};

    try {
        headers = Object.fromEntries(request.headers.entries());

        // Tentar ler o corpo da requisição de forma segura
        const bodyText = await request.text();
        try {
            payload = JSON.parse(bodyText);
        } catch (e) {
            console.error('[Webhook] Falha ao parsear JSON:', bodyText.substring(0, 100));
            // Logar a falha no banco mesmo assim
            await supabase.from('debug_logs').insert({
                event_type: 'JSON_PARSE_ERROR',
                payload: { raw_body_start: bodyText.substring(0, 500), error: (e as Error).message }
            });
            return NextResponse.json({ status: 'error', reason: 'Invalid JSON' });
        }

        // LOG DE DEBUG - Agora com o payload parseado com sucesso
        await supabase.from('debug_logs').insert({
            event_type: payload.event || 'unknown',
            payload: {
                ...payload,
                _debug_headers: headers
            }
        });

        console.log('[Webhook] Payload recebido:', JSON.stringify({
            instance: payload.instance,
            event: payload.event,
            remoteJid: payload.data?.key?.remoteJid,
            participant: payload.data?.key?.participant
        }, null, 2));

        // Extrair dados da mensagem
        const { event, data } = payload;
        if (!event) {
            return NextResponse.json({ status: 'ignored', reason: 'No event in payload' });
        }

        // Normalizar evento
        const eventType = event.toUpperCase().replace(/\./g, '_');

        // Validar origem (LOGAR MAS NÃO BLOQUEAR POR ENQUANTO)
        const incomingApiKey = request.headers.get('x-api-key') || payload.apikey;
        if (incomingApiKey !== process.env.EVOLUTION_API_KEY) {
            console.warn(`[Webhook] API Key mismatch: ${incomingApiKey}`);
        }

        // Processar apenas mensagens recebidas (MESSAGES_UPSERT)
        if (eventType !== 'MESSAGES_UPSERT') {
            return NextResponse.json({ status: 'ignored', reason: 'Not a message event' });
        }

        // Se a mensagem for 'fromMe' (do próprio bot), permitimos se tiver a palavra-chave (útil para teste)
        // Mas o ideal para produção é filtrar, então vamos logar isso
        if (data?.key?.fromMe) {
            console.log('[Webhook] Mensagem do próprio bot detectada');
        }

        // Extração robusta da mensagem (Evolution v2)
        const message =
            data.message?.conversation ||
            data.message?.extendedTextMessage?.text ||
            data.message?.imageMessage?.caption ||
            "";

        const phone = data.key?.remoteJid;
        const participant = data.key?.participant || phone;

        if (!message || !phone) {
            return NextResponse.json({ status: 'ignored' });
        }

        // --- LÓGICA DE CAPTURA DE LEADS (INTERESSADOS) ---
        // 1. Buscar Palavra-Chave nas configurações
        const { data: settings } = await supabase.from('whatsapp_settings').select('keyword').limit(1).single();
        const keyword = (settings?.keyword || 'ninho').toLowerCase();

        const lowerMessage = message.trim().toLowerCase();
        // GATILHO ESTRITO: A mensagem deve ser EXATAMENTE a palavra-chave
        const hasKeyword = lowerMessage === keyword;

        if (hasKeyword) {
            console.log(`[Lead Capture] Palavra-chave estrita detectada: "${message}"`);
            try {
                if (phone.endsWith('@g.us')) {
                    // 1. Identificar o grupo
                    const { data: groupData } = await supabase
                        .from('whatsapp_groups')
                        .select('id')
                        .eq('group_jid', phone)
                        .maybeSingle();

                    if (groupData) {
                        // 2. Identificar a campanha ativa para este grupo
                        const { data: campaignData } = await supabase
                            .from('whatsapp_campaigns')
                            .select('*')
                            .contains('group_ids', [groupData.id])
                            .eq('status', 'running')
                            .order('started_at', { ascending: false })
                            .limit(1)
                            .maybeSingle();

                        if (campaignData) {
                            let productName = "Referência Direta (Não citou produto)";
                            let productId: number | null = null;

                            // 3. Tentar pegar por citação de mensagem
                            const quotedMsg = data.message?.extendedTextMessage?.contextInfo?.quotedMessage ||
                                data.message?.imageMessage?.contextInfo?.quotedMessage ||
                                data.message?.videoMessage?.contextInfo?.quotedMessage;

                            const quotedCaption = quotedMsg?.imageMessage?.caption ||
                                quotedMsg?.conversation ||
                                quotedMsg?.extendedTextMessage?.text ||
                                quotedMsg?.videoMessage?.caption || "";

                            if (quotedCaption) {
                                const lines = quotedCaption.split('\n');
                                if (lines[0] && lines[0].includes('🧸 *')) {
                                    productName = lines[0].replace('🧸 *', '').replace('*', '').trim();

                                    const { data: prodData } = await supabase
                                        .from('products')
                                        .select('id')
                                        .ilike('name', productName)
                                        .maybeSingle();

                                    if (prodData) productId = prodData.id;
                                }
                            }

                            // 4. SMART DETECTION: Se não citou, pegar o ÚLTIMO produto enviado na campanha
                            if (!productId && campaignData.products_sent > 0) {
                                console.log(`[Lead Capture] Cliente não citou produto. Buscando último enviado na campanha ${campaignData.id}...`);

                                // Buscar os produtos da categoria da campanha
                                const { data: categoryProducts } = await supabase
                                    .from('products')
                                    .select('id, name')
                                    .eq('category_id', campaignData.category_id)
                                    .eq('status', 'available')
                                    .order('id', { ascending: true });

                                if (categoryProducts && categoryProducts.length > 0) {
                                    // O produto enviado por último é o de índice (products_sent - 1)
                                    const lastProductIndex = Math.max(0, campaignData.products_sent - 1);
                                    const detectedProduct = categoryProducts[lastProductIndex];

                                    if (detectedProduct) {
                                        productId = Number(detectedProduct.id);
                                        productName = detectedProduct.name;
                                        console.log(`[Lead Capture] Produto detectado via heurística de campanha: ${productName}`);
                                    }
                                }
                            }

                            const jid = data.key?.participantAlt || data.key?.participant || phone;
                            const leadPhone = jid.split('@')[0];
                            const contactName = data.pushName || leadPhone;

                            // Verificar se o lead já participou deste produto nesta campanha
                            const { data: existingLead } = await supabase
                                .from('whatsapp_campaign_leads')
                                .select('id')
                                .eq('campaign_id', campaignData.id)
                                .eq('phone', leadPhone)
                                .eq('product_name', productName)
                                .maybeSingle();

                            if (!existingLead) {
                                await supabase.from('whatsapp_campaign_leads').insert({
                                    campaign_id: campaignData.id,
                                    group_id: groupData.id,
                                    phone: leadPhone,
                                    contact_name: contactName,
                                    message_text: message,
                                    product_name: productName
                                });
                                console.log(`[Lead Capture] Novo lead salvo: ${contactName} / Produto: ${productName}`);

                                // Se o produto foi identificado de forma exata, engatilha a fila
                                if (productId) {
                                    console.log('[Webhook] Tentando adicionar à fila:', {
                                        campaignId: campaignData.id,
                                        productId,
                                        leadPhone,
                                        contactName
                                    });

                                    const { queueService } = await import('@/services/queue');
                                    await queueService.addToQueue(
                                        campaignData.id,
                                        productId,
                                        leadPhone,
                                        contactName,
                                        message
                                    );
                                }
                            } else {
                                console.log(`[Lead Capture] Lead duplicado ignorado: ${contactName} para o produto ${productName}`);
                            }
                        }
                    }
                }
            } catch (leadError) {
                console.error("[Lead Capture] Erro ao salvar lead:", leadError);
            }
        }
        // --- FIM DA LÓGICA DE CAPTURA ---

        const cleanPhone = phone.replace('@s.whatsapp.net', '').replace('@g.us', '');

        // Chamar API de chat internamente
        const chatResponse = await fetch(`${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/api/ai/chat`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ phone: cleanPhone, message }),
        });

        const chatData = await chatResponse.json();

        // Enviar resposta via Evolution API
        if (chatData.reply) {
            await axios.post(
                `${process.env.EVOLUTION_API_URL}/message/sendText/${process.env.EVOLUTION_INSTANCE_NAME}`,
                {
                    number: cleanPhone,
                    text: chatData.reply,
                },
                {
                    headers: {
                        'Content-Type': 'application/json',
                        apikey: process.env.EVOLUTION_API_KEY,
                    },
                }
            );
        }

        return NextResponse.json({ status: 'success' });
    } catch (error: any) {
        console.error('Erro no webhook WhatsApp:', error);
        return NextResponse.json(
            { error: 'Erro ao processar webhook', details: error.message },
            { status: 500 }
        );
    }
}
