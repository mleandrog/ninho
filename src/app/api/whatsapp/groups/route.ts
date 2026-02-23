
import { NextRequest, NextResponse } from 'next/server';

const EVOLUTION_API_URL = (process.env.EVOLUTION_API_URL || '').replace(/\/$/, '');
const EVOLUTION_API_KEY = process.env.EVOLUTION_API_KEY || '';
const INSTANCE_NAME = process.env.EVOLUTION_INSTANCE_NAME || '';

const getBaseUrl = (url: string) => {
    if (!url) return '';
    if (url.startsWith('http://') || url.startsWith('https://')) return url;
    return `https://${url}`;
};

const FINAL_API_URL = getBaseUrl(EVOLUTION_API_URL);

export async function GET(req: NextRequest) {
    try {
        console.log("Fetching groups for instance:", INSTANCE_NAME);
        console.log("Using URL:", `${FINAL_API_URL}/group/fetchAllGroups/${INSTANCE_NAME}`);

        if (!FINAL_API_URL || !EVOLUTION_API_KEY || !INSTANCE_NAME) {
            console.error("Missing credentials in groups route");
            return NextResponse.json({ error: 'Evolution API credentials missing' }, { status: 500 });
        }

        const response = await fetch(`${FINAL_API_URL}/group/fetchAllGroups/${INSTANCE_NAME}?getParticipants=false`, {
            headers: { 'apikey': EVOLUTION_API_KEY }
        });

        console.log("Evolution API groups response status:", response.status);

        if (!response.ok) {
            const errorText = await response.text();
            console.error("Evolution API groups error response:", errorText);
            return NextResponse.json({ error: 'Erro na API Evolution', details: errorText }, { status: response.status });
        }

        const data = await response.json();
        console.log("Groups found:", data?.length || 0);
        return NextResponse.json(data);
    } catch (error: any) {
        console.error("Error in GET /api/whatsapp/groups:", error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
