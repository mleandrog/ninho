"use client";

import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import { Button } from "@/components/ui/Button";
import { Truck, MapPin, List, Save, ChevronRight, X, Loader2, Calendar as CalendarIcon, Map as MapIcon } from "lucide-react";
import { toast } from "react-hot-toast";
import { clsx } from "clsx";

export default function AdminRoutePlanning() {
    const [orders, setOrders] = useState<any[]>([]);
    const [drivers, setDrivers] = useState<any[]>([]);
    const [selectedOrders, setSelectedOrders] = useState<string[]>([]);
    const [selectedDriver, setSelectedDriver] = useState<string>("");
    const [loading, setLoading] = useState(false);
    const [saving, setSaving] = useState(false);

    useEffect(() => {
        fetchData();
    }, []);

    const fetchData = async () => {
        setLoading(true);
        try {
            // Busca pedidos pagos e pendentes de envio
            const { data: oData } = await supabase
                .from("orders")
                .select("*")
                .eq("status", "paid")
                .eq("delivery_status", "pending")
                .order("created_at", { ascending: true });

            // Busca motoristas ativos
            const { data: dData } = await supabase
                .from("delivery_persons")
                .select("*")
                .eq("active", true);

            setOrders(oData || []);
            setDrivers(dData || []);
        } catch (error) {
            console.error(error);
            toast.error("Erro ao carregar dados.");
        } finally {
            setLoading(false);
        }
    };

    const toggleOrderSelection = (id: string) => {
        setSelectedOrders(prev =>
            prev.includes(id) ? prev.filter(oid => oid !== id) : [...prev, id]
        );
    };

    const handleCreateRoute = async () => {
        if (!selectedDriver) return toast.error("Selecione um motorista.");
        if (selectedOrders.length === 0) return toast.error("Selecione ao menos um pedido.");

        setSaving(true);
        try {
            // Cria a rota
            const { data: route, error: rError } = await supabase
                .from("delivery_routes")
                .insert([{
                    driver_id: selectedDriver,
                    order_ids: selectedOrders,
                    status: 'planned'
                }])
                .select()
                .single();

            if (rError) throw rError;

            // Atualiza os pedidos com a rota e status de enviado
            const { error: oError } = await supabase
                .from("orders")
                .update({
                    delivery_route_id: route.id,
                    delivery_status: 'shipped',
                    driver_id: selectedDriver,
                    status: 'shipped'
                })
                .in("id", selectedOrders);

            if (oError) throw oError;

            toast.success("Rota criada e motorista notificado!");
            setSelectedOrders([]);
            setSelectedDriver("");
            fetchData();
        } catch (error) {
            console.error(error);
            toast.error("Erro ao criar rota.");
        } finally {
            setSaving(false);
        }
    };

    return (
        <div className="animate-in fade-in duration-500">
            <header className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 mb-12">
                <div>
                    <h1 className="text-4xl font-black text-muted-text lowercase tracking-tighter">Planejamento de Rotas</h1>
                    <p className="text-gray-400 font-bold mt-1 text-sm">Organize as entregas do dia e otimize o trajeto</p>
                </div>
            </header>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Coluna de Pedidos Pendentes */}
                <div className="lg:col-span-2 space-y-6">
                    <div className="flex justify-between items-center px-4">
                        <h2 className="text-xs font-black text-gray-400 uppercase tracking-widest flex items-center gap-2">
                            <List size={14} /> Pedidos Disponíveis ({orders.length})
                        </h2>
                        {selectedOrders.length > 0 && (
                            <span className="text-[10px] font-black bg-primary text-white px-3 py-1 rounded-full uppercase tracking-widest animate-bounce">
                                {selectedOrders.length} selecionados
                            </span>
                        )}
                    </div>

                    {loading ? (
                        <div className="py-20 flex flex-col items-center justify-center gap-4 bg-white/50 rounded-[2.5rem] border-4 border-dashed border-soft">
                            <Loader2 className="animate-spin text-primary" size={32} />
                            <p className="text-xs font-black text-gray-400 uppercase tracking-widest">Buscando entregas...</p>
                        </div>
                    ) : orders.length === 0 ? (
                        <div className="py-20 text-center bg-white/50 rounded-[2.5rem] border-4 border-dashed border-soft">
                            <div className="text-4xl mb-4">✨</div>
                            <h3 className="text-xl font-black text-muted-text opacity-50 lowercase">tudo entregue por aqui</h3>
                            <p className="text-gray-400 font-bold mt-1 text-sm">novos pedidos pagos aparecerão automaticamente</p>
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            {orders.map(order => (
                                <div
                                    key={order.id}
                                    onClick={() => toggleOrderSelection(order.id)}
                                    className={clsx(
                                        "p-6 rounded-3xl border transition-all cursor-pointer group",
                                        selectedOrders.includes(order.id)
                                            ? "bg-primary border-primary shadow-vibrant scale-[0.98]"
                                            : "bg-white border-white shadow-premium hover:border-primary/20"
                                    )}
                                >
                                    <div className="flex justify-between items-start mb-4">
                                        <span className={clsx(
                                            "text-[10px] font-black px-3 py-1 rounded-full uppercase tracking-widest",
                                            selectedOrders.includes(order.id) ? "bg-white/20 text-white" : "bg-soft text-gray-400"
                                        )}>
                                            #{order.order_number || order.id.slice(0, 8)}
                                        </span>
                                        <div className={clsx(
                                            "w-6 h-6 rounded-full border-2 flex items-center justify-center transition-all",
                                            selectedOrders.includes(order.id) ? "bg-white border-white scale-110" : "border-soft"
                                        )}>
                                            {selectedOrders.includes(order.id) && <ChevronRight size={14} className="text-primary" />}
                                        </div>
                                    </div>

                                    <h4 className={clsx(
                                        "font-black text-lg lowercase",
                                        selectedOrders.includes(order.id) ? "text-white" : "text-muted-text"
                                    )}>
                                        {order.customer_name}
                                    </h4>

                                    <div className="mt-4 space-y-2">
                                        <div className={clsx(
                                            "flex items-center gap-2 text-xs font-bold",
                                            selectedOrders.includes(order.id) ? "text-white/80" : "text-gray-400"
                                        )}>
                                            <MapPin size={12} /> {order.delivery_address?.neighborhood || 'N/A'} - {order.delivery_address?.city || 'N/A'}
                                        </div>
                                        <div className={clsx(
                                            "flex items-center gap-2 text-xs font-black",
                                            selectedOrders.includes(order.id) ? "text-white" : "text-primary"
                                        )}>
                                            Total: R$ {Number(order.total_amount).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                {/* Configuração da Rota */}
                <div className="space-y-6">
                    <h2 className="text-xs font-black text-gray-400 uppercase tracking-widest flex items-center gap-2 px-4">
                        <Truck size={14} /> Atribuir Motorista
                    </h2>

                    <div className="bg-white p-8 rounded-[2.5rem] shadow-premium border border-white space-y-8">
                        <div className="space-y-4">
                            <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest px-2">Selecione o Entregador</label>
                            <div className="grid grid-cols-1 gap-3">
                                {drivers.map(driver => (
                                    <button
                                        key={driver.id}
                                        onClick={() => setSelectedDriver(driver.id)}
                                        className={clsx(
                                            "w-full p-4 rounded-2xl border text-left transition-all flex items-center justify-between",
                                            selectedDriver === driver.id
                                                ? "bg-secondary/10 border-secondary ring-2 ring-secondary/20"
                                                : "bg-soft border-transparent hover:border-gray-200"
                                        )}
                                    >
                                        <div className="flex items-center gap-3">
                                            <div className="w-10 h-10 bg-white rounded-xl flex items-center justify-center text-xl">
                                                🚛
                                            </div>
                                            <div>
                                                <p className="font-black text-muted-text text-sm lowercase">{driver.full_name}</p>
                                                <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">{driver.area_coverage || 'Geral'}</p>
                                            </div>
                                        </div>
                                        {selectedDriver === driver.id && <div className="w-4 h-4 rounded-full bg-secondary shadow-sm" />}
                                    </button>
                                ))}
                                {drivers.length === 0 && (
                                    <p className="text-center py-4 text-xs font-bold text-gray-400 lowercase">nenhum motorista disponível</p>
                                )}
                            </div>
                        </div>

                        <div className="pt-8 border-t border-soft space-y-6">
                            <div className="flex justify-between items-center font-black">
                                <span className="text-gray-400 uppercase text-[10px] tracking-widest">Resumo da Rota</span>
                                <span className="text-muted-text">{selectedOrders.length} entregas</span>
                            </div>

                            <Button
                                onClick={handleCreateRoute}
                                disabled={saving || !selectedDriver || selectedOrders.length === 0}
                                className="w-full h-16 rounded-3xl shadow-vibrant font-black text-lg gap-3"
                            >
                                {saving ? <Loader2 className="animate-spin" size={24} /> : <Save size={24} />}
                                Gerar Rota Agora
                            </Button>

                            <p className="text-[10px] text-center font-bold text-gray-400 lowercase italic">
                                ao gerar a rota, os pedidos mudarão para status "enviado" e o motorista poderá visualizá-los em seu painel.
                            </p>
                        </div>
                    </div>

                    {/* Dica */}
                    <div className="bg-primary/5 p-6 rounded-[2rem] border border-primary/10 flex gap-4">
                        <MapIcon className="text-primary shrink-0" size={24} />
                        <div className="space-y-1">
                            <p className="text-xs font-black text-primary uppercase tracking-widest">Dica de Logística</p>
                            <p className="text-[11px] font-bold text-primary/80 leading-relaxed">
                                Selecione pedidos do mesmo bairro para otimizar o tempo do seu entregador. Em breve: roteirização automática por distância!
                            </p>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
