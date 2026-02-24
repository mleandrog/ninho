"use client";

import { useEffect, useState, use } from "react";
import { supabase } from "@/lib/supabase";
import { ShoppingBag, Truck, X, CheckCircle2, Package, Loader2, Eye, MapPin, Calculator } from "lucide-react";
import { toast } from "react-hot-toast";
import { deliveryService } from "@/services/delivery";

export default function CampaignCartPage({
    params
}: {
    params: Promise<{ campaignId: string; phone: string }>
}) {
    const { campaignId, phone: encodedPhone } = use(params);
    const phone = decodeURIComponent(encodedPhone);

    const [items, setItems] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [confirming, setConfirming] = useState(false);
    const [confirmed, setConfirmed] = useState(false);
    const [orderNumber, setOrderNumber] = useState('');

    const [deliveryType, setDeliveryType] = useState<'delivery' | 'sacola'>('sacola');
    const [paymentMethod, setPaymentMethod] = useState<'pix' | 'link'>('pix');
    const [address, setAddress] = useState({ street: '', number: '', neighborhood: '', city: '', complement: '' });
    const [paymentResult, setPaymentResult] = useState<any>(null);
    const [settings, setSettings] = useState<any>(null);
    const [shippingFee, setShippingFee] = useState(0);
    const [calculating, setCalculating] = useState(false);

    useEffect(() => {
        fetchCartItems();
        fetchSettings();
    }, []);

    const fetchSettings = async () => {
        const { data } = await supabase.from('whatsapp_settings').select('*').limit(1).single();
        if (data) setSettings(data);
    };

    const fetchCartItems = async () => {
        const { data, error } = await supabase
            .from('priority_queue')
            .select('*, products(id, name, price, image_url)')
            .eq('campaign_id', campaignId)
            .eq('customer_phone', phone)
            .in('status', ['waiting', 'notified']);

        if (error) {
            toast.error('Erro ao carregar carrinho.');
        } else {
            setItems(data || []);
        }
        setLoading(false);
    };

    const removeItem = (id: string) => {
        setItems(prev => prev.filter(item => item.id !== id));
        toast.success('Item removido do carrinho.');
    };

    const totalAmount = items.reduce((acc, item) => acc + Number(item.products?.price || 0), 0);
    const finalTotal = totalAmount + (deliveryType === 'delivery' ? shippingFee : 0);

    const handleCalculateShipping = async () => {
        const fullAddress = `${address.street}, ${address.number}, ${address.neighborhood}, ${address.city}`;
        if (!address.street || !address.city) return toast.error("Preencha ao menos Rua e Cidade.");

        setCalculating(true);
        try {
            const coords = await deliveryService.getCoordsFromAddress(fullAddress);
            if (coords) {
                const fee = await deliveryService.calculateFee(coords.lat, coords.lng);
                setShippingFee(fee);
                toast.success(`Frete calculado: R$ ${fee.toFixed(2)}`);
            } else {
                toast.error("Endereço não encontrado nas coordenadas.");
            }
        } catch (error) {
            toast.error("Erro ao calcular frete.");
        } finally {
            setCalculating(false);
        }
    };

    const handleConfirm = async () => {
        if (items.length === 0) {
            toast.error('Adicione ao menos 1 produto para confirmar.');
            return;
        }
        if (deliveryType === 'delivery' && (!address.street || !address.number || !address.city)) {
            toast.error('Preencha o endereço completo para entrega.');
            return;
        }

        setConfirming(true);
        try {
            const res = await fetch('/api/checkout/campanha/confirm', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'x-payment-method': paymentMethod
                },
                body: JSON.stringify({
                    campaignId,
                    phone,
                    selectedItemIds: items.map(i => i.id),
                    deliveryType,
                    address: deliveryType === 'delivery' ? address : null,
                    shippingFee: deliveryType === 'delivery' ? shippingFee : 0,
                }),
            });

            const data = await res.json();
            if (!res.ok) throw new Error(data.error || 'Erro ao confirmar pedido.');

            setOrderNumber(data.orderNumber);
            setPaymentResult(data.payment);
            setConfirmed(true);
            toast.success('Pedido confirmado!');

            // REDIRECIONAMENTO AUTOMÁTICO se for Link de Pagamento
            if (paymentMethod === 'link' && data.payment?.invoiceUrl) {
                setTimeout(() => {
                    if (typeof window !== "undefined") {
                        window.location.href = data.payment.invoiceUrl;
                    }
                }, 1500); // Pequeno delay para o usuário ver o sucesso
            }
        } catch (err: any) {
            toast.error(err.message);
        } finally {
            setConfirming(false);
        }
    };

    if (loading) {
        return (
            <div className="min-h-screen bg-soft flex items-center justify-center">
                <Loader2 className="w-10 h-10 text-primary animate-spin" />
            </div>
        );
    }

    if (confirmed) {
        return (
            <div className="min-h-screen bg-soft flex items-center justify-center p-6">
                <div className="bg-white rounded-[3rem] p-10 max-w-md w-full text-center shadow-xl">
                    <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
                        <CheckCircle2 className="w-10 h-10 text-green-500" />
                    </div>
                    <h1 className="text-3xl font-black text-gray-800 mb-2">Pedido Confirmado!</h1>
                    <p className="text-gray-500 font-bold mb-6">
                        Pedido <span className="text-primary">#{orderNumber}</span> recebido com sucesso.
                    </p>

                    {paymentResult?.type === 'pix' && paymentResult.qrCode && (
                        <div className="bg-soft p-6 rounded-3xl mb-6">
                            <p className="text-xs font-black uppercase text-gray-400 mb-4 tracking-widest">Pague com PIX</p>
                            <img
                                src={`data:image/png;base64,${paymentResult.qrCode}`}
                                alt="QR Code Pix"
                                className="w-48 h-48 mx-auto mb-4 rounded-xl shadow-sm"
                            />
                            <button
                                onClick={() => {
                                    navigator.clipboard.writeText(paymentResult.qrCodePayload);
                                    toast.success('Código PIX copiado!');
                                }}
                                className="w-full py-3 bg-white text-primary font-black text-xs uppercase rounded-xl border-2 border-primary/20 hover:bg-primary/5 transition-all"
                            >
                                Copiar Código PIX
                            </button>
                        </div>
                    )}

                    {paymentResult?.invoiceUrl && (
                        <div className="mb-8">
                            <a
                                href={paymentResult.invoiceUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="inline-flex items-center gap-2 text-primary font-black hover:underline"
                            >
                                Abrir Link de Pagamento <Eye size={16} />
                            </a>
                        </div>
                    )}

                    <p className="text-gray-400 text-sm leading-relaxed">
                        Enviamos os detalhes e o link de pagamento também para o seu WhatsApp. 💛
                    </p>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-soft py-10 px-4">
            <div className="max-w-lg mx-auto">
                {/* Header */}
                <div className="text-center mb-8">
                    <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-4">
                        <ShoppingBag className="w-8 h-8 text-primary" />
                    </div>
                    <h1 className="text-3xl font-black text-gray-800">Seu Carrinho</h1>
                    <p className="text-gray-500 font-bold mt-1">Revise os produtos e escolha como quer receber</p>
                </div>

                {/* Items */}
                <div className="space-y-3 mb-6">
                    {items.length === 0 ? (
                        <div className="bg-white rounded-3xl p-10 text-center">
                            <Package className="w-10 h-10 text-gray-300 mx-auto mb-3" />
                            <p className="text-gray-400 font-bold">Nenhum produto no carrinho</p>
                        </div>
                    ) : items.map(item => (
                        <div key={item.id} className="bg-white rounded-3xl p-5 flex items-center gap-4 shadow-sm">
                            <div className="w-16 h-16 rounded-2xl overflow-hidden bg-soft shrink-0">
                                {item.products?.image_url ? (
                                    // eslint-disable-next-line @next/next/no-img-element
                                    <img src={item.products.image_url} alt={item.products.name} className="w-full h-full object-cover" />
                                ) : (
                                    <div className="w-full h-full flex items-center justify-center">
                                        <Package className="text-gray-300" size={24} />
                                    </div>
                                )}
                            </div>
                            <div className="flex-1 min-w-0">
                                <h3 className="font-black text-gray-800 truncate">{item.products?.name}</h3>
                                <p className="text-primary font-black text-lg">
                                    R$ {Number(item.products?.price || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                                </p>
                            </div>
                            <button
                                onClick={() => removeItem(item.id)}
                                className="w-9 h-9 rounded-full bg-red-50 text-red-500 flex items-center justify-center hover:bg-red-100 transition-colors shrink-0"
                            >
                                <X size={16} />
                            </button>
                        </div>
                    ))}
                </div>

                {/* Total */}
                {items.length > 0 && (
                    <>
                        <div className="bg-primary/5 rounded-3xl p-5 mb-6 space-y-2 border border-primary/10">
                            <div className="flex justify-between items-center text-gray-400 text-[10px] font-black uppercase tracking-widest">
                                <span>Subtotal</span>
                                <span>R$ {totalAmount.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
                            </div>
                            {deliveryType === 'delivery' && (
                                <div className="flex justify-between items-center text-gray-400 text-[10px] font-black uppercase tracking-widest">
                                    <span>Frete</span>
                                    <span>R$ {shippingFee.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
                                </div>
                            )}
                            <div className="flex justify-between items-center pt-2 mt-2 border-t border-primary/10">
                                <span className="font-black text-gray-600 uppercase text-sm tracking-widest">Total</span>
                                <span className="text-2xl font-black text-primary">
                                    R$ {finalTotal.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                                </span>
                            </div>
                        </div>

                        {/* Tipo de entrega */}
                        <div className="bg-white rounded-3xl p-6 mb-6 shadow-sm">
                            <h2 className="font-black text-gray-800 mb-4 text-sm uppercase tracking-widest">Como quer receber?</h2>
                            <div className="grid grid-cols-2 gap-3">
                                <button
                                    onClick={() => setDeliveryType('sacola')}
                                    className={`p-4 rounded-2xl border-2 text-center transition-all ${deliveryType === 'sacola' ? 'border-primary bg-primary/5' : 'border-gray-100 hover:border-gray-200'}`}
                                >
                                    <ShoppingBag className={`mx-auto mb-2 ${deliveryType === 'sacola' ? 'text-primary' : 'text-gray-400'}`} size={24} />
                                    <p className={`text-sm font-black ${deliveryType === 'sacola' ? 'text-primary' : 'text-gray-500'}`}>Sacola</p>
                                    <p className="text-[10px] text-gray-400 font-bold mt-1">Retirada/entrega futura</p>
                                </button>
                                <button
                                    onClick={() => setDeliveryType('delivery')}
                                    className={`p-4 rounded-2xl border-2 text-center transition-all ${deliveryType === 'delivery' ? 'border-primary bg-primary/5' : 'border-gray-100 hover:border-gray-200'}`}
                                >
                                    <Truck className={`mx-auto mb-2 ${deliveryType === 'delivery' ? 'text-primary' : 'text-gray-400'}`} size={24} />
                                    <p className={`text-sm font-black ${deliveryType === 'delivery' ? 'text-primary' : 'text-gray-500'}`}>Entrega Imediata</p>
                                    <p className="text-[10px] text-gray-400 font-bold mt-1">Receba em casa agora</p>
                                </button>
                            </div>
                        </div>

                        {/* Endereço (se entrega) */}
                        {deliveryType === 'delivery' && (
                            <div className="bg-white rounded-3xl p-6 mb-6 shadow-sm space-y-4">
                                <h2 className="font-black text-gray-800 text-sm uppercase tracking-widest">Endereço de Entrega</h2>
                                <input
                                    type="text"
                                    placeholder="Rua / Avenida"
                                    value={address.street}
                                    onChange={e => setAddress(a => ({ ...a, street: e.target.value }))}
                                    className="w-full px-4 py-3 rounded-2xl bg-soft border border-transparent focus:border-primary/30 focus:outline-none font-bold text-gray-700"
                                />
                                <div className="grid grid-cols-2 gap-3">
                                    <input
                                        type="text"
                                        placeholder="Número"
                                        value={address.number}
                                        onChange={e => setAddress(a => ({ ...a, number: e.target.value }))}
                                        className="w-full px-4 py-3 rounded-2xl bg-soft border border-transparent focus:border-primary/30 focus:outline-none font-bold text-gray-700"
                                    />
                                    <input
                                        type="text"
                                        placeholder="Complemento"
                                        value={address.complement}
                                        onChange={e => setAddress(a => ({ ...a, complement: e.target.value }))}
                                        className="w-full px-4 py-3 rounded-2xl bg-soft border border-transparent focus:border-primary/30 focus:outline-none font-bold text-gray-700"
                                    />
                                </div>
                                <input
                                    type="text"
                                    placeholder="Bairro"
                                    value={address.neighborhood}
                                    onChange={e => setAddress(a => ({ ...a, neighborhood: e.target.value }))}
                                    className="w-full px-4 py-3 rounded-2xl bg-soft border border-transparent focus:border-primary/30 focus:outline-none font-bold text-gray-700"
                                />
                                <input
                                    type="text"
                                    placeholder="Cidade"
                                    value={address.city}
                                    onChange={e => setAddress(a => ({ ...a, city: e.target.value }))}
                                    className="w-full px-4 py-3 rounded-2xl bg-soft border border-transparent focus:border-primary/30 focus:outline-none font-bold text-gray-700"
                                />
                            </div>
                        )}

                        {/* Método de Pagamento */}
                        <div className="bg-white rounded-3xl p-6 mb-6 shadow-sm">
                            <h2 className="font-black text-gray-800 mb-4 text-sm uppercase tracking-widest">Como deseja pagar?</h2>
                            <div className="grid grid-cols-2 gap-3">
                                {settings?.asaas_pix_enabled !== false && (
                                    <button
                                        onClick={() => setPaymentMethod('pix')}
                                        className={`p-4 rounded-2xl border-2 text-center transition-all ${paymentMethod === 'pix' ? 'border-primary bg-primary/5' : 'border-gray-100 hover:border-gray-200'}`}
                                    >
                                        <div className={`w-8 h-8 mx-auto mb-2 flex items-center justify-center rounded-lg font-black text-[10px] ${paymentMethod === 'pix' ? 'bg-primary text-white' : 'bg-gray-100 text-gray-400'}`}>PIX</div>
                                        <p className={`text-sm font-black ${paymentMethod === 'pix' ? 'text-primary' : 'text-gray-500'}`}>PIX</p>
                                        <p className="text-[10px] text-gray-400 font-bold mt-1">Liberação imediata</p>
                                    </button>
                                )}
                                {settings?.asaas_card_enabled !== false && (
                                    <button
                                        onClick={() => setPaymentMethod('link')}
                                        className={`p-4 rounded-2xl border-2 text-center transition-all ${paymentMethod === 'link' ? 'border-primary bg-primary/5' : 'border-gray-100 hover:border-gray-200'}`}
                                    >
                                        <ShoppingBag className={`mx-auto mb-2 ${paymentMethod === 'link' ? 'text-primary' : 'text-gray-400'}`} size={24} />
                                        <p className={`text-sm font-black ${paymentMethod === 'link' ? 'text-primary' : 'text-gray-500'}`}>Outros</p>
                                        <p className="text-[10px] text-gray-400 font-bold mt-1">Cartão ou Boleto</p>
                                    </button>
                                )}
                            </div>
                        </div>

                        {/* Botão Confirmar */}
                        <button
                            onClick={handleConfirm}
                            disabled={confirming}
                            className="w-full py-5 bg-primary text-white font-black text-sm uppercase tracking-widest rounded-2xl hover:bg-primary/90 active:scale-95 transition-all shadow-lg disabled:opacity-60 disabled:cursor-not-allowed flex items-center justify-center gap-3"
                        >
                            {confirming ? (
                                <><Loader2 size={20} className="animate-spin" /> Confirmando...</>
                            ) : (
                                <><CheckCircle2 size={20} /> Confirmar Pedido</>
                            )}
                        </button>
                        <p className="text-center text-xs text-gray-400 font-bold mt-4">
                            Ao confirmar, você concorda com as condições de compra do Ninho Lar.
                        </p>
                    </>
                )}
            </div>
        </div>
    );
}
