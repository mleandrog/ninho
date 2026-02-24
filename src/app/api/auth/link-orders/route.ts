import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

export async function POST(req: NextRequest) {
    try {
        const { phone, userId } = await req.json();

        if (!phone || !userId) {
            return NextResponse.json({ error: 'Telefone e User ID são obrigatórios' }, { status: 400 });
        }

        const cleanPhone = phone.replace(/\D/g, "");

        // 1. Vincular pedidos (orders) onde o customer_id está vazio
        const { error: ordersError } = await supabase
            .from('orders')
            .update({ customer_id: userId })
            .eq('customer_phone', cleanPhone)
            .is('customer_id', null);

        if (ordersError) {
            console.error('Erro ao vincular pedidos:', ordersError);
        }

        // 2. Vincular sacolas (bags) onde o customer_id está vazio
        const { error: bagsError } = await supabase
            .from('bags')
            .update({ customer_id: userId })
            .eq('customer_phone', cleanPhone)
            .is('customer_id', null);

        if (bagsError) {
            console.error('Erro ao vincular sacolas:', bagsError);
        }

        return NextResponse.json({
            success: true,
            message: 'Processamento de vínculo concluído'
        });
    } catch (error: any) {
        console.error('Erro no link-orders:', error);
        return NextResponse.json({ error: error.message || 'Erro interno do servidor' }, { status: 500 });
    }
}
