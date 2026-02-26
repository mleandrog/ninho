import { NextResponse } from "next/server";

export async function GET() {
    const key = process.env.ASAAS_API_KEY || '';
    return NextResponse.json({
        hasAsaasKey: !!key,
        keyLength: key.length,
        keyStart: key.substring(0, 5),
        keyEnd: key.slice(-4),
        nodeEnv: process.env.NODE_ENV,
        allKeys: Object.keys(process.env).filter(k => k.includes('ASAAS'))
    });
}
