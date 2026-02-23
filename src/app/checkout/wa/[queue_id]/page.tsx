"use client";

import { useEffect, useState } from "react";
import { use } from "react";
import { supabase } from "@/lib/supabase";
import { Loader2, CheckCircle2, Clock, ShoppingBag, MapPin, QrCode } from "lucide-react";

interface QueueItem {
    id: string;
    customer_name: string;
    customer_phone: string;
    status: string;
    expires_at: string;
    product_id: number;
    campaign_id: string;
    products?: { name: string; price: number; image_url: string; description: string };
}

export default function WhatsAppCheckoutPage({ params }: { params: Promise<{ queue_id: string }> }) {
    const { queue_id } = use(params);

    const [queue, setQueue] = useState<QueueItem | null>(null);
    const [loading, setLoading] = useState(true);
    const [step, setStep] = useState<'details' | 'address' | 'payment' | 'done'>('details');
    const [cep, setCep] = useState('');
    const [address, setAddress] = useState({ logradouro: '', bairro: '', cidade: '', uf: '' });
    const [freight, setFreight] = useState<number | null>(null);
    const [fetchingCep, setFetchingCep] = useState(false);
    const [paymentData, setPaymentData] = useState<{ invoiceUrl?: string; qrCode?: string; qrCodePayload?: string } | null>(null);
    const [processing, setProcessing] = useState(false);
    const [timeLeft, setTimeLeft] = useState('');
    const [customerName, setCustomerName] = useState('');
    const [hasBag, setHasBag] = useState(false);

    useEffect(() => {
        fetchQueue();
    }, [queue_id]);

    useEffect(() => {
        if (!queue?.expires_at) return;
        const interval = setInterval(() => {
            const diff = Math.max(0, new Date(queue.expires_at).getTime() - Date.now());
            const mins = Math.floor(diff / 60000);
            const secs = Math.floor((diff % 60000) / 1000);
            setTimeLeft(`${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`);
            if (diff === 0) clearInterval(interval);
        }, 1000);
        return () => clearInterval(interval);
    }, [queue]);

    const fetchQueue = async () => {
        setLoading(true);
        const { data } = await supabase
            .from('priority_queue')
            .select('*, products(name, price, image_url, description)')
            .eq('id', queue_id)
            .single();

        if (data) {
            setQueue(data);
            setCustomerName(data.customer_name || '');

            // Verifica se o cliente já tem sacola aberta (frete pago)
            const { data: bagData } = await supabase
                .from('bags')
                .select('id')
                .eq('customer_phone', data.customer_phone)
                .eq('status', 'open')
                .maybeSingle();

            setHasBag(!!bagData);
        }
        setLoading(false);
    };

    const fetchCep = async () => {
        if (cep.length < 8) return;
        setFetchingCep(true);
        try {
            const res = await fetch(`https://viacep.com.br/ws/${cep.replace('-', '')}/json/`);
            const d = await res.json();
            if (!d.erro) {
                setAddress({ logradouro: d.logradouro, bairro: d.bairro, cidade: d.localidade, uf: d.uf });
                // Calcular frete estimado baseado em distância da loja
                // Por enquanto, cálculo simples por zona de CEP
                const prefix = parseInt(cep.substring(0, 5));
                // Ajuste de acordo com CEPs da sua região
                const fee = prefix >= 80000 && prefix <= 85000 ? 15 : 25; // Ex: Curitiba = R$15, outra cidade = R$25
                setFreight(hasBag ? 0 : fee);
            }
        } finally {
            setFetchingCep(false);
        }
    };

    const handlePayment = async () => {
        setProcessing(true);
        try {
            const res = await fetch('/api/checkout/wa', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    queue_id,
                    customer_name: customerName,
                    cep,
                    address,
                    freight: freight ?? 0,
                }),
            });
            const data = await res.json();
            if (data.invoiceUrl || data.qrCode) {
                setPaymentData(data);
                setStep('payment');
            }
        } finally {
            setProcessing(false);
        }
    };

    if (loading) {
        return (
            <div className="min-h-screen bg-gradient-to-br from-rose-50 via-pink-50 to-orange-50 flex items-center justify-center">
                <Loader2 className="animate-spin text-rose-400" size={40} />
            </div>
        );
    }

    if (!queue || queue.status === 'expired') {
        return (
            <div className="min-h-screen bg-gradient-to-br from-rose-50 via-pink-50 to-orange-50 flex flex-col items-center justify-center p-6 text-center">
                <Clock className="text-gray-400 mb-4" size={56} />
                <h1 className="text-2xl font-black text-gray-600 mb-2">Tempo Esgotado</h1>
                <p className="text-gray-400 font-medium">Seu link expirou. Aguarde a próxima campanha no grupo!</p>
            </div>
        );
    }

    if (queue.status === 'paid' || step === 'done') {
        return (
            <div className="min-h-screen bg-gradient-to-br from-green-50 via-emerald-50 to-teal-50 flex flex-col items-center justify-center p-6 text-center">
                <CheckCircle2 className="text-green-500 mb-4" size={64} />
                <h1 className="text-3xl font-black text-green-700 mb-2">Pedido Confirmado! 🎉</h1>
                <p className="text-green-600 font-medium max-w-xs">
                    Seu pagamento foi recebido e o produto foi reservado para você. Logo entraremos em contato.
                </p>
            </div>
        );
    }

    const product = (queue as any).products;
    const total = (product?.price || 0) + (freight ?? 0);

    return (
        <div className="min-h-screen bg-gradient-to-br from-rose-50 via-pink-50 to-orange-50">
            {/* Header */}
            <div className="bg-white/80 backdrop-blur-sm border-b border-rose-100 px-5 py-4 flex items-center justify-between sticky top-0 z-10">
                <div className="flex items-center gap-3">
                    <ShoppingBag className="text-rose-500" size={24} />
                    <span className="font-black text-gray-700">Ninho Lar</span>
                </div>
                {queue.expires_at && (
                    <div className="flex items-center gap-2 bg-amber-100 px-3 py-1.5 rounded-full">
                        <Clock size={14} className="text-amber-600" />
                        <span className="text-sm font-black text-amber-700">{timeLeft}</span>
                    </div>
                )}
            </div>

            <div className="max-w-md mx-auto p-5 space-y-5 pb-10">

                {/* Produto */}
                <div className="bg-white rounded-3xl shadow-sm p-5 flex gap-4">
                    {product?.image_url && (
                        <img src={product.image_url} alt={product.name} className="w-20 h-20 rounded-2xl object-cover flex-shrink-0" />
                    )}
                    <div className="flex-1">
                        <p className="text-xs font-bold text-rose-400 uppercase tracking-widest mb-1">Reservado para você!</p>
                        <h2 className="font-black text-gray-800 text-lg leading-tight">{product?.name}</h2>
                        <p className="text-2xl font-black text-rose-500 mt-1">
                            R$ {Number(product?.price || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                        </p>
                    </div>
                </div>

                {step === 'details' && (
                    <>
                        <div className="bg-white rounded-3xl shadow-sm p-5 space-y-3">
                            <h3 className="font-black text-gray-700 text-sm uppercase tracking-widest">Seus Dados</h3>
                            <input
                                type="text"
                                placeholder="Seu nome completo"
                                className="w-full p-4 bg-gray-50 rounded-2xl font-medium text-gray-700 focus:outline-none focus:ring-2 focus:ring-rose-300"
                                value={customerName}
                                onChange={e => setCustomerName(e.target.value)}
                            />
                        </div>

                        <button
                            onClick={() => setStep('address')}
                            disabled={!customerName}
                            className="w-full py-4 bg-gradient-to-r from-rose-500 to-pink-500 text-white font-black rounded-2xl shadow-lg disabled:opacity-40 transition-all"
                        >
                            Continuar → Endereço de Entrega
                        </button>
                    </>
                )}

                {step === 'address' && (
                    <>
                        <div className="bg-white rounded-3xl shadow-sm p-5 space-y-3">
                            <div className="flex items-center gap-2 mb-2">
                                <MapPin className="text-rose-400" size={18} />
                                <h3 className="font-black text-gray-700 text-sm uppercase tracking-widest">Endereço de Entrega</h3>
                            </div>

                            {hasBag && (
                                <div className="bg-green-50 border border-green-200 rounded-2xl p-3 text-sm text-green-700 font-bold">
                                    ✅ Você já tem uma sacola aberta! O frete já foi pago no seu primeiro pedido.
                                </div>
                            )}

                            <div className="flex gap-2">
                                <input
                                    type="text"
                                    placeholder="CEP (apenas números)"
                                    maxLength={9}
                                    className="flex-1 p-4 bg-gray-50 rounded-2xl font-medium text-gray-700 focus:outline-none focus:ring-2 focus:ring-rose-300"
                                    value={cep}
                                    onChange={e => setCep(e.target.value.replace(/\D/g, '').slice(0, 8))}
                                />
                                <button
                                    onClick={fetchCep}
                                    disabled={cep.length < 8 || fetchingCep}
                                    className="px-4 py-4 bg-rose-500 text-white font-black rounded-2xl disabled:opacity-40"
                                >
                                    {fetchingCep ? <Loader2 className="animate-spin" size={18} /> : 'Buscar'}
                                </button>
                            </div>

                            {address.logradouro && (
                                <div className="bg-gray-50 rounded-2xl p-4 space-y-1">
                                    <p className="font-bold text-gray-700">{address.logradouro}</p>
                                    <p className="text-sm text-gray-500">{address.bairro} – {address.cidade}/{address.uf}</p>
                                </div>
                            )}
                        </div>

                        {freight !== null && (
                            <div className="bg-white rounded-3xl shadow-sm p-5 space-y-2">
                                <div className="flex justify-between text-sm font-bold text-gray-500">
                                    <span>Produto</span>
                                    <span>R$ {Number(product?.price || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
                                </div>
                                <div className="flex justify-between text-sm font-bold text-gray-500">
                                    <span>Frete</span>
                                    <span className={freight === 0 ? 'text-green-500' : ''}>
                                        {freight === 0 ? 'Grátis ✓' : `R$ ${freight.toFixed(2)}`}
                                    </span>
                                </div>
                                <div className="flex justify-between font-black text-gray-800 text-lg pt-2 border-t border-gray-100">
                                    <span>Total</span>
                                    <span className="text-rose-500">R$ {total.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
                                </div>
                            </div>
                        )}

                        <button
                            onClick={handlePayment}
                            disabled={!address.logradouro || freight === null || processing}
                            className="w-full py-4 bg-gradient-to-r from-rose-500 to-pink-500 text-white font-black rounded-2xl shadow-lg disabled:opacity-40 flex items-center justify-center gap-2"
                        >
                            {processing ? <Loader2 className="animate-spin" size={20} /> : <QrCode size={20} />}
                            {processing ? 'Gerando cobrança...' : 'Finalizar e Pagar'}
                        </button>
                    </>
                )}

                {step === 'payment' && paymentData && (
                    <div className="bg-white rounded-3xl shadow-sm p-6 text-center space-y-4">
                        <h3 className="font-black text-gray-700 text-lg">Pague com PIX</h3>
                        {paymentData.qrCode && (
                            <img
                                src={`data:image/png;base64,${paymentData.qrCode}`}
                                alt="QR Code PIX"
                                className="mx-auto w-52 h-52 rounded-2xl"
                            />
                        )}
                        {paymentData.qrCodePayload && (
                            <div className="space-y-2">
                                <p className="text-xs text-gray-400 font-bold uppercase tracking-widest">Ou copie o código:</p>
                                <button
                                    onClick={() => navigator.clipboard.writeText(paymentData.qrCodePayload!)}
                                    className="w-full p-3 bg-gray-50 rounded-2xl text-xs text-gray-500 font-mono break-all hover:bg-gray-100 transition"
                                >
                                    {paymentData.qrCodePayload.substring(0, 80)}...
                                    <span className="block mt-1 text-rose-500 font-bold not-italic">Copiar código completo</span>
                                </button>
                            </div>
                        )}
                        {paymentData.invoiceUrl && (
                            <a
                                href={paymentData.invoiceUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="block w-full py-3 bg-emerald-500 text-white font-black rounded-2xl"
                            >
                                Ver Fatura Completa (Cartão/Boleto tbm)
                            </a>
                        )}
                        <p className="text-xs text-gray-400">Após o pagamento, você receberá uma confirmação no WhatsApp.</p>
                    </div>
                )}
            </div>
        </div>
    );
}
