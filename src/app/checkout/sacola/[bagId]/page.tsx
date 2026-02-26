"use client";

import { useEffect, useState, use } from "react";
import { supabase } from "@/lib/supabase";
import { ShoppingBag, Truck, CheckCircle2, Loader2, MapPin, AlertCircle } from "lucide-react";
import { toast } from "react-hot-toast";
import { deliveryService } from "@/services/delivery";
import { useRouter } from "next/navigation";

export default function BagCheckoutPage({
    params
}: {
    params: Promise<{ bagId: string }>
}) {
    const { bagId } = use(params);
    const router = useRouter();

    const [bag, setBag] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [confirming, setConfirming] = useState(false);
    const [confirmed, setConfirmed] = useState(false);

    // Address & Shipping
    const [cep, setCep] = useState('');
    const [address, setAddress] = useState({ street: '', number: '', neighborhood: '', city: '', uf: '', complement: '' });
    const [fetchingCep, setFetchingCep] = useState(false);
    const [shippingFee, setShippingFee] = useState<number | null>(null);
    const [deliveryType, setDeliveryType] = useState<'delivery' | 'pickup'>('pickup');

    // Payment
    const [paymentResult, setPaymentResult] = useState<any>(null);

    useEffect(() => {
        fetchBag();
    }, []);

    const fetchBag = async () => {
        const { data, error } = await supabase
            .from('bags')
            .select(`
                *,
                profiles(full_name, phone, email),
                bag_items(
                    quantity,
                    products(name, price, image_url)
                )
            `)
            .eq('id', bagId)
            .single();

        if (error || !data) {
            toast.error('Sacola não encontrada.');
            router.push('/perfil');
            return;
        }

        setBag(data);
        setLoading(false);
    };

    const handleCepBlur = async () => {
        const cleanCep = cep.replace(/\D/g, "");
        if (cleanCep.length === 8) {
            setFetchingCep(true);
            try {
                const res = await fetch(`https://viacep.com.br/ws/${cleanCep}/json/`);
                const d = await res.json();
                if (!d.erro) {
                    setAddress({ ...address, street: d.logradouro, neighborhood: d.bairro, city: d.localidade, uf: d.uf });

                    // Cálculo simples OSRM (simulado provisório ou real)
                    const fullAddr = `${d.logradouro}, ${d.bairro}, ${d.localidade}`;
                    const coords = await deliveryService.getCoordsFromAddress(fullAddr);
                    if (coords) {
                        const fee = await deliveryService.calculateFee(coords.lat, coords.lng);
                        setShippingFee(fee);
                        toast.success(`Frete calculado: R$ ${fee.toFixed(2)}`);
                    } else {
                        toast.error("Endereço não encontrado. Será usada uma taxa fixa (R$ 15).");
                        setShippingFee(15);
                    }
                }
            } catch (error) {
                console.error(error);
            } finally {
                setFetchingCep(false);
            }
        }
    };

    const handleConfirm = async () => {
        if (deliveryType === 'delivery' && (!address.street || !address.number || !address.city)) {
            toast.error('Preencha os dados de entrega.');
            return;
        }

        setConfirming(true);
        try {
            const itemsTotal = bag.bag_items.reduce((acc: number, item: any) => acc + (Number(item.products?.price || 0) * item.quantity), 0);
            const total = itemsTotal + (deliveryType === 'delivery' ? (shippingFee || 0) : 0);

            // Gerar Link de Pagamento no ASAAS
            const res = await fetch('/api/checkout/sacola/pay', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    bagId,
                    deliveryType,
                    address,
                    freight: deliveryType === 'delivery' ? shippingFee : 0,
                    customerName: bag.profiles?.full_name || bag.customer_name,
                    phone: bag.profiles?.phone || bag.customer_phone,
                    amount: total
                })
            });

            const data = await res.json();
            if (!data.success) throw new Error(data.error);

            setPaymentResult(data);
            setConfirmed(true);

            // Se for Pix, não redireciona automático para dar tempo de ler, a menos q seja invoice
            if (data.invoiceUrl) {
                setTimeout(() => {
                    window.location.href = data.invoiceUrl;
                }, 1000);
            }

        } catch (error: any) {
            toast.error(error.message || 'Erro ao processar liberação da sacola.');
        } finally {
            setConfirming(false);
        }
    };

    if (loading) {
        return (
            <div className="min-h-screen bg-soft flex items-center justify-center">
                <Loader2 className="w-10 h-10 animate-spin text-primary" />
            </div>
        );
    }

    const itemsTotal = bag.bag_items.reduce((acc: number, item: any) => acc + (Number(item.products?.price || 0) * item.quantity), 0);
    const finalTotal = itemsTotal + (deliveryType === 'delivery' ? (shippingFee || 0) : 0);

    if (confirmed && paymentResult) {
        return (
            <div className="min-h-screen bg-soft flex items-center justify-center p-6">
                <div className="bg-white max-w-lg w-full rounded-[3rem] shadow-premium p-10 text-center animate-in zoom-in-95 duration-500">
                    <div className="w-24 h-24 bg-green-50 rounded-full flex items-center justify-center mx-auto mb-6">
                        <CheckCircle2 size={48} className="text-green-500" />
                    </div>
                    <h2 className="text-3xl font-black text-muted-text mb-4">Quase lá!</h2>
                    <p className="text-gray-500 font-bold mb-8">
                        Seu pedido de fechamento da sacola foi gerado. Efetue o pagamento de
                        <span className="text-primary"> R$ {finalTotal.toLocaleString('pt-BR', { minimumFractionDigits: 2 })} </span>
                        para liberarmos o envio.
                    </p>
                    {paymentResult.invoiceUrl && (
                        <a href={paymentResult.invoiceUrl} target="_blank" rel="noreferrer" className="block w-full py-4 bg-primary text-white rounded-2xl font-black hover:bg-primary/90 transition-all">
                            Acessar Fatura Plêiada
                        </a>
                    )}
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-soft py-6 sm:py-12 px-4 sm:px-6">
            <div className="max-w-4xl mx-auto space-y-6 sm:space-y-8">
                <header className="flex flex-col gap-2">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 sm:w-12 sm:h-12 bg-primary/10 rounded-xl flex items-center justify-center text-primary shrink-0">
                            <ShoppingBag size={20} className="sm:w-6 sm:h-6" />
                        </div>
                        <h1 className="text-2xl sm:text-4xl font-black text-muted-text tracking-tighter lowercase">
                            Sacola
                        </h1>
                    </div>
                    <p className="text-gray-400 font-bold text-[10px] sm:text-sm uppercase tracking-widest leading-tight px-1">Revise os itens e escolha o frete</p>
                </header>

                <div className="grid md:grid-cols-5 gap-8">
                    {/* Itens */}
                    <div className="md:col-span-3 space-y-4">
                        <div className="bg-white p-5 sm:p-8 rounded-2xl sm:rounded-[2.5rem] shadow-premium">
                            <h2 className="text-[9px] sm:text-[10px] font-black text-gray-400 uppercase tracking-widest bg-soft py-2 px-3 rounded-lg w-fit mb-4">Itens</h2>
                            <div className="space-y-3 sm:space-y-4">
                                {bag.bag_items.map((item: any, i: number) => (
                                    <div key={i} className="flex gap-3 sm:gap-4 items-center border-b border-gray-50 pb-3 sm:pb-4 last:border-0 last:pb-0 group">
                                        <div className="w-12 h-12 sm:w-16 sm:h-16 bg-soft rounded-lg sm:rounded-2xl overflow-hidden shrink-0">
                                            {item.products?.image_url ? (
                                                <img src={item.products.image_url} alt="Produto" className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500" />
                                            ) : (
                                                <div className="w-full h-full flex items-center justify-center text-gray-300">
                                                    <ShoppingBag size={16} />
                                                </div>
                                            )}
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <h4 className="font-bold text-muted-text text-xs sm:text-sm lg:text-base truncate">{item.products?.name}</h4>
                                            <p className="text-[10px] sm:text-xs text-gray-400 font-bold uppercase tracking-widest">{item.quantity}x Unidade</p>
                                        </div>
                                        <div className="text-right shrink-0">
                                            <span className="font-black text-primary text-xs sm:text-sm">R$ {(Number(item.products?.price || 0) * item.quantity).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>

                        {/* Entrega */}
                        <div className="bg-white p-5 sm:p-8 rounded-2xl sm:rounded-[2.5rem] shadow-premium space-y-4 sm:space-y-6">
                            <h2 className="text-[9px] sm:text-[10px] font-black text-gray-400 uppercase tracking-widest bg-soft py-2 px-3 rounded-lg w-fit">Recebimento</h2>
                            <div className="grid grid-cols-2 gap-3 sm:gap-4">
                                <button
                                    onClick={() => setDeliveryType('pickup')}
                                    className={`p-3 sm:p-4 rounded-xl sm:rounded-2xl border-2 text-center transition-all flex flex-col items-center justify-center gap-1 ${deliveryType === 'pickup' ? 'border-primary bg-primary/5' : 'border-gray-50'}`}
                                >
                                    <ShoppingBag size={18} className={deliveryType === 'pickup' ? 'text-primary' : 'text-gray-300'} />
                                    <span className={`text-[10px] sm:text-xs font-black uppercase tracking-tight ${deliveryType === 'pickup' ? 'text-primary' : 'text-gray-400'}`}>Retirar</span>
                                </button>
                                <button
                                    onClick={() => setDeliveryType('delivery')}
                                    className={`p-3 sm:p-4 rounded-xl sm:rounded-2xl border-2 text-center transition-all flex flex-col items-center justify-center gap-1 ${deliveryType === 'delivery' ? 'border-primary bg-primary/5' : 'border-gray-50'}`}
                                >
                                    <Truck size={18} className={deliveryType === 'delivery' ? 'text-primary' : 'text-gray-300'} />
                                    <span className={`text-[10px] sm:text-xs font-black uppercase tracking-tight ${deliveryType === 'delivery' ? 'text-primary' : 'text-gray-400'}`}>Receber</span>
                                </button>
                            </div>

                            {deliveryType === 'delivery' && (
                                <div className="space-y-3 sm:space-y-4 animate-in fade-in slide-in-from-top-4 duration-300">
                                    <div className="grid grid-cols-3 gap-3 sm:gap-4">
                                        <input type="text" placeholder="CEP" className="col-span-1 p-3 sm:p-4 bg-soft rounded-xl sm:rounded-2xl border-none font-bold text-xs sm:text-sm outline-none focus:ring-2 focus:ring-primary/20" value={cep} onChange={e => setCep(e.target.value)} onBlur={handleCepBlur} />
                                        <input type="text" placeholder="Rua" className="col-span-2 p-3 sm:p-4 bg-soft rounded-xl sm:rounded-2xl border-none font-bold text-xs sm:text-sm outline-none" value={address.street} onChange={e => setAddress({ ...address, street: e.target.value })} />
                                    </div>
                                    <div className="grid grid-cols-3 gap-3 sm:gap-4">
                                        <input type="text" placeholder="Nº" className="col-span-1 p-3 sm:p-4 bg-soft rounded-xl sm:rounded-2xl border-none font-bold text-xs sm:text-sm outline-none" value={address.number} onChange={e => setAddress({ ...address, number: e.target.value })} />
                                        <input type="text" placeholder="Bairro" className="col-span-2 p-3 sm:p-4 bg-soft rounded-xl sm:rounded-2xl border-none font-bold text-xs sm:text-sm outline-none" value={address.neighborhood} onChange={e => setAddress({ ...address, neighborhood: e.target.value })} />
                                    </div>
                                    <div className="grid grid-cols-2 gap-3 sm:gap-4">
                                        <input type="text" placeholder="Cidade" className="p-3 sm:p-4 bg-soft rounded-xl sm:rounded-2xl border-none font-bold text-xs sm:text-sm outline-none" value={address.city} onChange={e => setAddress({ ...address, city: e.target.value })} />
                                        <input type="text" placeholder="Complemento" className="p-3 sm:p-4 bg-soft rounded-xl sm:rounded-2xl border-none font-bold text-xs sm:text-sm outline-none" value={address.complement} onChange={e => setAddress({ ...address, complement: e.target.value })} />
                                    </div>

                                    {fetchingCep && <p className="text-[9px] text-primary font-black animate-pulse uppercase tracking-widest">Buscando endereço...</p>}
                                    {shippingFee !== null && (
                                        <div className="p-3 sm:p-4 bg-primary/10 rounded-xl sm:rounded-2xl flex justify-between items-center text-primary font-black uppercase tracking-widest text-[10px] sm:text-xs">
                                            <span>Frete {address.city ? `p/ ${address.city}` : ''}</span>
                                            <span className="text-sm sm:text-base">R$ {shippingFee.toFixed(2)}</span>
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Resumo */}
                    <div className="md:col-span-2">
                        <div className="bg-white p-6 sm:p-8 rounded-2xl sm:rounded-[2.5rem] shadow-premium md:sticky md:top-6 lg:top-8 space-y-4 sm:space-y-6">
                            <h2 className="text-xl sm:text-2xl font-black text-muted-text">Resumo</h2>
                            <div className="space-y-3 sm:space-y-4 pt-4 border-t border-gray-50">
                                <div className="flex justify-between text-xs sm:text-sm font-bold text-gray-400 uppercase tracking-widest">
                                    <span>Produtos</span>
                                    <span className="text-muted-text">R$ {itemsTotal.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
                                </div>
                                <div className="flex justify-between text-xs sm:text-sm font-bold text-gray-400 uppercase tracking-widest">
                                    <span>Frete</span>
                                    <span className="text-muted-text">{deliveryType === 'delivery' && shippingFee !== null ? `R$ ${shippingFee.toFixed(2)}` : 'Grátis'}</span>
                                </div>
                                <div className="pt-4 border-t border-gray-50 flex justify-between items-center">
                                    <span className="text-sm sm:text-base font-black text-muted-text uppercase tracking-widest">Total</span>
                                    <span className="text-xl sm:text-2xl font-black text-primary">R$ {finalTotal.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
                                </div>
                            </div>

                            <button
                                onClick={handleConfirm}
                                disabled={confirming || (deliveryType === 'delivery' && shippingFee === null)}
                                className="w-full h-14 sm:h-16 bg-primary text-white rounded-xl sm:rounded-2xl font-black text-base sm:text-lg shadow-vibrant hover:scale-[1.02] active:scale-95 transition-all disabled:opacity-50 disabled:grayscale disabled:hover:scale-100 flex items-center justify-center gap-3"
                            >
                                {confirming ? <Loader2 className="animate-spin" size={20} /> : <CheckCircle2 size={24} />}
                                {confirming ? "Processando..." : "Confirmar e Pagar"}
                            </button>
                            <div className="flex items-center justify-center gap-2 text-[8px] sm:text-[9px] font-black text-gray-400 uppercase tracking-widest opacity-60">
                                <AlertCircle size={10} />
                                <span>Pagamento 100% Seguro</span>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
