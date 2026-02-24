import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { evolutionService } from '@/services/evolution';

export async function POST(req: NextRequest) {
    try {
        const { phone } = await req.json();

        if (!phone) {
            return NextResponse.json({ error: 'Telefone é obrigatório' }, { status: 400 });
        }

        // Normalização do telefone (apenas números)
        const cleanPhone = phone.replace(/\D/g, "");

        // Gerar código de 6 dígitos
        const code = Math.floor(100000 + Math.random() * 900000).toString();

        // Data de expiração (10 minutos)
        const expiresAt = new Date();
        expiresAt.setMinutes(expiresAt.getMinutes() + 10);

        // Salvar no banco
        const { error } = await supabase
            .from('phone_verifications')
            .insert({
                phone: cleanPhone,
                code: code,
                expires_at: expiresAt.toISOString(),
                verified: false
            });

        if (error) {
            console.error('Erro ao salvar verificação:', error);
            throw new Error('Erro ao gerar código de verificação');
        }

        // Enviar via WhatsApp
        const message = `*Ninho Lar* 🐥\n\nSeu código de verificação é: *${code}*\n\nEste código expira em 10 minutos. Se não foi você que solicitou, ignore esta mensagem.`;

        await evolutionService.sendMessage(cleanPhone, message);

        return NextResponse.json({ success: true, message: 'Código enviado com sucesso' });
    } catch (error: any) {
        console.error('Erro no send-otp:', error);
        return NextResponse.json({ error: error.message || 'Erro interno do servidor' }, { status: 500 });
    }
}
