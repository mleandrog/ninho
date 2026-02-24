"use client";

import { useEffect, useState, useMemo } from "react";
import { supabase } from "@/lib/supabase";
import { AdminSidebar } from "@/components/admin/AdminSidebar";
import { toast } from "react-hot-toast";
import {
    Clock, CheckCircle, Truck, AlertCircle, Eye,
    RefreshCcw, Search, Filter, X
} from "lucide-react";
import { clsx } from "clsx";

const STATUS_CONFIG: Record<string, { label: string; icon: any; color: string }> = {
    pending: { label: "Pendente", icon: Clock, color: "text-yellow-600 bg-yellow-50" },
    paid: { label: "Pago", icon: CheckCircle, color: "text-green-600 bg-green-50" },
    shipped: { label: "Enviado", icon: Truck, color: "text-blue-600 bg-blue-50" },
    delivered: { label: "Entregue", icon: CheckCircle, color: "text-primary bg-primary/10" },
    canceled: { label: "Cancelado", icon: AlertCircle, color: "text-red-600 bg-red-50" },
};

export default function AdminOrdersPage() {
    const [orders, setOrders] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    // Filtros
    const [search, setSearch] = useState("");
    const [filterStatus, setFilterStatus] = useState("");
    const [filterFrom, setFilterFrom] = useState("");
    const [filterTo, setFilterTo] = useState("");

    useEffect(() => { fetchOrders(); }, []);

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

    const updateStatus = async (id: string, newStatus: string) => {
        try {
            const { error } = await supabase.from("orders").update({ status: newStatus }).eq("id", id);
            if (error) throw error;
            toast.success("Status atualizado!");
            setOrders(prev => prev.map(o => o.id === id ? { ...o, status: newStatus } : o));
        } catch (err: any) {
            toast.error("Erro ao atualizar: " + err.message);
        }
    };

    const clearFilters = () => {
        setSearch("");
        setFilterStatus("");
        setFilterFrom("");
        setFilterTo("");
    };

    const filtered = useMemo(() => {
        return orders.filter(order => {
            const name = (order.profiles?.full_name || order.customer_name || "").toLowerCase();
            const num = (order.order_number || order.id.slice(0, 8)).toLowerCase();
            const created = new Date(order.created_at);

            if (search && !name.includes(search.toLowerCase()) && !num.includes(search.toLowerCase())) return false;
            if (filterStatus && order.status !== filterStatus) return false;
            if (filterFrom && created < new Date(filterFrom)) return false;
            if (filterTo) {
                const to = new Date(filterTo);
                to.setHours(23, 59, 59);
                if (created > to) return false;
            }
            return true;
        });
    }, [orders, search, filterStatus, filterFrom, filterTo]);

    const hasFilters = search || filterStatus || filterFrom || filterTo;

    return (
        <div className="min-h-screen bg-soft flex">
            <AdminSidebar />

            <main className="flex-1 p-12 overflow-y-auto">
                {/* Header */}
                <header className="flex justify-between items-center mb-8">
                    <div>
                        <h1 className="text-4xl font-black text-muted-text">Gestão de Pedidos</h1>
                        <p className="text-gray-400 font-bold mt-1">
                            {filtered.length} {filtered.length === 1 ? "pedido" : "pedidos"}
                            {hasFilters ? " encontrados" : " no total"}
                        </p>
                    </div>
                    <button
                        onClick={fetchOrders}
                        className="p-4 bg-white rounded-2xl shadow-premium border border-white text-gray-400 hover:text-primary transition-colors"
                    >
                        <RefreshCcw size={20} />
                    </button>
                </header>

                {/* Filtros */}
                <div className="bg-white p-6 rounded-[2rem] shadow-premium border border-white mb-6">
                    <div className="flex flex-wrap gap-4 items-center">
                        {/* Busca */}
                        <div className="flex-1 min-w-[200px] relative">
                            <Search size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" />
                            <input
                                type="text"
                                placeholder="Buscar por cliente ou nº do pedido..."
                                className="w-full pl-10 pr-4 py-3 bg-soft rounded-2xl border-none font-bold text-sm outline-none"
                                value={search}
                                onChange={e => setSearch(e.target.value)}
                            />
                        </div>

                        {/* Status */}
                        <div className="relative">
                            <Filter size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
                            <select
                                className="pl-10 pr-4 py-3 bg-soft rounded-2xl border-none font-black text-sm uppercase tracking-wide outline-none appearance-none cursor-pointer"
                                value={filterStatus}
                                onChange={e => setFilterStatus(e.target.value)}
                            >
                                <option value="">Todos os status</option>
                                {Object.entries(STATUS_CONFIG).map(([key, cfg]) => (
                                    <option key={key} value={key}>{cfg.label}</option>
                                ))}
                            </select>
                        </div>

                        {/* De */}
                        <div className="flex items-center gap-2">
                            <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest whitespace-nowrap">De</label>
                            <input
                                type="date"
                                className="px-4 py-3 bg-soft rounded-2xl border-none font-bold text-sm outline-none"
                                value={filterFrom}
                                onChange={e => setFilterFrom(e.target.value)}
                            />
                        </div>

                        {/* Até */}
                        <div className="flex items-center gap-2">
                            <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest whitespace-nowrap">Até</label>
                            <input
                                type="date"
                                className="px-4 py-3 bg-soft rounded-2xl border-none font-bold text-sm outline-none"
                                value={filterTo}
                                onChange={e => setFilterTo(e.target.value)}
                            />
                        </div>

                        {/* Clear */}
                        {hasFilters && (
                            <button
                                onClick={clearFilters}
                                className="flex items-center gap-1.5 px-4 py-3 rounded-2xl bg-red-50 text-red-400 hover:bg-red-100 font-black text-xs uppercase tracking-wide transition-all"
                            >
                                <X size={14} /> Limpar
                            </button>
                        )}
                    </div>
                </div>

                {/* Lista de Pedidos */}
                <div className="space-y-2">
                    {loading ? (
                        <div className="bg-white p-20 rounded-[2.5rem] flex justify-center items-center shadow-premium">
                            <div className="w-10 h-10 border-4 border-primary border-t-transparent rounded-full animate-spin" />
                        </div>
                    ) : filtered.length === 0 ? (
                        <div className="bg-white p-16 rounded-[2.5rem] text-center font-bold text-gray-400 shadow-premium">
                            {hasFilters ? "Nenhum pedido encontrado com esses filtros." : "Nenhum pedido realizado ainda."}
                        </div>
                    ) : (
                        <>
                            {/* Header da tabela */}
                            <div className="grid grid-cols-[2rem_1fr_1fr_1fr_1fr_1fr_auto] gap-4 px-6 py-2">
                                <div />
                                <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Pedido</span>
                                <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Cliente</span>
                                <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Data</span>
                                <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Total</span>
                                <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Status</span>
                                <div />
                            </div>

                            {filtered.map(order => {
                                const status = STATUS_CONFIG[order.status] || STATUS_CONFIG.pending;
                                const Icon = status.icon;
                                return (
                                    <div
                                        key={order.id}
                                        className="grid grid-cols-[2rem_1fr_1fr_1fr_1fr_1fr_auto] gap-4 items-center bg-white px-6 py-4 rounded-2xl shadow-premium border border-white hover:border-primary/20 transition-all group"
                                    >
                                        {/* Ícone status */}
                                        <div className={clsx("w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0", status.color)}>
                                            <Icon size={16} />
                                        </div>

                                        {/* Número do pedido */}
                                        <span className="font-black text-muted-text text-sm truncate">
                                            #{order.order_number || order.id.slice(0, 8).toUpperCase()}
                                        </span>

                                        {/* Cliente */}
                                        <span className="font-bold text-sm text-gray-500 truncate">
                                            {order.profiles?.full_name || order.customer_name || "N/A"}
                                        </span>

                                        {/* Data */}
                                        <span className="text-xs font-bold text-gray-400">
                                            {new Date(order.created_at).toLocaleDateString("pt-BR")}
                                            <span className="block text-[10px] text-gray-300">
                                                {new Date(order.created_at).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}
                                            </span>
                                        </span>

                                        {/* Total */}
                                        <span className="font-black text-primary">
                                            R$ {Number(order.total_amount).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
                                        </span>

                                        {/* Select de status */}
                                        <select
                                            value={order.status}
                                            onChange={e => updateStatus(order.id, e.target.value)}
                                            className="px-3 py-2 bg-soft rounded-xl border-none text-xs font-black uppercase text-gray-500 focus:ring-2 focus:ring-primary/20 outline-none cursor-pointer"
                                        >
                                            {Object.entries(STATUS_CONFIG).map(([key, cfg]) => (
                                                <option key={key} value={key}>{cfg.label}</option>
                                            ))}
                                        </select>

                                        {/* Ações */}
                                        <button className="w-9 h-9 rounded-xl bg-soft text-gray-400 hover:text-primary hover:bg-primary/5 flex items-center justify-center transition-all">
                                            <Eye size={17} />
                                        </button>
                                    </div>
                                );
                            })}
                        </>
                    )}
                </div>
            </main>
        </div>
    );
}
