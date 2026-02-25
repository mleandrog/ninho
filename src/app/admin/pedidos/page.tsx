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

    const hasFilters = search || filterStatus || filterFrom || filterTo;

    return (
        <div className="flex flex-col flex-1 animate-in fade-in duration-500">
            {/* Header */}
            <header className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-6 mb-10">
                <div className="flex flex-col sm:flex-row items-start sm:items-center gap-6 w-full lg:w-auto">
                    <div>
                        <h1 className="text-3xl lg:text-4xl font-black text-muted-text lowercase tracking-tighter">
                            {activeTab === "pedidos" ? "Vendas" : "Carrinhos"}
                        </h1>
                        <p className="text-gray-400 font-bold mt-1">
                            {activeTab === "pedidos" ? "Gestão de Pedidos" : "Sacolas em Aberto"}
                        </p>
                    </div>

                    {/* Tabs */}
                    <div className="flex bg-white p-1.5 rounded-2xl lg:rounded-[2rem] shadow-premium border border-white gap-1 transition-all w-full sm:w-auto overflow-x-auto">
                        {[
                            { id: "pedidos", label: "Pedidos", icon: Truck },
                            { id: "sacolas", label: "Sacolas", icon: ShoppingBag }
                        ].map((tab) => (
                            <button
                                key={tab.id}
                                onClick={() => setActiveTab(tab.id as TabType)}
                                className={clsx(
                                    "px-4 lg:px-8 py-3 rounded-xl lg:rounded-[1.5rem] flex items-center justify-center gap-2 lg:gap-3 transition-all font-black text-[10px] lg:text-xs uppercase tracking-widest flex-1 sm:flex-none whitespace-nowrap",
                                    activeTab === tab.id
                                        ? "bg-primary text-white shadow-lg"
                                        : "text-gray-400 hover:text-muted-text hover:bg-soft"
                                )}
                            >
                                <tab.icon size={16} />
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

            {/* Filtros */}
            <div className="bg-white p-6 rounded-3xl lg:rounded-[2.5rem] shadow-premium border border-white mb-8">
                <div className="flex flex-col lg:flex-row gap-4 items-stretch lg:items-center">
                    {/* Busca */}
                    <div className="flex-1 relative">
                        <Search size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" />
                        <input
                            type="text"
                            placeholder={activeTab === "pedidos" ? "Buscar por cliente ou nº..." : "Buscar por nome no WhatsApp..."}
                            className="w-full pl-10 pr-4 py-3 bg-soft rounded-2xl border-none font-bold text-sm outline-none"
                            value={search}
                            onChange={e => setSearch(e.target.value)}
                        />
                    </div>

                    <div className="flex flex-col sm:flex-row gap-4">
                        {/* Status (Só para Pedidos) */}
                        {activeTab === "pedidos" && (
                            <div className="relative flex-1 sm:flex-none">
                                <Filter size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
                                <select
                                    className="w-full pl-10 pr-10 py-3 bg-soft rounded-2xl border-none font-black text-sm uppercase tracking-wide outline-none appearance-none cursor-pointer min-w-[150px]"
                                    value={filterStatus}
                                    onChange={e => setFilterStatus(e.target.value)}
                                >
                                    <option value="">Status</option>
                                    {Object.entries(STATUS_CONFIG).map(([key, cfg]) => (
                                        <option key={key} value={key}>{cfg.label}</option>
                                    ))}
                                </select>
                                <ChevronDown size={16} className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
                            </div>
                        )}

                        {/* Data */}
                        <div className="flex items-center gap-2 bg-soft px-4 py-3 lg:py-1.5 rounded-2xl flex-1 sm:flex-none">
                            <CalendarIcon size={14} className="text-gray-400 shrink-0" />
                            <input
                                type="date"
                                className="bg-transparent border-none font-bold text-xs outline-none w-full"
                                value={filterFrom}
                                onChange={e => setFilterFrom(e.target.value)}
                            />
                            <div className="w-2 h-px bg-gray-300 mx-1 shrink-0" />
                            <input
                                type="date"
                                className="bg-transparent border-none font-bold text-xs outline-none w-full"
                                value={filterTo}
                                onChange={e => setFilterTo(e.target.value)}
                            />
                        </div>

                        {/* Clear */}
                        {hasFilters && (
                            <button
                                onClick={clearFilters}
                                className="h-12 w-full sm:w-12 flex items-center justify-center rounded-2xl bg-red-50 text-red-400 hover:bg-red-100 transition-all"
                                title="Limpar Filtros"
                            >
                                <X size={20} className="mr-2 sm:mr-0" />
                                <span className="sm:hidden font-black text-xs uppercase tracking-widest">Limpar Filtros</span>
                            </button>
                        )}
                    </div>
                </div>
            </div>

            {/* Conteúdo */}
            <div className="space-y-4">
                {loading ? (
                    <div className="bg-white p-20 rounded-3xl lg:rounded-[3rem] flex flex-col justify-center items-center shadow-premium gap-4">
                        <Loader2 className="w-12 h-12 text-primary animate-spin" />
                        <span className="text-xs font-black text-gray-400 uppercase tracking-widest">Carregando dados...</span>
                    </div>
                ) : filtered.length === 0 ? (
                    <div className="bg-white p-12 lg:p-20 rounded-3xl lg:rounded-[3rem] flex flex-col items-center justify-center text-center shadow-premium border border-white">
                        <div className="w-16 h-16 lg:w-20 lg:h-20 bg-soft rounded-2xl lg:rounded-[2rem] flex items-center justify-center mb-6">
                            {activeTab === "pedidos" ? <Truck size={32} className="text-gray-300" /> : <ShoppingBag size={32} className="text-gray-300" />}
                        </div>
                        <h3 className="text-xl font-black text-muted-text mb-2">
                            {hasFilters ? "Nenhum resultado" : (activeTab === "pedidos" ? "Sem pedidos ainda" : "Nenhuma sacola aberta")}
                        </h3>
                        <p className="text-gray-400 font-bold text-sm max-w-xs">
                            {hasFilters ? "Tente ajustar seus filtros para encontrar o que procura." : (activeTab === "pedidos" ? "As vendas realizadas aparecerão aqui." : "Quando clientes iniciarem carrinhos, eles aparecerão aqui.")}
                        </p>
                    </div>
                ) : (
                    <div className="space-y-3">
                        {/* Header hidden on mobile */}
                        <div className="hidden lg:grid grid-cols-[3rem_1.5fr_1.5fr_1fr_1fr_auto] gap-6 px-8 py-2">
                            <div />
                            <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">{activeTab === "pedidos" ? "Pedido" : "WhatsApp"}</span>
                            <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Cliente</span>
                            <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Data</span>
                            <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Total</span>
                            <div />
                        </div>

                        {filtered.map(item => {
                            const status = activeTab === "pedidos" ? (STATUS_CONFIG[item.status] || STATUS_CONFIG.pending) : null;
                            const Icon = status?.icon || ShoppingBag;

                            return (
                                <div
                                    key={item.id}
                                    className="flex flex-col lg:grid lg:grid-cols-[3rem_1.5fr_1.5fr_1fr_1fr_auto] gap-4 lg:gap-6 items-start lg:items-center bg-white p-6 lg:px-8 lg:py-5 rounded-3xl lg:rounded-[2rem] shadow-premium border border-white hover:border-primary/20 transition-all group"
                                >
                                    <div className="flex justify-between items-center w-full lg:w-auto">
                                        <div className={clsx(
                                            "w-10 h-10 rounded-2xl flex items-center justify-center transition-all",
                                            status ? status.color : "bg-soft text-gray-400"
                                        )}>
                                            <Icon size={18} />
                                        </div>
                                        <div className="lg:hidden flex items-center gap-2">
                                            {activeTab === "pedidos" ? (
                                                <select
                                                    value={item.status}
                                                    onChange={e => updateStatus(item.id, e.target.value)}
                                                    className="px-3 py-1.5 bg-soft rounded-xl border-none text-[10px] font-black uppercase text-gray-500 outline-none cursor-pointer tracking-widest"
                                                >
                                                    {Object.entries(STATUS_CONFIG).map(([key, cfg]) => (
                                                        <option key={key} value={key}>{cfg.label}</option>
                                                    ))}
                                                </select>
                                            ) : (
                                                <div className="px-3 py-1.5 bg-primary/5 rounded-xl text-[10px] font-black uppercase text-primary tracking-widest">
                                                    Ativa
                                                </div>
                                            )}
                                        </div>
                                    </div>

                                    <div className="flex flex-col">
                                        <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest lg:hidden mb-1">
                                            {activeTab === "pedidos" ? "Pedido" : "WhatsApp"}
                                        </span>
                                        <span className="font-black text-muted-text">
                                            {activeTab === "pedidos"
                                                ? `#${item.order_number || item.id.slice(0, 8).toUpperCase()} `
                                                : `#${item.id.slice(0, 8).toUpperCase()} `}
                                        </span>
                                        {activeTab === "sacolas" && (
                                            <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">
                                                {item.customer_phone || "Sem número"}
                                            </span>
                                        )}
                                    </div>

                                    <div className="flex flex-col lg:flex-row lg:items-center gap-2 w-full">
                                        <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest lg:hidden">Cliente</span>
                                        <div className="flex items-center gap-2 lg:bg-transparent bg-soft/50 p-2 lg:p-0 rounded-xl">
                                            <div className="w-8 h-8 rounded-full bg-soft flex items-center justify-center text-gray-400 shrink-0">
                                                <User size={14} />
                                            </div>
                                            <span className="font-bold text-sm text-gray-500 truncate">
                                                {item.profiles?.full_name || item.customer_name || "Desconhecido"}
                                            </span>
                                        </div>
                                    </div>

                                    <div className="flex flex-col w-full lg:w-auto">
                                        <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest lg:hidden mb-1">Data</span>
                                        <div className="flex lg:flex-col gap-2 lg:gap-0 items-center lg:items-start text-xs font-black text-muted-text">
                                            <span>{new Date(item.created_at).toLocaleDateString("pt-BR")}</span>
                                            <span className="text-[10px] font-bold text-gray-300">
                                                {new Date(item.created_at).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}
                                            </span>
                                        </div>
                                    </div>

                                    <div className="flex flex-col w-full lg:w-auto">
                                        <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest lg:hidden mb-1">Total</span>
                                        <span className="font-black text-primary text-xl lg:text-lg">
                                            R$ {Number(item.total_amount || 0).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
                                        </span>
                                    </div>

                                    <div className="flex items-center justify-end gap-3 w-full lg:w-auto mt-2 lg:mt-0 pt-4 lg:pt-0 border-t lg:border-none border-gray-50">
                                        <div className="hidden lg:block">
                                            {activeTab === "pedidos" ? (
                                                <select
                                                    value={item.status}
                                                    onChange={e => updateStatus(item.id, e.target.value)}
                                                    className="px-4 py-2 bg-soft rounded-xl border-none text-[10px] font-black uppercase text-gray-500 focus:ring-2 focus:ring-primary/20 outline-none cursor-pointer tracking-widest"
                                                >
                                                    {Object.entries(STATUS_CONFIG).map(([key, cfg]) => (
                                                        <option key={key} value={key}>{cfg.label}</option>
                                                    ))}
                                                </select>
                                            ) : (
                                                <div className="px-4 py-2 bg-primary/5 rounded-xl text-[10px] font-black uppercase text-primary tracking-widest">
                                                    Ativa
                                                </div>
                                            )}
                                        </div>

                                        {activeTab === "pedidos" && item.status !== "canceled" && (item.asaas_invoice_url || item.pix_payload) && (
                                            <button
                                                onClick={() => handleResendInvoice(item.id)}
                                                className="w-12 h-12 lg:w-10 lg:h-10 rounded-xl bg-green-50 text-green-600 hover:bg-green-100 flex items-center justify-center transition-all"
                                                title="Reenviar Fatura via WhatsApp"
                                            >
                                                <MessageSquare size={18} />
                                            </button>
                                        )}

                                        <button
                                            onClick={() => activeTab === 'sacolas' ? setSelectedBag(item) : undefined}
                                            className="w-12 h-12 lg:w-10 lg:h-10 rounded-xl bg-soft text-gray-400 hover:text-primary hover:bg-primary/5 flex items-center justify-center transition-all"
                                            title="Ver Detalhes"
                                        >
                                            <Eye size={18} />
                                        </button>
                                    </div>
                                </div>
                            );
                        })}
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
                                className="px-6 py-4 rounded-2xl font-black text-xs lg:text-sm uppercase tracking-widest text-red-500 bg-red-50 hover:bg-red-100 transition-colors w-full sm:w-auto"
                                onClick={() => {
                                    if (confirm("Deseja expirar esta sacola agora? Os produtos voltarão ao estoque.")) {
                                        toast("Funcionalidade de devolução estocada será acoplada ao backend.", { icon: "🚧" });
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
        </div>
    );
}
