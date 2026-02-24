import { NextRequest, NextResponse } from 'next/server';
import axios from 'axios';
import { supabase } from '@/lib/supabase';

/**
 * Webhook para receber mensagens do Evolution API
 * 
 * Configuração no Evolution:
 * - URL: https://seu-dominio.com/api/webhooks/whatsapp
 * - Events: messages.upsert
 */
export async function POST(request: NextRequest) {
    try {
        const payload = await request.json();

        // LOG DE DEBUG - Para entender o que está chegando no Evolution v2
        await supabase.from('debug_logs').insert({
            event_type: payload.event,
            payload: payload
        });

        // Validar origem (opcional, mas recomendado)
        const apiKey = request.headers.get('x-api-key');
        if (apiKey !== process.env.EVOLUTION_API_KEY) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        // Extrair dados da mensagem
        const { event, data } = payload;

        // Processar apenas mensagens recebidas (não enviadas)
        if (event !== 'messages.upsert' || data?.key?.fromMe) {
            return NextResponse.json({ status: 'ignored' });
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
        const hasKeyword = lowerMessage.includes(keyword) || lowerMessage.includes('quero') || lowerMessage.includes('eu quero');

        if (hasKeyword) {
            try {
                if (phone.endsWith('@g.us')) {
                    const { data: groupData } = await supabase
                        .from('whatsapp_groups')
                        .select('id')
                        .eq('group_jid', phone)
                        .single();

                    if (groupData) {
                        const { data: campaignData } = await supabase
                            .from('whatsapp_campaigns')
                            .select('*')
                            .contains('group_ids', [groupData.id])
                            .order('created_at', { ascending: false })
                            .limit(1)
                            .single();

                        if (campaignData) {
                            let productName = "Referência Direta (Não citou produto)";
                            let productId: number | null = null;
                            const quotedMsg = data.message?.extendedTextMessage?.contextInfo?.quotedMessage || data.message?.imageMessage?.contextInfo?.quotedMessage;
                            const quotedCaption = quotedMsg?.imageMessage?.caption || quotedMsg?.conversation || quotedMsg?.extendedTextMessage?.text || "";

                            if (quotedCaption) {
                                const lines = quotedCaption.split('\n');
                                if (lines[0] && lines[0].includes('🧸 *')) {
                                    productName = lines[0].replace('🧸 *', '').replace('*', '').trim();

                                    // Buscar ID do Produto para a fila de prioridade
                                    const { data: prodData } = await supabase
                                        .from('products')
                                        .select('id')
                                        .ilike('name', productName)
                                        .maybeSingle();

                                    if (prodData) {
                                        productId = prodData.id;
                                    }
                                }
                            }

                            const leadPhone = participant.replace('@s.whatsapp.net', '');
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
                                    const { queueService } = await import('@/services/queue');
                                    await queueService.addToQueue(
                                        campaignData.id,
                                        productId,
                                        leadPhone,      // identificação
                                        participant,    // JID completo (@s.whatsapp.net ou @lid)
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
