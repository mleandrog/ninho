"use client";

import { useCart } from "@/hooks/useCart";

export function OrderSummary({ shippingFee }: { shippingFee: number }) {
    const { items, totalPrice } = useCart();
    const subtotal = totalPrice();
    const total = subtotal + shippingFee;

    return (
        <div className="bg-white p-8 rounded-[2.5rem] shadow-premium border border-white/20 space-y-6">
            <h2 className="text-2xl font-black text-muted-text">Resumo do Pedido</h2>

            <div className="space-y-4 max-h-[300px] overflow-y-auto pr-2 custom-scrollbar">
                {items.map((item) => (
                    <div key={item.id} className="flex justify-between items-center gap-4">
                        <div className="flex-1">
                            <p className="font-bold text-muted-text line-clamp-1">{item.name}</p>
                            <p className="text-sm text-gray-400 font-medium">Qtd: {item.quantity}</p>
                        </div>
                        <span className="font-black text-primary">
                            R$ {(item.price * item.quantity).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
                        </span>
                    </div>
                ))}
            </div>

            <div className="space-y-3 pt-6 border-t border-gray-50">
                <div className="flex justify-between text-gray-500 font-bold">
                    <span>Subtotal</span>
                    <span>R$ {subtotal.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}</span>
                </div>
                <div className="flex justify-between text-gray-500 font-bold">
                    <span>Frete</span>
                    <span>
                        {shippingFee === 0 ? "Grátis" : `R$ ${shippingFee.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}`}
                    </span>
                </div>
                <div className="flex justify-between items-center pt-2">
                    <span className="text-xl font-black text-muted-text">Total</span>
                    <span className="text-3xl font-black text-primary">
                        R$ {total.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
                    </span>
                </div>
            </div>
        </div>
    );
}
