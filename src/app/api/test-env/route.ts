import { NextResponse } from "next/server";

export async function GET() {
    return NextResponse.json({
        hasAsaasKey: !!process.env.ASAAS_API_KEY,
        keyPrefix: process.env.ASAAS_API_KEY ? process.env.ASAAS_API_KEY.substring(0, 10) : 'MISSING',
        nodeEnv: process.env.NODE_ENV,
        allKeys: Object.keys(process.env).filter(k => k.includes('ASAAS'))
    });
}
