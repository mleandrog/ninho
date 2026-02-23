"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { AdminSidebar } from "@/components/admin/AdminSidebar";
import { toast } from "react-hot-toast";
import { Clock, CheckCircle, Truck, AlertCircle, Eye, RefreshCcw } from "lucide-react";
import { clsx } from "clsx";

const statusConfig: any = {
    pending: { label: "Pendente", icon: Clock, color: "text-yellow-600 bg-yellow-50" },
    paid: { label: "Pago", icon: CheckCircle, color: "text-green-600 bg-green-50" },
    shipped: { label: "Enviado", icon: Truck, color: "text-blue-600 bg-blue-50" },
    delivered: { label: "Entregue", icon: CheckCircle, color: "text-primary bg-primary/10" },
    canceled: { label: "Cancelado", icon: AlertCircle, color: "text-red-600 bg-red-50" },
};

export default function AdminOrdersPage() {
    const [orders, setOrders] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchOrders();
    }, []);

    const fetchOrders = async () => {
        setLoading(true);
        try {
            const { data, error } = await supabase
                .from("orders")
                .select(`
          *,
          profiles:customer_id (full_name)
        `)
                .order("created_at", { ascending: false });

            if (error) throw error;
            setOrders(data || []);
        } catch (error: any) {
            toast.error("Erro ao carregar pedidos: " + error.message);
        } finally {
            setLoading(false);
        }
    };

    const updateStatus = async (id: string, newStatus: string) => {
        try {
            const { error } = await supabase
                .from("orders")
                .update({ status: newStatus })
                .eq("id", id);

            if (error) throw error;
            toast.success("Status atualizado!");
            fetchOrders();
        } catch (error: any) {
            toast.error("Erro ao atualizar: " + error.message);
        }
    };

    return (
        <div className="min-h-screen bg-soft flex">
            <AdminSidebar />

            <main className="flex-1 p-12 overflow-y-auto">
                <header className="flex justify-between items-center mb-12">
                    <div>
                        <h1 className="text-4xl font-black text-muted-text">Gestão de Pedidos</h1>
                        <p className="text-gray-400 font-bold mt-1">Monitore e atualize as vendas da sua loja</p>
                    </div>
                    <button
                        onClick={fetchOrders}
                        className="p-4 bg-white rounded-2xl shadow-premium border border-white text-gray-400 hover:text-primary transition-colors"
                    >
                        <RefreshCcw size={20} />
                    </button>
                </header>

                <div className="grid gap-6">
                    {loading ? (
                        <div className="bg-white p-20 rounded-[2.5rem] flex justify-center items-center shadow-premium">
                            <div className="w-10 h-10 border-4 border-primary border-t-transparent rounded-full animate-spin" />
                        </div>
                    ) : orders.length === 0 ? (
                        <div className="bg-white p-20 rounded-[2.5rem] text-center font-bold text-gray-400 shadow-premium">
                            Nenhum pedido realizado ainda.
                        </div>
                    ) : (
                        orders.map((order) => {
                            const status = statusConfig[order.status] || statusConfig.pending;
                            return (
                                <div key={order.id} className="bg-white p-8 rounded-[2.5rem] shadow-premium border border-white flex flex-col lg:flex-row justify-between items-center gap-8 group hover:border-primary/20 transition-all">
                                    <div className="flex gap-6 items-center flex-1">
                                        <div className={clsx("p-5 rounded-2xl", status.color)}>
                                            <status.icon size={28} />
                                        </div>
                                        <div className="space-y-1">
                                            <h3 className="text-xl font-black text-muted-text">Pedido #{order.id.slice(0, 8)}</h3>
                                            <p className="text-sm font-bold text-gray-400">Cliente: <span className="text-muted-text">{order.profiles?.full_name || 'N/A'}</span></p>
                                            <div className="text-xs font-bold text-gray-400 uppercase tracking-widest">{new Date(order.created_at).toLocaleString()}</div>
                                        </div>
                                    </div>

                                    <div className="flex flex-col items-center lg:items-end gap-2">
                                        <span className="text-2xl font-black text-primary">R$ {order.total_amount.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
                                        <div className="flex gap-2">
                                            <select
                                                value={order.status}
                                                onChange={(e) => updateStatus(order.id, e.target.value)}
                                                className="px-4 py-2 bg-soft rounded-xl border-none text-xs font-black uppercase text-gray-500 focus:ring-2 focus:ring-primary/20"
                                            >
                                                {Object.keys(statusConfig).map(s => (
                                                    <option key={s} value={s}>{statusConfig[s].label}</option>
                                                ))}
                                            </select>
                                            <button className="p-2 bg-soft text-gray-400 rounded-xl hover:text-primary transition-colors">
                                                <Eye size={20} />
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            );
                        })
                    )}
                </div>
            </main>
        </div>
    );
}
