import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

export async function POST(req: NextRequest) {
    try {
        const { phone, code } = await req.json();

        if (!phone || !code) {
            return NextResponse.json({ error: 'Telefone e código são obrigatórios' }, { status: 400 });
        }

        const cleanPhone = phone.replace(/\D/g, "");

        // Buscar o código mais recente não expirado para este telefone
        const { data: verification, error } = await supabase
            .from('phone_verifications')
            .select('*')
            .eq('phone', cleanPhone)
            .eq('code', code)
            .eq('verified', false)
            .gt('expires_at', new Date().toISOString())
            .order('created_at', { ascending: false })
            .limit(1)
            .single();

        if (error || !verification) {
            return NextResponse.json({ error: 'Código inválido ou expirado' }, { status: 400 });
        }

        // Marcar como verificado
        const { error: updateError } = await supabase
            .from('phone_verifications')
            .update({ verified: true })
            .eq('id', verification.id);

        if (updateError) throw updateError;

        return NextResponse.json({ success: true, message: 'Telefone verificado com sucesso' });
    } catch (error: any) {
        console.error('Erro no verify-otp:', error);
        return NextResponse.json({ error: error.message || 'Erro interno do servidor' }, { status: 500 });
    }
}
