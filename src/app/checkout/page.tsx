"use client";

import { useState, useEffect } from "react";
import { Header } from "@/components/layout/Header";
import { useCart } from "@/hooks/useCart";
import { AddressForm } from "@/components/checkout/AddressForm";
import { OrderSummary } from "@/components/checkout/OrderSummary";
import { Button } from "@/components/ui/Button";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/lib/supabase";
import { useRouter } from "next/navigation";
import { toast } from "react-hot-toast";
import { CreditCard, ShoppingBag, Truck, MapPin } from "lucide-react";

export default function CheckoutPage() {
    const { items, totalPrice, clearCart } = useCart();
    const { user } = useAuth();
    const router = useRouter();
    const [loading, setLoading] = useState(false);
    const [shippingMethod, setShippingMethod] = useState<"delivery" | "pickup">("delivery");
    const [address, setAddress] = useState<any>({
        zipcode: "",
        street: "",
        number: "",
        complement: "",
        neighborhood: "",
        city: "",
    });

    const [shippingFee, setShippingFee] = useState(0);
    const [distance, setDistance] = useState<number | null>(null);
    const total = totalPrice() + shippingFee;

    // Buscar configurações globais (coordenadas da loja)
    const [storeConfig, setStoreConfig] = useState<any>(null);
    useEffect(() => {
        supabase.from("whatsapp_settings").select("*").limit(1).single()
            .then(({ data }) => setStoreConfig(data));
    }, []);

    const fetchDestinationCoords = async (zip: string) => {
        try {
            const res = await fetch(`https://viacep.com.br/ws/${zip}/json/`);
            const data = await res.json();
            if (data.erro) return null;

            const fullAddr = `${data.logradouro}, ${data.bairro}, ${data.localidade} - ${data.uf}`;
            const coordsRes = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(fullAddr)}&limit=1`);
            const coordsData = await coordsRes.json();

            if (coordsData?.[0]) {
                return {
                    lat: parseFloat(coordsData[0].lat),
                    lng: parseFloat(coordsData[0].lon),
                    address: data
                };
            }
        } catch (e) { console.error(e); }
        return null;
    };

    const calculateRealDistance = async (dest: { lat: number, lng: number }) => {
        if (!storeConfig?.store_lat || !storeConfig?.store_lng) return null;
        try {
            const url = `https://router.project-osrm.org/route/v1/driving/${storeConfig.store_lng},${storeConfig.store_lat};${dest.lng},${dest.lat}?overview=false`;
            const res = await fetch(url);
            const data = await res.json();
            if (data.routes?.[0]?.distance) {
                return data.routes[0].distance / 1000; // km
            }
        } catch (e) { console.error(e); }
        return null;
    };

    useEffect(() => {
        if (shippingMethod === "pickup") {
            setShippingFee(0);
            setDistance(null);
        } else if (address.zipcode.replace(/\D/g, "").length === 8) {
            const timer = setTimeout(async () => {
                const dest = await fetchDestinationCoords(address.zipcode);
                if (dest) {
                    setAddress((prev: any) => ({
                        ...prev,
                        street: dest.address.logradouro,
                        neighborhood: dest.address.bairro,
                        city: dest.address.localidade,
                        state: dest.address.uf
                    }));

                    const km = await calculateRealDistance(dest);
                    if (km !== null) {
                        setDistance(km);
                        // Regra de frete: R$ 5 fixo + R$ 2 por km
                        let fee = 5 + (km * 2);

                        // Aplicar frete grátis
                        const minFree = Number(storeConfig?.free_shipping_min_order || 0);
                        if (minFree > 0 && totalPrice() >= minFree) {
                            fee = 0;
                            toast.success("Parabéns! Você ganhou Frete Grátis.");
                        }

                        setShippingFee(Math.ceil(fee));
                    }
                }
            }, 1000);
            return () => clearTimeout(timer);
        }
    }, [address.zipcode, shippingMethod, storeConfig, totalPrice]);

    useEffect(() => {
        if (items.length === 0) {
            router.push("/catalogo");
        }
    }, [items, router]);

    const handleAddressChange = (field: string, value: string) => {
        setAddress((prev: any) => ({ ...prev, [field]: value }));
    };

    const handleFinishOrder = async () => {
        if (!user) {
            toast.error("Você precisa estar logado para finalizar o pedido.");
            router.push("/login?redirect=/checkout");
            return;
        }

        if (shippingMethod === "delivery" && (!address.street || !address.number || !address.zipcode)) {
            toast.error("Por favor, preencha o endereço de entrega corretamente.");
            return;
        }

        setLoading(true);
        try {
            // 1. Create Order in Supabase
            const { data: order, error: orderError } = await supabase
                .from("orders")
                .insert({
                    customer_id: user.id,
                    total_amount: total,
                    status: "pending",
                    shipping_fee: shippingFee,
                    delivery_address: shippingMethod === "delivery" ? address : null,
                    is_pickup: shippingMethod === "pickup",
                })
                .select()
                .single();

            if (orderError) throw orderError;

            // 2. Insert Order Items
            const orderItems = items.map((item) => ({
                order_id: order.id,
                product_id: item.id,
                quantity: item.quantity,
                unit_price: item.price,
            }));

            const { error: itemsError } = await supabase.from("order_items").insert(orderItems);
            if (itemsError) throw itemsError;

            // 3. Create Mercado Pago Preference
            const mpResponse = await fetch("/api/checkout/mercado-pago", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    items,
                    orderId: order.id,
                    customerEmail: user.email,
                }),
            });

            const mpData = await mpResponse.json();
            if (mpData.error) throw new Error(mpData.error);

            toast.success("Pedido gerado! Redirecionando para o pagamento...");

            // 4. Redirect to Mercado Pago
            clearCart();
            window.location.href = mpData.init_point;

        } catch (error: any) {
            toast.error("Erro ao processar pedido: " + error.message);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-soft">
            <Header />

            <main className="container mx-auto px-6 py-12">
                <h1 className="text-4xl lg:text-5xl font-black text-muted-text mb-12">Finalizar Compra</h1>

                <div className="grid lg:grid-cols-3 gap-12 items-start">
                    <div className="lg:col-span-2 space-y-8">
                        {/* Escolha do Método */}
                        <div className="bg-white p-8 rounded-[2.5rem] shadow-premium border border-white/20 space-y-6">
                            <h2 className="text-2xl font-black text-muted-text">Como deseja receber?</h2>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                <button
                                    onClick={() => setShippingMethod("delivery")}
                                    className={`p-6 rounded-3xl border-2 flex flex-col gap-3 transition-all ${shippingMethod === "delivery"
                                        ? "border-primary bg-primary/5 text-primary"
                                        : "border-gray-50 bg-soft text-gray-400 opacity-60 hover:opacity-100"
                                        }`}
                                >
                                    <Truck size={28} />
                                    <div className="text-left font-black text-lg">Entrega em Casa</div>
                                    <div className="text-left text-sm font-bold opacity-70">
                                        {shippingFee > 0 ? `R$ ${shippingFee.toFixed(2)}` : "Calculando..."}
                                        {distance && ` • ${distance.toFixed(1)}km`}
                                    </div>
                                </button>
                                <button
                                    onClick={() => setShippingMethod("pickup")}
                                    className={`p-6 rounded-3xl border-2 flex flex-col gap-3 transition-all ${shippingMethod === "pickup"
                                        ? "border-secondary bg-secondary/5 text-secondary"
                                        : "border-gray-50 bg-soft text-gray-400 opacity-60 hover:opacity-100"
                                        }`}
                                >
                                    <MapPin size={28} />
                                    <div className="text-left font-black text-lg">Retirada no Local</div>
                                    <div className="text-left text-sm font-bold opacity-70">Grátis • Pronto em 2h</div>
                                </button>
                            </div>
                        </div>

                        {shippingMethod === "delivery" && (
                            <AddressForm data={address} onChange={handleAddressChange} />
                        )}

                        {/* Pagamento Mock */}
                        <div className="bg-white p-8 rounded-[2.5rem] shadow-premium border border-white/20 space-y-6 opacity-80 grayscale">
                            <h2 className="text-2xl font-black text-muted-text flex items-center gap-3">
                                <CreditCard size={24} /> Pagamento
                            </h2>
                            <p className="font-bold text-gray-400">Você será redirecionado para o ambiente seguro do Mercado Pago.</p>
                        </div>
                    </div>

                    <div className="lg:col-span-1 space-y-6 sticky top-24">
                        <OrderSummary shippingFee={shippingFee} />

                        <Button
                            size="lg"
                            className="w-full h-20 text-xl font-black gap-3 shadow-vibrant"
                            onClick={handleFinishOrder}
                            isLoading={loading}
                        >
                            <ShoppingBag size={24} />
                            Confirmar e Pagar
                        </Button>

                        <p className="text-center text-gray-400 font-medium text-sm">
                            Ao clicar, você concorda com nossos termos.
                        </p>
                    </div>
                </div>
            </main>
        </div>
    );
}
