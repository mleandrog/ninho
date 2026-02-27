"use client";

import { useEffect, useState, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { Button } from "@/components/ui/Button";
import { MapPin, Truck, ShoppingBag, CreditCard, Clock, Calculator } from "lucide-react";
import { deliveryService } from "@/services/delivery";
import { toast } from "react-hot-toast";

function CheckoutWhatsAppContent() {
    const searchParams = useSearchParams();
    const router = useRouter();
    const orderId = searchParams.get("orderId");
    const [loading, setLoading] = useState(true);
    const [order, setOrder] = useState<any>(null);
    const [shippingMethod, setShippingMethod] = useState<"delivery" | "pickup">("delivery");
    const [address, setAddress] = useState("");
    const [shippingFee, setShippingFee] = useState(0);
    const [calculating, setCalculating] = useState(false);
    const [finishing, setFinishing] = useState(false);
    const [freeShippingMin, setFreeShippingMin] = useState(0);

    useEffect(() => {
        if (orderId) fetchOrder();
        fetchSettings();
    }, [orderId]);

    const fetchSettings = async () => {
        const { data } = await supabase.from('whatsapp_settings').select('free_shipping_min_order').limit(1).single();
        if (data?.free_shipping_min_order) setFreeShippingMin(Number(data.free_shipping_min_order));
    };

    const fetchOrder = async () => {
        setLoading(true);
        try {
            const { data, error } = await supabase
                .from("orders")
                .select("*, products(*)")
                .eq("id", orderId)
                .single();

            if (error) throw error;
            setOrder(data);
        } catch (error: any) {
            toast.error("Pedido não encontrado ou expirado.");
        } finally {
            setLoading(false);
        }
    };

    const handleCalculateShipping = async () => {
        if (!address) return toast.error("Insira o endereço para calcular.");
        setCalculating(true);
        try {
            const coords = await deliveryService.getCoordsFromAddress(address);
            if (coords) {
                const fee = await deliveryService.calculateFee(coords.lat, coords.lng);

                if (freeShippingMin > 0 && order.products.price >= freeShippingMin) {
                    setShippingFee(0);
                    toast.success("Parabéns! Você ganhou Frete Grátis.");
                } else {
                    setShippingFee(fee);
                    toast.success(`Frete calculado: R$ ${fee.toFixed(2)}`);
                }
            } else {
                toast.error("Endereço não encontrado.");
            }
        } catch (error) {
            toast.error("Erro ao calcular frete.");
        } finally {
            setCalculating(false);
        }
    };

    const handleFinish = async () => {
        setFinishing(true);
        try {
            const total = (order.products.price + (shippingMethod === "delivery" ? shippingFee : 0));

            const mpResponse = await fetch("/api/checkout/mercado-pago", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    items: [
                        {
                            id: order.product_id,
                            name: order.products.name,
                            price: order.products.price,
                            quantity: 1
                        },
                        ...(shippingMethod === "delivery" && shippingFee > 0 ? [{
                            id: "shipping",
                            name: "Taxa de Entrega",
                            price: shippingFee,
                            quantity: 1
                        }] : [])
                    ],
                    orderId: order.id,
                    customerEmail: "whatsapp-customer@ninho.com",
                }),
            });

            const mpData = await mpResponse.json();
            if (mpData.init_point) {
                window.location.href = mpData.init_point;
            } else {
                throw new Error("Erro ao gerar link de pagamento.");
            }
        } catch (error: any) {
            toast.error(error.message);
        } finally {
            setFinishing(false);
        }
    };

    if (loading) return <div className="min-h-screen flex items-center justify-center bg-soft">Carregando pedido...</div>;
    if (!order) return <div className="min-h-screen flex items-center justify-center bg-soft">Pedido não encontrado.</div>;

    return (
        <div className="min-h-screen bg-soft p-6 flex items-center justify-center font-sans">
            <div className="max-w-md w-full bg-white rounded-[3rem] shadow-premium p-10 space-y-8 border-4 border-white relative overflow-hidden">
                <div className="absolute top-0 right-0 w-32 h-32 bg-primary/5 rounded-full -translate-y-1/2 translate-x-1/2" />

                <header className="text-center space-y-2">
                    <div className="w-20 h-20 bg-primary/10 rounded-3xl mx-auto flex items-center justify-center text-primary mb-4">
                        <ShoppingBag size={40} />
                    </div>
                    <h1 className="text-3xl font-black text-muted-text lowercase tracking-tighter">quase lá!</h1>
                    <p className="text-gray-400 font-bold uppercase tracking-widest text-[10px]">Confirme seu pedido do whatsapp</p>
                </header>

                <div className="bg-soft/50 p-6 rounded-3xl space-y-2">
                    <div className="flex justify-between items-center text-sm font-bold text-gray-400">
                        <span>ITEM</span>
                        <span>VALOR</span>
                    </div>
                    <div className="flex justify-between items-center">
                        <span className="font-black text-muted-text text-lg">{order.products.name}</span>
                        <span className="font-black text-primary text-lg">R$ {order.products.price.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
                    </div>
                </div>

                <div className="space-y-4">
                    <p className="font-black text-muted-text text-sm flex items-center gap-2">
                        <Truck size={18} className="text-secondary" /> Como deseja receber?
                    </p>
                    <div className="grid grid-cols-2 gap-4">
                        <button
                            onClick={() => setShippingMethod("delivery")}
                            className={`p-4 rounded-2xl border-2 transition-all flex flex-col items-center gap-1 ${shippingMethod === "delivery" ? "border-primary bg-primary/5 text-primary" : "border-gray-50 text-gray-300"}`}
                        >
                            <Truck size={24} />
                            <span className="text-[10px] font-black uppercase tracking-widest">Entrega</span>
                        </button>
                        <button
                            onClick={() => setShippingMethod("pickup")}
                            className={`p-4 rounded-2xl border-2 transition-all flex flex-col items-center gap-1 ${shippingMethod === "pickup" ? "border-secondary bg-secondary/5 text-secondary" : "border-gray-50 text-gray-300"}`}
                        >
                            <MapPin size={24} />
                            <span className="text-[10px] font-black uppercase tracking-widest">Retirada</span>
                        </button>
                    </div>

                    {shippingMethod === "delivery" && (
                        <div className="space-y-3 animate-in fade-in slide-in-from-top-2">
                            <div className="relative">
                                <MapPin className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-300" size={18} />
                                <input
                                    type="text"
                                    placeholder="Seu endereço completo..."
                                    className="w-full pl-12 pr-4 py-4 bg-soft rounded-2xl border-none text-sm font-bold focus:ring-2 focus:ring-primary/20"
                                    value={address}
                                    onChange={(e) => setAddress(e.target.value)}
                                />
                            </div>
                            <Button
                                variant="outline"
                                className="w-full h-12 rounded-xl border-dashed border-2 gap-2 text-xs"
                                onClick={handleCalculateShipping}
                                isLoading={calculating}
                            >
                                <Calculator size={14} /> Calcular Frete por KM
                            </Button>
                        </div>
                    )}
                </div>

                <div className="pt-4 border-t border-gray-50 space-y-2">
                    <div className="flex justify-between text-gray-400 font-bold text-xs uppercase tracking-widest">
                        <span>Frete</span>
                        <span>{shippingMethod === "pickup" ? "Grátis" : `R$ ${shippingFee.toFixed(2)}`}</span>
                    </div>
                    <div className="flex justify-between text-muted-text font-black text-xl">
                        <span>Total</span>
                        <span>R$ {(order.products.price + (shippingMethod === "delivery" ? shippingFee : 0)).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
                    </div>
                </div>

                <div className="pt-2">
                    <Button
                        onClick={handleFinish}
                        isLoading={finishing}
                        className="w-full h-20 rounded-full shadow-vibrant text-xl font-black gap-2"
                    >
                        <CreditCard size={24} />
                        Pagar Agora
                    </Button>
                    <div className="flex items-center justify-center gap-2 mt-6 text-gray-300 font-bold text-[10px] uppercase tracking-widest">
                        <Clock size={12} /> Link expira em 1 hora
                    </div>
                </div>
            </div>
        </div>
    );
}

export default function CheckoutWhatsAppPage() {
    return (
        <Suspense fallback={<div>Carregando...</div>}>
            <CheckoutWhatsAppContent />
        </Suspense>
    );
}
