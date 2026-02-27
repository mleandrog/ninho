"use client";

import { useEffect, useState, useMemo } from "react";
import { supabase } from "@/lib/supabase";
import { toast } from "react-hot-toast";
import {
    Clock, CheckCircle, Truck, AlertCircle, Eye,
    RefreshCcw, Search, Filter, X, ShoppingBag, User, Calendar as CalendarIcon, MessageSquare,
    ChevronDown, Loader2
} from "lucide-react";
import { clsx } from "clsx";

const STATUS_CONFIG: Record<string, { label: string; icon: any; color: string }> = {
    pending: { label: "Pendente", icon: Clock, color: "text-yellow-600 bg-yellow-50" },
    paid: { label: "Pago", icon: CheckCircle, color: "text-green-600 bg-green-50" },
    shipped: { label: "Enviado", icon: Truck, color: "text-blue-600 bg-blue-50" },
    delivered: { label: "Entregue", icon: CheckCircle, color: "text-primary bg-primary/10" },
    canceled: { label: "Cancelado", icon: AlertCircle, color: "text-red-600 bg-red-50" },
};

type TabType = "pedidos" | "sacolas";

export default function AdminOrdersPage() {
    const [activeTab, setActiveTab] = useState<TabType>("pedidos");
    const [orders, setOrders] = useState<any[]>([]);
    const [bags, setBags] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [selectedBag, setSelectedBag] = useState<any>(null);
    const [selectedOrder, setSelectedOrder] = useState<any>(null);

    // Filtros
    const [search, setSearch] = useState("");
    const [filterStatus, setFilterStatus] = useState("");
    const [filterFrom, setFilterFrom] = useState("");
    const [filterTo, setFilterTo] = useState("");

    useEffect(() => {
        if (activeTab === "pedidos") fetchOrders();
        else fetchBags();
    }, [activeTab]);

    const fetchOrders = async () => {
        setLoading(true);
        try {
            const { data, error } = await supabase
                .from("orders")
                .select("*, profiles:customer_id(full_name)")
                .order("created_at", { ascending: false });
            if (error) throw error;
            setOrders(data || []);
        } catch (err: any) {
            toast.error("Erro ao carregar pedidos: " + err.message);
        } finally {
            setLoading(false);
        }
    };

    const fetchBags = async () => {
        setLoading(true);
        try {
            // Busca sacolas (carrinhos que não viraram pedido ainda ou estão ativos)
            const { data, error } = await supabase
                .from("bags")
                .select(`
    *,
    profiles: customer_id(full_name),
        bag_items(
                        *,
            product: product_id(name, image_url, price)
        )
            `)
                .order("created_at", { ascending: false });
            if (error) throw error;
            setBags(data || []);
        } catch (err: any) {
            toast.error("Erro ao carregar sacolas: " + err.message);
        } finally {
            setLoading(false);
        }
    };

    const updateStatus = async (id: string, newStatus: string) => {
        try {
            if (newStatus === 'canceled') {
                const res = await fetch("/api/admin/orders/cancel", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ orderId: id }),
                });
                if (!res.ok) {
                    const data = await res.json();
                    throw new Error(data.error || "Erro ao cancelar pedido");
                }
            } else {
                const { error } = await supabase.from("orders").update({ status: newStatus }).eq("id", id);
                if (error) throw error;
            }

            toast.success(newStatus === 'canceled' ? "Pedido cancelado e estoque devolvido!" : "Status atualizado!");
            setOrders(prev => prev.map(o => o.id === id ? { ...o, status: newStatus } : o));
        } catch (err: any) {
            toast.error("Erro ao atualizar: " + err.message);
        }
    };

    const handleResendInvoice = async (orderId: string) => {
        const toastId = toast.loading("Reenviando fatura...");
        try {
            const res = await fetch("/api/admin/resend-invoice", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ orderId }),
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data.error || "Erro ao reenviar");
            toast.success("Fatura reenviada com sucesso!", { id: toastId });
        } catch (err: any) {
            toast.error(err.message, { id: toastId });
        }
    };

    const clearFilters = () => {
        setSearch("");
        setFilterStatus("");
        setFilterFrom("");
        setFilterTo("");
    };

    const handleViewOrderDetails = async (order: any) => {
        const toastId = toast.loading("Carregando detalhes...");
        try {
            const { data, error } = await supabase
                .from("order_items")
                .select(`
                    *,
                    product: product_id(name, image_url, price)
                `)
                .eq("order_id", order.id);

            if (error) throw error;

            setSelectedOrder({
                ...order,
                items: data || []
            });
            toast.dismiss(toastId);
        } catch (err: any) {
            toast.error("Erro ao carregar itens: " + err.message, { id: toastId });
        }
    };

    const filtered = useMemo(() => {
        const source = activeTab === "pedidos" ? orders : bags;
        return source.filter(item => {
            const name = (item.profiles?.full_name || item.customer_name || "").toLowerCase();
            const num = activeTab === "pedidos"
                ? (item.order_number || item.id.slice(0, 8)).toLowerCase()
                : (item.customer_phone || "").toLowerCase();
            const created = new Date(item.created_at);

            if (search && !name.includes(search.toLowerCase()) && !num.includes(search.toLowerCase())) return false;
            if (activeTab === "pedidos" && filterStatus && item.status !== filterStatus) return false;
            if (filterFrom && created < new Date(filterFrom)) return false;
            if (filterTo) {
                const to = new Date(filterTo);
                to.setHours(23, 59, 59);
                if (created > to) return false;
            }
            return true;
        });
    }, [orders, bags, activeTab, search, filterStatus, filterFrom, filterTo]);

    const bagOrdersPendingCount = useMemo(() => {
        return orders.filter(o => o.order_number?.startsWith('BAG') && o.status === 'paid').length;
    }, [orders]);

    const hasFilters = search || filterStatus || filterFrom || filterTo;

    return (
        <div className="flex flex-col flex-1 animate-in fade-in duration-500">
            {/* Header - Mais compacto */}
            <header className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4 sm:gap-6 mb-6 sm:mb-8 lg:mb-10">
                <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4 sm:gap-6 w-full lg:w-auto">
                    <div>
                        <h1 className="text-2xl sm:text-3xl lg:text-4xl font-black text-muted-text lowercase tracking-tighter">
                            {activeTab === "pedidos" ? "Vendas" : "Carrinhos"}
                        </h1>
                        <p className="text-[9px] sm:text-xs lg:text-sm text-gray-400 font-bold mt-0.5 uppercase tracking-widest leading-tight">
                            {activeTab === "pedidos" ? "Gestão de Pedidos" : "Sacolas em Aberto"}
                            {activeTab === "pedidos" && bagOrdersPendingCount > 0 && (
                                <span className="inline-flex items-center gap-1 sm:gap-1.5 px-2 sm:px-3 py-0.5 sm:py-1 bg-purple-50 text-purple-600 rounded-full text-[8px] sm:text-[9px] lg:text-[10px] font-black uppercase tracking-widest mt-1 sm:mt-2 animate-bounce">
                                    <ShoppingBag size={10} className="w-2 h-2 sm:w-2.5 sm:h-2.5" />
                                    {bagOrdersPendingCount} prontas para envio
                                </span>
                            )}
                        </p>
                    </div>

                    {/* Tabs - Compacto */}
                    <div className="flex bg-white p-1 rounded-xl sm:rounded-2xl lg:rounded-[2rem] shadow-premium border border-white gap-0.5 sm:gap-1 transition-all w-full sm:w-auto overflow-x-auto scrol-hide">
                        {[
                            { id: "pedidos", label: "Pedidos", icon: Truck },
                            { id: "sacolas", label: "Sacolas", icon: ShoppingBag }
                        ].map((tab) => (
                            <button
                                key={tab.id}
                                onClick={() => setActiveTab(tab.id as TabType)}
                                className={clsx(
                                    "px-3 sm:px-6 lg:px-8 py-2 sm:py-3 rounded-lg sm:rounded-xl lg:rounded-[1.5rem] flex items-center justify-center gap-2 lg:gap-3 transition-all font-black text-[9px] sm:text-[10px] lg:text-xs uppercase tracking-widest flex-1 sm:flex-none whitespace-nowrap",
                                    activeTab === tab.id
                                        ? "bg-primary text-white shadow-lg"
                                        : "text-gray-400 hover:text-muted-text hover:bg-soft"
                                )}
                            >
                                <tab.icon size={14} className="sm:w-4 sm:h-4" />
                                {tab.label}
                            </button>
                        ))}
                    </div>
                </div>
                <button
                    onClick={activeTab === "pedidos" ? fetchOrders : fetchBags}
                    className="p-4 bg-white rounded-2xl shadow-premium border border-white text-gray-400 hover:text-primary transition-colors hidden lg:block"
                >
                    <RefreshCcw size={20} className={loading ? "animate-spin" : ""} />
                </button>
            </header>

            {/* Filtros - Ultra compacto */}
            <div className="bg-white p-3 sm:p-4 lg:p-6 rounded-xl sm:rounded-2xl lg:rounded-[2.5rem] shadow-premium border border-white mb-4 sm:mb-6 lg:mb-8">
                <div className="grid grid-cols-1 md:flex md:flex-row gap-2 lg:gap-4 items-stretch lg:items-center">
                    {/* Busca */}
                    <div className="relative flex-1">
                        <Search size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
                        <input
                            type="text"
                            placeholder={activeTab === "pedidos" ? "Buscar..." : "Nome no WhatsApp..."}
                            className="w-full pl-9 pr-4 py-2 sm:py-2.5 lg:py-3 bg-soft rounded-lg sm:rounded-xl lg:rounded-2xl border-none font-bold text-[10px] sm:text-xs lg:text-sm outline-none"
                            value={search}
                            onChange={e => setSearch(e.target.value)}
                        />
                    </div>

                    <div className="flex items-center gap-2">
                        {/* Status (Só para Pedidos) */}
                        {activeTab === "pedidos" && (
                            <div className="relative flex-1 md:flex-none">
                                <Filter size={12} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
                                <select
                                    className="w-full pl-8 pr-7 py-2 sm:py-2.5 lg:py-3 bg-soft rounded-lg sm:rounded-xl lg:rounded-2xl border-none font-black text-[8.5px] sm:text-[10px] lg:text-sm uppercase tracking-wide outline-none appearance-none cursor-pointer min-w-[90px] lg:min-w-[150px]"
                                    value={filterStatus}
                                    onChange={e => setFilterStatus(e.target.value)}
                                >
                                    <option value="">Status</option>
                                    {Object.entries(STATUS_CONFIG).map(([key, cfg]) => (
                                        <option key={key} value={key}>{cfg.label}</option>
                                    ))}
                                </select>
                                <ChevronDown size={12} className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
                            </div>
                        )}

                        {/* Data */}
                        <div className="flex items-center gap-1 lg:gap-2 bg-soft px-2.5 sm:px-3 lg:px-4 py-2 sm:py-2.5 lg:py-1.5 rounded-lg sm:rounded-xl lg:rounded-2xl flex-[1.5] md:flex-none overflow-hidden h-9 sm:h-10 lg:h-auto">
                            <CalendarIcon size={12} className="text-gray-400 shrink-0" />
                            <input
                                type="date"
                                className="bg-transparent border-none font-bold text-[8.5px] sm:text-[10px] lg:text-xs outline-none w-full tabular-nums"
                                value={filterFrom}
                                onChange={e => setFilterFrom(e.target.value)}
                            />
                            <div className="w-1 h-px bg-gray-300 mx-0.5 shrink-0" />
                            <input
                                type="date"
                                className="bg-transparent border-none font-bold text-[8.5px] sm:text-[10px] lg:text-xs outline-none w-full tabular-nums"
                                value={filterTo}
                                onChange={e => setFilterTo(e.target.value)}
                            />
                        </div>

                        {/* Clear */}
                        {hasFilters && (
                            <button
                                onClick={clearFilters}
                                className="h-9 sm:h-10 lg:h-12 w-9 sm:w-10 lg:w-12 flex items-center justify-center rounded-lg sm:rounded-xl lg:rounded-2xl bg-red-50 text-red-400 hover:bg-red-100 transition-all shrink-0"
                            >
                                <X size={16} />
                            </button>
                        )}
                    </div>
                </div>
            </div>

            {/* Conteúdo */}
            <div className="space-y-4">
                {loading ? (
                    <div className="bg-white p-12 lg:p-20 rounded-2xl lg:rounded-[3rem] flex flex-col justify-center items-center shadow-premium gap-4">
                        <Loader2 className="w-10 h-10 text-primary animate-spin" />
                        <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Carregando dados...</span>
                    </div>
                ) : filtered.length === 0 ? (
                    <div className="bg-white p-12 lg:p-20 rounded-2xl lg:rounded-[3rem] flex flex-col items-center justify-center text-center shadow-premium border border-white">
                        <div className="w-16 lg:w-20 h-16 lg:h-20 bg-soft rounded-2xl lg:rounded-[2rem] flex items-center justify-center mb-6">
                            {activeTab === "pedidos" ? <Truck size={32} className="text-gray-300" /> : <ShoppingBag size={32} className="text-gray-300" />}
                        </div>
                        <h3 className="text-lg lg:text-xl font-black text-muted-text mb-2 text-lowercase tracking-tighter">
                            {hasFilters ? "Nenhum resultado" : (activeTab === "pedidos" ? "Sem pedidos ainda" : "Nenhuma sacola aberta")}
                        </h3>
                    </div>
                ) : (
                    <div className="bg-white rounded-2xl lg:rounded-[2.5rem] shadow-premium border border-white overflow-hidden">
                        {/* Desktop Header */}
                        <div className="hidden lg:grid grid-cols-[3rem_1.5fr_1.5fr_1fr_1fr_auto] gap-6 px-8 py-3 border-b border-gray-50 bg-soft/50">
                            <div />
                            <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">{activeTab === "pedidos" ? "Pedido" : "WhatsApp"}</span>
                            <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Cliente</span>
                            <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Data</span>
                            <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Total</span>
                            <div />
                        </div>

                        <div className="divide-y divide-gray-50">
                            {filtered.map(item => {
                                const status = activeTab === "pedidos" ? (STATUS_CONFIG[item.status] || STATUS_CONFIG.pending) : null;
                                const Icon = status?.icon || ShoppingBag;

                                return (
                                    <div
                                        key={item.id}
                                        className="dense-row group lg:grid lg:grid-cols-[3rem_1.5fr_1.5fr_1fr_1fr_auto] lg:gap-6 lg:py-4 lg:px-8 border-b border-gray-50 last:border-0"
                                    >
                                        <div className="hidden lg:flex items-center justify-center">
                                            <div className={clsx(
                                                "w-10 h-10 rounded-xl flex items-center justify-center",
                                                status ? status.color : "bg-soft text-gray-400"
                                            )}>
                                                <Icon size={18} />
                                            </div>
                                        </div>

                                        <div className="flex-1 lg:flex-none min-w-0">
                                            <div className="flex items-center gap-2 lg:hidden mb-0.5">
                                                <div className={clsx(
                                                    "w-5 h-5 rounded-lg flex items-center justify-center shrink-0",
                                                    status ? status.color : "bg-soft text-gray-400"
                                                )}>
                                                    <Icon size={10} />
                                                </div>
                                                <span className="text-[8px] font-black text-gray-300 uppercase tracking-widest truncate">
                                                    #{item.id.slice(0, 8).toUpperCase()}
                                                </span>
                                            </div>
                                            <div className="flex items-center gap-1.5">
                                                <span className="font-black text-muted-text text-[11px] sm:text-sm lg:text-base truncate leading-tight">
                                                    {activeTab === "pedidos"
                                                        ? (item.order_number || `#${item.id.slice(0, 8).toUpperCase()}`)
                                                        : (item.customer_phone || "Sem número")}
                                                </span>
                                                {activeTab === "pedidos" && item.order_number?.startsWith('BAG') && (
                                                    <span className="px-1 py-0.5 bg-purple-50 text-purple-600 text-[7px] font-black rounded-md uppercase tracking-widest border border-purple-100 leading-none">
                                                        Sacola
                                                    </span>
                                                )}
                                            </div>
                                        </div>

                                        <div className="flex-1 lg:flex-none flex items-center gap-1.5 min-w-0">
                                            <div className="hidden lg:flex w-8 h-8 rounded-full bg-soft items-center justify-center text-gray-400 shrink-0">
                                                <User size={14} />
                                            </div>
                                            <span className="font-bold text-[10px] sm:text-xs lg:text-sm text-gray-400 truncate leading-tight">
                                                {item.profiles?.full_name || item.customer_name || "Desconhecido"}
                                            </span>
                                        </div>

                                        <div className="hidden lg:flex flex-col">
                                            <span className="text-xs font-black text-muted-text">{new Date(item.created_at).toLocaleDateString("pt-BR")}</span>
                                            <span className="text-[10px] font-bold text-gray-300">
                                                {new Date(item.created_at).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}
                                            </span>
                                        </div>

                                        <div className="text-right flex flex-col items-end">
                                            <span className="font-black text-muted-text text-xs sm:text-sm lg:text-lg leading-tight">
                                                R$ {Number(item.total_amount || 0).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
                                            </span>
                                            <div className="lg:hidden text-[7.5px] font-bold text-gray-300 uppercase tracking-widest leading-none mt-0.5">
                                                {new Date(item.created_at).toLocaleDateString("pt-BR")}
                                            </div>
                                        </div>

                                        <div className="flex items-center gap-1 sm:gap-2 lg:gap-3 shrink-0 ml-2">
                                            <div className="flex items-center gap-2">
                                                {activeTab === "pedidos" ? (
                                                    <select
                                                        value={item.status}
                                                        onChange={e => updateStatus(item.id, e.target.value)}
                                                        className="px-1.5 py-1.5 lg:px-4 lg:py-2 bg-soft rounded-lg lg:rounded-xl border-none text-[7.5px] sm:text-[9px] lg:text-[10px] font-black uppercase text-gray-500 outline-none cursor-pointer tracking-widest max-w-[70px] sm:max-w-none"
                                                    >
                                                        {Object.entries(STATUS_CONFIG).map(([key, cfg]) => (
                                                            <option key={key} value={key}>{cfg.label}</option>
                                                        ))}
                                                    </select>
                                                ) : (
                                                    <div className="hidden sm:block px-3 py-1.5 bg-primary/5 rounded-lg text-[9px] font-black uppercase text-primary tracking-widest">
                                                        Ativa
                                                    </div>
                                                )}
                                            </div>

                                            {activeTab === "pedidos" && item.status === "pending" && (item.asaas_invoice_url || item.pix_payload) && (
                                                <button
                                                    onClick={() => handleResendInvoice(item.id)}
                                                    className="w-7 h-7 sm:w-8 sm:h-8 lg:w-10 lg:h-10 rounded-lg lg:rounded-xl bg-green-50 text-green-600 hover:bg-green-100 flex items-center justify-center transition-all shrink-0"
                                                >
                                                    <MessageSquare size={12} className="sm:w-3.5 sm:h-3.5" />
                                                </button>
                                            )}

                                            <button
                                                onClick={() => activeTab === 'sacolas' ? setSelectedBag(item) : handleViewOrderDetails(item)}
                                                className="w-7 h-7 sm:w-8 sm:h-8 lg:w-10 lg:h-10 rounded-lg lg:rounded-xl bg-soft text-gray-400 hover:text-primary hover:bg-primary/5 flex items-center justify-center transition-all shrink-0"
                                            >
                                                <Eye size={12} className="sm:w-3.5 sm:h-3.5" />
                                            </button>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                )}
            </div>

            {/* Modal de Detalhes da Sacola */}
            {selectedBag && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-0 lg:p-4 bg-muted-text/40 backdrop-blur-sm animate-in fade-in duration-200">
                    <div className="bg-white w-full max-w-2xl lg:rounded-[3rem] shadow-premium overflow-hidden border border-white flex flex-col h-full lg:h-auto lg:max-h-[90vh]">

                        <div className="p-6 lg:p-8 border-b border-gray-100 flex justify-between items-center bg-soft sticky top-0 z-10">
                            <div>
                                <h2 className="text-xl lg:text-2xl font-black text-muted-text flex items-center gap-3">
                                    <ShoppingBag className="text-primary" size={24} />
                                    <span>Sacola #{selectedBag.id.slice(0, 8)}</span>
                                </h2>
                                <p className="text-xs lg:text-sm font-bold text-gray-400 mt-1">
                                    Cliente: <span className="text-muted-text">{selectedBag.profiles?.full_name || selectedBag.customer_name || 'Desconhecido'}</span>
                                </p>
                            </div>
                            <button
                                onClick={() => setSelectedBag(null)}
                                className="w-10 h-10 lg:w-12 lg:h-12 rounded-xl lg:rounded-2xl bg-white text-gray-400 hover:text-muted-text hover:shadow-sm flex items-center justify-center transition-all border border-gray-100"
                            >
                                <X size={24} />
                            </button>
                        </div>

                        <div className="p-6 lg:p-8 overflow-y-auto space-y-6 flex-1">
                            {/* Resumo */}
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                <div className="bg-soft p-5 rounded-2xl lg:rounded-[2rem]">
                                    <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">Criação / Expiração</p>
                                    <p className="text-sm font-bold text-muted-text">Criada em: {new Date(selectedBag.created_at).toLocaleDateString("pt-BR")}</p>
                                    <p className="text-sm font-bold text-red-500 mt-1">Expira em: {selectedBag.expires_at ? new Date(selectedBag.expires_at).toLocaleDateString("pt-BR") : 'Não definido'}</p>
                                </div>
                                <div className="bg-primary/5 p-5 rounded-2xl lg:rounded-[2rem] border border-primary/10">
                                    <p className="text-[10px] font-black text-primary uppercase tracking-widest mb-1">Total da Sacola</p>
                                    <p className="text-xl lg:text-2xl font-black text-primary">
                                        R$ {Number(selectedBag.total_amount || 0).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
                                    </p>
                                </div>
                            </div>

                            {/* Itens */}
                            <div className="space-y-4">
                                <h3 className="text-sm font-black text-gray-400 uppercase tracking-widest px-2">Itens Guardados</h3>
                                <div className="space-y-3">
                                    {selectedBag.bag_items?.map((biItem: any) => (
                                        <div key={biItem.id} className="flex gap-4 p-4 rounded-2xl border border-gray-100 items-center bg-white">
                                            <div className="w-14 h-14 lg:w-16 lg:h-16 rounded-xl bg-soft overflow-hidden shrink-0">
                                                {biItem.product?.image_url ? (
                                                    <img src={biItem.product.image_url} alt={biItem.product.name} className="w-full h-full object-cover" />
                                                ) : (
                                                    <div className="w-full h-full flex items-center justify-center text-gray-300">
                                                        <ShoppingBag size={20} />
                                                    </div>
                                                )}
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <h4 className="font-bold text-xs lg:text-sm text-muted-text truncate">{biItem.product?.name || "Produto Removido"}</h4>
                                                <p className="text-[10px] font-bold text-gray-400">Qtd: {biItem.quantity}x</p>
                                            </div>
                                            <div className="text-right">
                                                <span className="font-black text-primary text-sm">
                                                    R$ {Number(biItem.product?.price || 0).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
                                                </span>
                                            </div>
                                        </div>
                                    ))}
                                    {(!selectedBag.bag_items || selectedBag.bag_items.length === 0) && (
                                        <div className="text-center p-8 bg-soft rounded-2xl text-sm font-bold text-gray-400">
                                            Nenhum item encontrado nesta sacola.
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>

                        <div className="p-6 lg:p-8 bg-gray-50 border-t border-gray-100 flex flex-col sm:flex-row justify-between gap-4 sticky bottom-0 z-10">
                            <button
                                className="px-6 py-4 rounded-2xl font-black text-xs lg:text-sm uppercase tracking-widest text-red-500 bg-red-50 hover:bg-red-100 transition-colors w-full sm:w-auto disabled:opacity-50"
                                onClick={async () => {
                                    if (confirm("Deseja expirar esta sacola agora? Os produtos voltarão ao estoque.")) {
                                        const toastId = toast.loading("Expirando sacola...");
                                        try {
                                            const res = await fetch("/api/admin/bags/expire", {
                                                method: "POST",
                                                headers: { "Content-Type": "application/json" },
                                                body: JSON.stringify({ bagId: selectedBag.id }),
                                            });
                                            if (!res.ok) throw new Error("Erro ao expirar sacola");

                                            toast.success("Sacola expirada e estoque devolvido!", { id: toastId });
                                            setBags(prev => prev.map(b => b.id === selectedBag.id ? { ...b, status: 'expired' } : b));
                                            setSelectedBag(null);
                                        } catch (err: any) {
                                            toast.error(err.message, { id: toastId });
                                        }
                                    }
                                }}
                            >
                                Expirar e Devolver
                            </button>
                            <button
                                onClick={() => setSelectedBag(null)}
                                className="px-8 py-4 rounded-2xl font-black text-xs lg:text-sm uppercase tracking-widest bg-gray-200 text-gray-500 hover:bg-gray-300 transition-colors w-full sm:w-auto"
                            >
                                Fechar
                            </button>
                        </div>
                    </div>
                </div>
            )}
            {/* Modal de Detalhes do Pedido */}
            {selectedOrder && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-0 lg:p-4 bg-muted-text/40 backdrop-blur-sm animate-in fade-in duration-200">
                    <div className="bg-white w-full max-w-2xl lg:rounded-[3rem] shadow-premium overflow-hidden border border-white flex flex-col h-full lg:h-auto lg:max-h-[90vh]">

                        <div className="p-6 lg:p-8 border-b border-gray-100 flex justify-between items-center bg-soft sticky top-0 z-10">
                            <div>
                                <h2 className="text-xl lg:text-2xl font-black text-muted-text flex items-center gap-3">
                                    <Truck className="text-primary" size={24} />
                                    <span>Pedido {selectedOrder.order_number || `#${selectedOrder.id.slice(0, 8)}`}</span>
                                </h2>
                                <p className="text-xs lg:text-sm font-bold text-gray-400 mt-1">
                                    Cliente: <span className="text-muted-text">{selectedOrder.profiles?.full_name || selectedOrder.customer_name || 'Desconhecido'}</span>
                                </p>
                            </div>
                            <button
                                onClick={() => setSelectedOrder(null)}
                                className="w-10 h-10 lg:w-12 lg:h-12 rounded-xl lg:rounded-2xl bg-white text-gray-400 hover:text-muted-text hover:shadow-sm flex items-center justify-center transition-all border border-gray-100"
                            >
                                <X size={24} />
                            </button>
                        </div>

                        <div className="p-6 lg:p-8 overflow-y-auto space-y-6 flex-1">
                            {/* Resumo */}
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                <div className="bg-soft p-5 rounded-2xl lg:rounded-[2rem]">
                                    <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">Status / Data</p>
                                    <div className="flex items-center gap-2 mb-2">
                                        <div className={clsx("px-2 py-1 rounded-md text-[10px] font-black uppercase tracking-widest", (STATUS_CONFIG[selectedOrder.status] || STATUS_CONFIG.pending).color)}>
                                            {(STATUS_CONFIG[selectedOrder.status] || STATUS_CONFIG.pending).label}
                                        </div>
                                    </div>
                                    <p className="text-sm font-bold text-muted-text">Realizado em: {new Date(selectedOrder.created_at).toLocaleDateString("pt-BR")}</p>
                                    <p className="text-[10px] font-bold text-gray-400">
                                        {new Date(selectedOrder.created_at).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}
                                    </p>
                                </div>
                                <div className="bg-primary/5 p-5 rounded-2xl lg:rounded-[2rem] border border-primary/10">
                                    <p className="text-[10px] font-black text-primary uppercase tracking-widest mb-1">Total do Pedido</p>
                                    <p className="text-xl lg:text-2xl font-black text-primary">
                                        R$ {Number(selectedOrder.total_amount || 0).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
                                    </p>
                                    <p className="text-[10px] font-bold text-gray-400 mt-1 uppercase tracking-widest">
                                        Método: {selectedOrder.payment_method === 'pix' ? 'PIX' : 'Cartão/Boleto'}
                                    </p>
                                </div>
                            </div>

                            {/* Itens */}
                            <div className="space-y-4">
                                <h3 className="text-sm font-black text-gray-400 uppercase tracking-widest px-2">Produtos</h3>
                                <div className="space-y-3">
                                    {selectedOrder.items?.map((item: any) => (
                                        <div key={item.id} className="flex gap-4 p-4 rounded-2xl border border-gray-100 items-center bg-white">
                                            <div className="w-14 h-14 lg:w-16 lg:h-16 rounded-xl bg-soft overflow-hidden shrink-0">
                                                {item.product?.image_url ? (
                                                    <img src={item.product.image_url} alt={item.product.name} className="w-full h-full object-cover" />
                                                ) : (
                                                    <div className="w-full h-full flex items-center justify-center text-gray-300">
                                                        <ShoppingBag size={20} />
                                                    </div>
                                                )}
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <h4 className="font-bold text-xs lg:text-sm text-muted-text truncate">{item.product?.name || "Produto"}</h4>
                                                <p className="text-[10px] font-bold text-gray-400">Qtd: {item.quantity}x</p>
                                            </div>
                                            <div className="text-right">
                                                <span className="font-black text-primary text-sm">
                                                    R$ {Number((item.price_at_time || item.product?.price || 0)).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
                                                </span>
                                            </div>
                                        </div>
                                    ))}
                                    {(!selectedOrder.items || selectedOrder.items.length === 0) && (
                                        <div className="text-center p-8 bg-soft rounded-2xl text-sm font-bold text-gray-400">
                                            Nenhum item encontrado neste pedido.
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>

                        <div className="p-6 lg:p-8 bg-gray-50 border-t border-gray-100 flex justify-end sticky bottom-0 z-10">
                            <button
                                onClick={() => setSelectedOrder(null)}
                                className="px-8 py-4 rounded-2xl font-black text-xs lg:text-sm uppercase tracking-widest bg-gray-200 text-gray-500 hover:bg-gray-300 transition-colors w-full sm:w-auto"
                            >
                                Fechar
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
