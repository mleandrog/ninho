import { NextResponse } from "next/server";
import { MercadoPagoConfig, Preference } from "mercadopago";

export async function POST(req: Request) {
    try {
        const { items, orderId, customerEmail } = await req.json();

        const accessToken = process.env.MERCADO_PAGO_ACCESS_TOKEN;
        if (!accessToken) {
            return NextResponse.json(
                { error: "Token do Mercado Pago não configurado." },
                { status: 500 }
            );
        }

        const client = new MercadoPagoConfig({ accessToken });
        const preference = new Preference(client);

        const body = {
            items: items.map((item: any) => ({
                id: item.id.toString(),
                title: item.name,
                unit_price: Number(item.price),
                quantity: Number(item.quantity),
                currency_id: "BRL",
            })),
            back_urls: {
                success: `${process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"}/perfil?status=success`,
                failure: `${process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"}/perfil?status=failure`,
                pending: `${process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"}/perfil?status=pending`,
            },
            auto_return: "approved",
            external_reference: orderId,
            metadata: {
                order_id: orderId,
            },
        };

        const response = await preference.create({ body });

        return NextResponse.json({ init_point: response.init_point });
    } catch (error: any) {
        console.error("Erro MP:", error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
