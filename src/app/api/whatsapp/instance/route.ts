
import { NextRequest, NextResponse } from 'next/server';

const EVOLUTION_API_URL = (process.env.EVOLUTION_API_URL || '').replace(/\/$/, ''); // Remove trailing slash
const EVOLUTION_API_KEY = process.env.EVOLUTION_API_KEY || '';
const INSTANCE_NAME = process.env.EVOLUTION_INSTANCE_NAME || '';

const getBaseUrl = (url: string) => {
    if (!url) return '';
    if (url.startsWith('http://') || url.startsWith('https://')) return url;
    return `https://${url}`;
};

const FINAL_API_URL = getBaseUrl(EVOLUTION_API_URL);

export async function GET(req: NextRequest) {
    const { searchParams } = new URL(req.url);
    const action = searchParams.get('action');

    try {
        if (!EVOLUTION_API_URL || !EVOLUTION_API_KEY || !INSTANCE_NAME) {
            console.error("Missing Evolution API credentials", {
                url: !!EVOLUTION_API_URL,
                key: !!EVOLUTION_API_KEY,
                instance: !!INSTANCE_NAME
            });
            return NextResponse.json({ error: 'Evolution API credentials missing' }, { status: 500 });
        }

        if (action === 'status') {
            const response = await fetch(`${FINAL_API_URL}/instance/connectionState/${INSTANCE_NAME}`, {
                headers: { 'apikey': EVOLUTION_API_KEY }
            });
            const data = await response.json();
            return NextResponse.json(data);
        }

        if (action === 'connect') {
            console.log(`GET /api/instance?action=connect para instância: ${INSTANCE_NAME}`);
            console.log(`URL de destino: ${FINAL_API_URL}/instance/connect/${INSTANCE_NAME}`);

            const response = await fetch(`${FINAL_API_URL}/instance/connect/${INSTANCE_NAME}`, {
                headers: { 'apikey': EVOLUTION_API_KEY },
                cache: 'no-store'
            });

            if (!response.ok) {
                const errorText = await response.text();
                console.error(`Erro na Evolution API (${response.status}):`, errorText);
                return NextResponse.json({
                    error: `Erro na Evolution API: ${response.status}`,
                    details: errorText
                }, { status: response.status });
            }

            const data = await response.json();
            console.log("Sucesso ao conectar instância. QR Code recebido.");
            return NextResponse.json(data);
        }

        return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
    } catch (error: any) {
        console.error("Error in GET /api/instance:", error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

export async function POST(req: NextRequest) {
    const { searchParams } = new URL(req.url);
    const action = searchParams.get('action');

    try {
        if (action === 'logout') {
            console.log(`POST /api/instance?action=logout for instance: ${INSTANCE_NAME}`);
            const response = await fetch(`${FINAL_API_URL}/instance/logout/${INSTANCE_NAME}`, {
                method: 'DELETE',
                headers: { 'apikey': EVOLUTION_API_KEY }
            });
            const data = await response.json();
            console.log("Evolution API logout response:", data);
            return NextResponse.json(data);
        }

        // POST: Conectar instância (Gerar QR) - This block was added
        if (action === 'connect') { // Assuming 'connect' action can also be a POST
            const instanceName = process.env.EVOLUTION_INSTANCE_NAME;
            const apiKey = process.env.EVOLUTION_API_KEY;
            // Use FINAL_API_URL from outer scope or normalize again if needed locally (but outer scope is better)

            console.log("Tentando conectar instância via POST:", instanceName);

            const response = await fetch(`${FINAL_API_URL}/instance/connect/${instanceName}`, {
                method: 'GET', // Evolution uses GET for connect generally, but verify doc
                headers: {
                    'apikey': apiKey || ''
                }
            });

            const data = await response.json();
            console.log("Resposta Evolution Connect (POST):", data);
            return NextResponse.json(data);
        }

        // POST: Registrar Webhook
        if (action === 'webhook') {
            const body = await req.json();
            const { url } = body;

            console.log(`Configuring webhook for instance ${INSTANCE_NAME}: ${url}`);

            // Corrigido para a v2 da Evolution API (/webhook/set)
            const response = await fetch(`${FINAL_API_URL}/webhook/set/${INSTANCE_NAME}`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'apikey': EVOLUTION_API_KEY
                },
                body: JSON.stringify({
                    webhook: {
                        url: url,
                        enabled: true,
                        webhookByEvents: false,
                        events: [
                            "MESSAGES_UPSERT",
                            "CONNECTION_UPDATE",
                            "MESSAGES_UPDATE",
                            "SEND_MESSAGE"
                        ]
                    }
                })
            });

            const data = await response.json();
            console.log("Evolution API webhook response:", JSON.stringify(data, null, 2));

            if (!response.ok) {
                console.error(`Erro ao configurar Webhook (${response.status})`);
                return NextResponse.json({
                    error: `Erro na Evolution API: ${response.status}`,
                    details: data
                }, { status: response.status });
            }

            // Return checking format to match what frontend expects
            return NextResponse.json({
                ...data,
                status: "SUCCESS", // Force success state if we got a 200 OK
                webhook: data.webhook || data // Fallback just in case
            });
        }

        return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
    } catch (error: any) {
        console.error("Error in POST /api/instance:", error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
