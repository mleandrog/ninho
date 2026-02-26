"use client";

import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import { Button } from "@/components/ui/Button";
import { MapPin, Phone, CheckCircle, XCircle, LogOut, Navigation, Package, DollarSign, History, Loader2, WhatsApp } from "lucide-react";
import { toast } from "react-hot-toast";
import { clsx } from "clsx";

export default function DriverDashboard() {
    const [driver, setDriver] = useState<any>(null);
    const [activeDeliveries, setActiveDeliveries] = useState<any[]>([]);
    const [history, setHistory] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState<"entregas" | "historico">("entregas");

    useEffect(() => {
        loadDriverData();
    }, []);

    const loadDriverData = async () => {
        setLoading(true);
        try {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) {
                window.location.href = "/login";
                return;
            }

            // Busca o registro de entregador vinculado a este usuário
            const { data: driverData, error: dError } = await supabase
                .from("delivery_persons")
                .select("*")
                .eq("user_id", user.id)
                .single();

            if (dError || !driverData) {
                toast.error("Você não está cadastrado como entregador.");
                return;
            }

            setDriver(driverData);

            // Busca entregas ativas (shipped)
            const { data: deliveries } = await supabase
                .from("orders")
                .select("*")
                .eq("driver_id", driverData.id)
                .eq("delivery_status", "shipped")
                .order("created_at", { ascending: false });

            setActiveDeliveries(deliveries || []);

            // Busca histórico (delivered)
            const { data: delivered } = await supabase
                .from("orders")
                .select("*")
                .eq("driver_id", driverData.id)
                .eq("delivery_status", "delivered")
                .order("updated_at", { ascending: false });

            setHistory(delivered || []);

        } catch (error) {
            console.error(error);
        } finally {
            setLoading(false);
        }
    };

    const handleUpdateDelivery = async (orderId: string, status: 'delivered' | 'failed') => {
        const confirmMsg = status === 'delivered' ? "Marcar como entregue?" : "Marcar como falha na entrega?";
        if (!confirm(confirmMsg)) return;

        try {
            const { error } = await supabase
                .from("orders")
                .update({
                    delivery_status: status,
                    status: status === 'delivered' ? 'delivered' : 'shipped' // Se falhar volta para shipped ou fica aguardando
                })
                .eq("id", orderId);

            if (error) throw error;

            toast.success(status === 'delivered' ? "Entrega concluída! 🎉" : "Status atualizado.");
            loadDriverData();
        } catch (error) {
            toast.error("Erro ao atualizar entrega.");
        }
    };

    const openMaps = (address: any, mode: 'google' | 'waze') => {
        const addrStr = `${address.street}, ${address.number}, ${address.neighborhood}, ${address.city} - ${address.state}`;
        const encodedAddr = encodeURIComponent(addrStr);

        if (mode === 'google') {
            window.open(`https://www.google.com/maps/search/?api=1&query=${encodedAddr}`, '_blank');
        } else {
            window.open(`https://waze.com/ul?q=${encodedAddr}&navigate=yes`, '_blank');
        }
    };

    // Cálculos de Ganhos
    const calculateEarnings = (ordersList: any[]) => {
        if (!driver) return 0;
        return ordersList.reduce((acc, order) => {
            if (driver.commission_type === 'fixed') {
                return acc + Number(driver.commission_value);
            } else {
                return acc + (Number(order.delivery_cost || 0) * (Number(driver.commission_value) / 100));
            }
        }, 0);
    };

    if (loading) {
        return (
            <div className="min-h-screen flex flex-col items-center justify-center p-8 gap-4 bg-soft">
                <Loader2 className="animate-spin text-primary" size={48} />
                <p className="text-xs font-black text-gray-400 uppercase tracking-widest">Acessando painel do motorista...</p>
            </div>
        );
    }

    if (!driver) {
        return (
            <div className="min-h-screen flex flex-col items-center justify-center p-8 text-center bg-soft">
                <div className="w-24 h-24 bg-white rounded-full flex items-center justify-center text-4xl mb-6 shadow-sm">⚠️</div>
                <h2 className="text-2xl font-black text-muted-text lowercase">acesso negado</h2>
                <p className="text-gray-400 font-bold mt-2 max-w-xs">seu usuário não está vinculado a nenhum perfil de entregador ativo.</p>
                <Button onClick={() => window.location.href = "/"} className="mt-8">Voltar para Início</Button>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-soft pb-24">
            {/* Header do Motorista */}
            <header className="bg-white px-6 py-8 shadow-sm border-b border-gray-100 sticky top-0 z-20">
                <div className="flex justify-between items-center mb-6">
                    <div>
                        <h1 className="text-2xl font-black text-muted-text lowercase tracking-tighter">olá, {driver.full_name.split(' ')[0]}</h1>
                        <p className="text-[10px] font-black text-primary uppercase tracking-widest flex items-center gap-1">
                            <Truck size={12} /> Motorista {driver.active ? 'Disponível' : 'Off-line'}
                        </p>
                    </div>
                    <button
                        onClick={async () => {
                            await supabase.auth.signOut();
                            window.location.href = "/login";
                        }}
                        className="w-10 h-10 bg-soft text-gray-400 rounded-xl flex items-center justify-center hover:text-red-500 transition-colors"
                    >
                        <LogOut size={20} />
                    </button>
                </div>

                <div className="grid grid-cols-2 gap-4">
                    <div className="bg-primary/5 p-4 rounded-2xl border border-primary/10">
                        <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest mb-1 flex items-center gap-1">
                            <DollarSign size={10} className="text-primary" /> Saldo a Receber
                        </p>
                        <p className="text-lg font-black text-primary">
                            R$ {calculateEarnings(history).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                        </p>
                    </div>
                    <div className="bg-secondary/5 p-4 rounded-2xl border border-secondary/10">
                        <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest mb-1 flex items-center gap-1">
                            <Package size={10} className="text-secondary" /> Entregas Hoje
                        </p>
                        <p className="text-lg font-black text-secondary">{activeDeliveries.length}</p>
                    </div>
                </div>
            </header>

            {/* Dash Tabs */}
            <div className="p-6">
                <div className="flex bg-white p-1 rounded-2xl shadow-sm border border-gray-100 mb-8">
                    <button
                        onClick={() => setActiveTab("entregas")}
                        className={clsx(
                            "flex-1 py-3 rounded-xl font-black text-[10px] uppercase tracking-widest transition-all gap-2 flex items-center justify-center",
                            activeTab === "entregas" ? "bg-primary text-white shadow-md" : "text-gray-400"
                        )}
                    >
                        <Navigation size={14} /> Rotas Ativas
                    </button>
                    <button
                        onClick={() => setActiveTab("historico")}
                        className={clsx(
                            "flex-1 py-3 rounded-xl font-black text-[10px] uppercase tracking-widest transition-all gap-2 flex items-center justify-center",
                            activeTab === "historico" ? "bg-primary text-white shadow-md" : "text-gray-400"
                        )}
                    >
                        <History size={14} /> Histórico
                    </button>
                </div>

                {activeTab === "entregas" ? (
                    <div className="space-y-4">
                        {activeDeliveries.length === 0 ? (
                            <div className="bg-white p-12 rounded-[2.5rem] text-center border-2 border-dashed border-gray-200">
                                <p className="text-4xl mb-4">📭</p>
                                <p className="text-sm font-bold text-gray-400 lowercase">nenhuma entrega atribuída no momento.</p>
                            </div>
                        ) : (
                            activeDeliveries.map(order => (
                                <div key={order.id} className="bg-white rounded-[2.5rem] shadow-premium border border-white overflow-hidden animate-in slide-in-from-bottom-4">
                                    <div className="p-6">
                                        <div className="flex justify-between items-start mb-4">
                                            <div>
                                                <h3 className="font-black text-lg text-muted-text lowercase">{order.customer_name}</h3>
                                                <p className="text-[10px] font-bold text-gray-400">PEDIDO #{order.order_number || order.id.slice(0, 8)}</p>
                                            </div>
                                            <a
                                                href={`https://wa.me/55${order.customer_phone?.replace(/\D/g, '')}`}
                                                target="_blank"
                                                className="w-10 h-10 bg-green-50 text-green-500 rounded-xl flex items-center justify-center shadow-sm"
                                            >
                                                <Phone size={18} />
                                            </a>
                                        </div>

                                        <div className="bg-soft p-4 rounded-2xl mb-6 flex gap-3">
                                            <MapPin className="text-primary shrink-0" size={20} />
                                            <div>
                                                <p className="text-sm font-bold text-muted-text">
                                                    {order.delivery_address?.street}, {order.delivery_address?.number}
                                                </p>
                                                <p className="text-xs font-medium text-gray-400">
                                                    {order.delivery_address?.neighborhood}, {order.delivery_address?.city}
                                                </p>
                                                {order.delivery_address?.complement && (
                                                    <p className="text-[10px] font-black text-primary uppercase mt-1">Ref: {order.delivery_address.complement}</p>
                                                )}
                                            </div>
                                        </div>

                                        <div className="grid grid-cols-2 gap-3 mb-6">
                                            <button
                                                onClick={() => openMaps(order.delivery_address, 'google')}
                                                className="h-12 bg-white border border-gray-100 rounded-xl flex items-center justify-center gap-2 font-black text-[10px] uppercase tracking-widest text-gray-500 hover:bg-soft transition-colors shadow-sm"
                                            >
                                                Google Maps
                                            </button>
                                            <button
                                                onClick={() => openMaps(order.delivery_address, 'waze')}
                                                className="h-12 bg-[#33CCFF]/10 text-[#33CCFF] rounded-xl flex items-center justify-center gap-2 font-black text-[10px] uppercase tracking-widest hover:bg-[#33CCFF]/20 transition-colors shadow-sm"
                                            >
                                                Waze
                                            </button>
                                        </div>

                                        <div className="flex gap-3">
                                            <button
                                                onClick={() => handleUpdateDelivery(order.id, 'delivered')}
                                                className="flex-1 h-14 bg-primary text-white rounded-2xl font-black text-xs uppercase tracking-widest shadow-vibrant flex items-center justify-center gap-2"
                                            >
                                                <CheckCircle size={20} /> Concluir
                                            </button>
                                            <button
                                                onClick={() => handleUpdateDelivery(order.id, 'failed')}
                                                className="w-14 h-14 bg-red-50 text-red-400 rounded-2xl flex items-center justify-center hover:bg-red-100 transition-colors"
                                            >
                                                <XCircle size={24} />
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            ))
                        )}
                    </div>
                ) : (
                    <div className="space-y-3">
                        {history.length === 0 ? (
                            <p className="text-center py-12 text-gray-400 font-bold text-sm">Nenhum histórico disponível.</p>
                        ) : (
                            history.map(order => (
                                <div key={order.id} className="bg-white p-4 rounded-3xl shadow-sm border border-white flex justify-between items-center">
                                    <div className="flex items-center gap-3">
                                        <div className="w-10 h-10 bg-green-50 text-green-500 rounded-xl flex items-center justify-center">
                                            <CheckCircle size={18} />
                                        </div>
                                        <div>
                                            <p className="text-sm font-black text-muted-text lowercase">{order.customer_name}</p>
                                            <p className="text-[10px] font-bold text-gray-400">{new Date(order.updated_at).toLocaleDateString()}</p>
                                        </div>
                                    </div>
                                    <div className="text-right">
                                        <p className="text-xs font-black text-primary">
                                            + R$ {driver.commission_type === 'fixed'
                                                ? Number(driver.commission_value).toFixed(2)
                                                : ((Number(order.delivery_cost || 0) * (Number(driver.commission_value) / 100))).toFixed(2)}
                                        </p>
                                    </div>
                                </div>
                            ))
                        )}
                    </div>
                )}
            </div>
        </div>
    );
}
