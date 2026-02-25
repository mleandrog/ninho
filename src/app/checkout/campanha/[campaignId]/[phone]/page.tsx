"use client";

import { useEffect, useState, use } from "react";
import { supabase } from "@/lib/supabase";
import { ShoppingBag, Truck, X, Package, Loader2, MapPin, Calculator, CheckCircle2, User, Clock, Copy, ExternalLink } from "lucide-react";
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
    const [alreadyCompleted, setAlreadyCompleted] = useState(false);
    const [isExpired, setIsExpired] = useState(false);
    const [pendingOrder, setPendingOrder] = useState<any>(null); // pedido criado mas não pago
    const [pixData, setPixData] = useState<{ qrCode?: string; qrCodePayload?: string; invoiceUrl?: string } | null>(null);
    const [copied, setCopied] = useState(false);
    const [customerName, setCustomerName] = useState('');
    const [cpf, setCpf] = useState('');

    const [deliveryType, setDeliveryType] = useState<'delivery' | 'sacola'>('sacola');
    const [paymentMethod, setPaymentMethod] = useState<'pix' | 'link'>('pix');
    const [address, setAddress] = useState({ street: '', number: '', neighborhood: '', city: '', complement: '' });
    const [settings, setSettings] = useState<any>(null);
    const [shippingFee, setShippingFee] = useState(0);
    const [calculating, setCalculating] = useState(false);

    const formatCpf = (value: string) => {
        const digits = value.replace(/\D/g, '').slice(0, 11);
        if (digits.length <= 3) return digits;
        if (digits.length <= 6) return `${digits.slice(0, 3)}.${digits.slice(3)}`;
        if (digits.length <= 9) return `${digits.slice(0, 3)}.${digits.slice(3, 6)}.${digits.slice(6)}`;
        return `${digits.slice(0, 3)}.${digits.slice(3, 6)}.${digits.slice(6, 9)}-${digits.slice(9)}`;
    };
    const cpfDigits = cpf.replace(/\D/g, '');
    const isCpfValid = cpfDigits.length === 11;
    const isFormValid = customerName.trim().length >= 3 && isCpfValid;

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

            if (!data || data.length === 0) {
                // Verificar se há itens expirados
                const { data: expiredItems } = await supabase
                    .from('priority_queue')
                    .select('id')
                    .eq('campaign_id', campaignId)
                    .eq('customer_phone', phone)
                    .in('status', ['expired', 'skipped'])
                    .limit(1);

                if (expiredItems && expiredItems.length > 0) {
                    setIsExpired(true);
                    setLoading(false);
                    return;
                }

                // Verificar se há itens completed
                const { data: completedItems } = await supabase
                    .from('priority_queue')
                    .select('id')
                    .eq('campaign_id', campaignId)
                    .eq('customer_phone', phone)
                    .eq('status', 'completed')
                    .limit(1);

                if (completedItems && completedItems.length > 0) {
                    // Verificar se há pedido com pagamento ainda pendente
                    const customerPhoneClean = phone.replace(/\D/g, '');
                    const { data: pendingOrders } = await supabase
                        .from('orders')
                        .select('id, order_number, total_amount, asaas_invoice_url, pix_qr_code, pix_payload, payment_method, payment_status')
                        .eq('customer_phone', phone)
                        .eq('payment_status', 'pending')
                        .order('created_at', { ascending: false })
                        .limit(1);

                    if (pendingOrders && pendingOrders.length > 0) {
                        // Tem pedido criado mas não pago — mostrar tela de pagamento
                        const order = pendingOrders[0];
                        setPendingOrder(order);
                        if (order.pix_qr_code || order.pix_payload) {
                            setPixData({
                                qrCode: order.pix_qr_code,
                                qrCodePayload: order.pix_payload,
                                invoiceUrl: order.asaas_invoice_url,
                            });
                        }
                    } else {
                        setAlreadyCompleted(true);
                    }
                }
            }
        }
        setLoading(false);
    };

    const removeItem = async (id: string) => {
        setItems(prev => prev.filter(item => item.id !== id));
        toast.success('Item removido do carrinho. Ele foi devolvido ao estoque para o próximo da fila.');
        try {
            await fetch('/api/checkout/campanha/remove', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ id })
            });
        } catch (e) {
            console.error('Erro ao devolver item para fila', e);
        }
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
                    customerName: customerName.trim(),
                    cpfCnpj: cpfDigits,
                    selectedItemIds: items.map(i => i.id),
                    deliveryType,
                    address: deliveryType === 'delivery' ? address : null,
                    shippingFee: deliveryType === 'delivery' ? shippingFee : 0,
                }),
            });

            const data = await res.json();
            if (!res.ok) throw new Error(data.error || 'Erro ao confirmar pedido.');

            // PIX: mostrar QR Code na tela
            if (data.payment?.type === 'pix' && (data.payment?.qrCode || data.payment?.qrCodePayload)) {
                toast.success('Pedido reservado! Agora finalize o pagamento via PIX. 💛');
                setPixData({
                    qrCode: data.payment.qrCode,
                    qrCodePayload: data.payment.qrCodePayload,
                    invoiceUrl: data.payment.invoiceUrl,
                });
                setPendingOrder({ order_number: data.orderNumber, total_amount: finalTotal });
                setItems([]);
                return;
            }

            // Outros métodos: redirecionar para link da fatura
            if (data.payment?.invoiceUrl) {
                toast.success('Pedido confirmado! Redirecionando para pagamento...');
                setTimeout(() => { window.location.replace(data.payment.invoiceUrl); }, 150);
                return;
            }

            // Asaas falhou mas pedido foi criado — mostrar tela de pendingOrder (nunca exibir erro ao cliente)
            toast.success('Pedido reservado! Conclua o pagamento. 💛');
            setPendingOrder({
                order_number: data.orderNumber,
                total_amount: finalTotal,
                asaas_invoice_url: data.payment?.invoiceUrl || null,
            });
            setItems([]);
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

    // Tela: PIX gerado — QR Code inline
    if (pixData) {
        return (
            <div className="min-h-screen bg-soft py-10 px-4">
                <div className="max-w-lg mx-auto">
                    <div className="text-center mb-8">
                        <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                            <CheckCircle2 className="w-8 h-8 text-green-500" />
                        </div>
                        <h1 className="text-3xl font-black text-gray-800">Pedido Reservado! 🎉</h1>
                        {pendingOrder?.order_number && (
                            <p className="text-gray-400 font-bold mt-1">Pedido #{pendingOrder.order_number}</p>
                        )}
                    </div>

                    <div className="bg-white rounded-3xl p-8 shadow-sm mb-4">
                        <h2 className="font-black text-gray-800 text-center mb-6 uppercase tracking-wider text-sm">Pague via PIX</h2>

                        {pixData.qrCode && (
                            <div className="flex justify-center mb-6">
                                <img
                                    src={`data:image/png;base64,${pixData.qrCode}`}
                                    alt="QR Code PIX"
                                    className="w-52 h-52 rounded-2xl border-4 border-primary/10"
                                />
                            </div>
                        )}

                        {pixData.qrCodePayload && (
                            <div className="space-y-3">
                                <p className="text-xs font-black text-gray-400 uppercase tracking-widest text-center">Código Copia e Cola</p>
                                <div className="bg-soft rounded-2xl p-4 flex items-center gap-3">
                                    <p className="text-xs text-gray-600 font-mono flex-1 break-all select-all">{pixData.qrCodePayload}</p>
                                    <button
                                        onClick={() => {
                                            navigator.clipboard.writeText(pixData!.qrCodePayload!);
                                            setCopied(true);
                                            setTimeout(() => setCopied(false), 2500);
                                        }}
                                        className="flex-shrink-0 p-3 bg-primary text-white rounded-xl hover:bg-primary/90 transition-all"
                                    >
                                        {copied ? <CheckCircle2 size={18} /> : <Copy size={18} />}
                                    </button>
                                </div>
                                {copied && <p className="text-center text-green-500 font-black text-sm">Código copiado! ✓</p>}
                            </div>
                        )}

                        {pixData.invoiceUrl && (
                            <a
                                href={pixData.invoiceUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="mt-6 flex items-center justify-center gap-2 text-primary font-bold text-sm hover:underline"
                            >
                                <ExternalLink size={16} /> Abrir fatura completa
                            </a>
                        )}
                    </div>

                    <p className="text-center text-xs text-gray-400 font-bold">
                        ⏳ O código PIX expira em breve. Pague agora para garantir seu produto!
                    </p>
                </div>
            </div>
        );
    }

    // Tela: Pedido expirado
    if (isExpired) {
        return (
            <div className="min-h-screen bg-soft flex items-center justify-center p-4">
                <div className="bg-white rounded-3xl p-10 max-w-sm w-full text-center shadow-premium">
                    <div className="w-16 h-16 bg-amber-100 rounded-full flex items-center justify-center mx-auto mb-4">
                        <Clock className="w-8 h-8 text-amber-500" />
                    </div>
                    <h2 className="text-2xl font-black text-gray-800 mb-3">Tempo Expirado ⏳</h2>
                    <p className="text-gray-500 font-medium text-sm leading-relaxed">
                        Infelizmente o tempo para finalizar este pedido expirou e os produtos foram liberados para outros clientes.
                    </p>
                    <p className="text-gray-400 font-bold text-sm mt-4">
                        Se ainda tiver interesse, entre em contato pelo WhatsApp e verifique a disponibilidade! 💛
                    </p>
                </div>
            </div>
        );
    }

    // Tela: Pedido pendente (retornou ao link sem ter pago)
    if (pendingOrder && !pixData) {
        return (
            <div className="min-h-screen bg-soft flex items-center justify-center p-4">
                <div className="bg-white rounded-3xl p-10 max-w-sm w-full text-center shadow-premium">
                    <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-4">
                        <ShoppingBag className="w-8 h-8 text-primary" />
                    </div>
                    <h2 className="text-2xl font-black text-gray-800 mb-2">Pedido #{pendingOrder.order_number}</h2>
                    <p className="text-gray-500 font-medium text-sm mb-6">
                        Seu pedido foi reservado mas o pagamento ainda não foi confirmado.
                    </p>
                    {pendingOrder.asaas_invoice_url && (
                        <a
                            href={pendingOrder.asaas_invoice_url}
                            className="block w-full py-4 bg-primary text-white font-black text-sm uppercase tracking-widest rounded-2xl hover:bg-primary/90 transition-all shadow-lg"
                        >
                            Ir para Pagamento →
                        </a>
                    )}
                    <p className="text-gray-400 font-bold text-xs mt-4">
                        Link de pagamento também foi enviado no seu WhatsApp.
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
                        alreadyCompleted ? (
                            <div className="bg-white rounded-3xl p-10 text-center">
                                <CheckCircle2 className="w-12 h-12 text-green-500 mx-auto mb-3" />
                                <p className="text-gray-700 font-black text-lg mb-2">Pedido já efetuado e pago! ✅</p>
                                <p className="text-gray-400 font-medium text-sm">
                                    Obrigado pela compra! Se precisar de ajuda, entre em contato pelo WhatsApp.
                                </p>
                            </div>
                        ) : (
                            <div className="bg-white rounded-3xl p-10 text-center">
                                <Package className="w-10 h-10 text-gray-300 mx-auto mb-3" />
                                <p className="text-gray-400 font-bold">Nenhum produto no carrinho</p>
                            </div>
                        )
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

                        {/* Dados Pessoais */}
                        <div className="bg-white rounded-3xl p-6 mb-6 shadow-sm space-y-4">
                            <div className="flex items-center gap-2">
                                <User className="text-primary" size={18} />
                                <h2 className="font-black text-gray-800 text-sm uppercase tracking-widest">Seus Dados</h2>
                            </div>
                            <input
                                type="text"
                                placeholder="Nome completo"
                                value={customerName}
                                onChange={e => setCustomerName(e.target.value)}
                                className="w-full px-4 py-3 rounded-2xl bg-soft border border-transparent focus:border-primary/30 focus:outline-none font-bold text-gray-700"
                            />
                            <input
                                type="text"
                                inputMode="numeric"
                                placeholder="CPF (000.000.000-00)"
                                value={cpf}
                                onChange={e => setCpf(formatCpf(e.target.value))}
                                className={`w-full px-4 py-3 rounded-2xl bg-soft border font-bold text-gray-700 focus:outline-none transition-colors ${cpf && !isCpfValid ? 'border-red-300 focus:border-red-400' : 'border-transparent focus:border-primary/30'
                                    }`}
                            />
                            {cpf && !isCpfValid && (
                                <p className="text-xs text-red-400 font-bold">CPF deve ter 11 dígitos</p>
                            )}
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
                            disabled={confirming || !isFormValid}
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
