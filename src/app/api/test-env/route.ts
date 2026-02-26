import { NextResponse } from "next/server";
import { asaasService } from "@/services/asaas";

export const dynamic = "force-dynamic";

export async function GET() {
    const { key, url } = await asaasService.getCredentials();
    return NextResponse.json({
        hasAsaasKey: !!key,
        keyLength: key.length,
        keyStart: key.substring(0, 5),
        keyEnd: key.slice(-4),
        nodeEnv: process.env.NODE_ENV,
        usingUrl: url,
        allKeys: Object.keys(process.env).filter(k => k.includes('ASAAS'))
    });
}
