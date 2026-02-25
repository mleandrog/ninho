"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useRouter } from "next/navigation";
import { AdminSidebar } from "@/components/admin/AdminSidebar";
import { KPICard } from "@/components/admin/KPICard";
import { supabase } from "@/lib/supabase";
import { clsx } from "clsx";
import { DollarSign, ShoppingBag, Users, Clock, ArrowUpRight } from "lucide-react";
import { toast } from "react-hot-toast";

export default function AdminDashboard() {
    const { profile } = useAuth();
    const [stats, setStats] = useState({
        totalSales: 0,
        ordersCount: 0,
        activeBags: 0,
        customersCount: 0,
    });
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchStats();
    }, []);

    const fetchStats = async () => {
        setLoading(true);
        try {
            const { data: orders } = await supabase.from("orders").select("total_amount");
            const { count: ordersCount } = await supabase.from("orders").select("*", { count: 'exact', head: true });
            const { count: bagsCount } = await supabase.from("bags").select("*", { count: 'exact', head: true });

            const totalSales = orders?.reduce((acc, curr) => acc + curr.total_amount, 0) || 0;

            setStats({
                totalSales,
                ordersCount: ordersCount || 0,
                activeBags: bagsCount || 0,
                customersCount: 12, // Mocked for now
            });
        } catch (error) {
            console.error(error);
        } finally {
            setLoading(false);
        }
    };

    if (loading) return (
        <div className="flex flex-col justify-center items-center py-20 gap-4">
            <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin" />
            <span className="text-xs font-black text-gray-400 uppercase tracking-widest">Carregando métricas...</span>
        </div>
    );

    return (
        <div className="animate-in fade-in duration-500">
            <header className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-10 lg:mb-12">
                <div>
                    <h1 className="text-3xl lg:text-4xl font-black text-muted-text tracking-tight lowercase">Painel de Controle</h1>
                    <p className="text-gray-400 font-bold mt-1">Bem-vindo de volta, {profile?.full_name}</p>
                </div>
                <div className="bg-white px-6 py-3 rounded-2xl shadow-premium border border-white text-sm font-bold text-gray-400">
                    Status da Loja: <span className="text-green-500 ml-1">● Aberta</span>
                </div>
            </header>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 lg:gap-8 mb-8 lg:mb-12">
                <KPICard
                    label="Vendas Totais"
                    value={`R$ ${stats.totalSales.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`}
                    icon={DollarSign}
                    trend="+12%"
                    color="primary"
                />
                <KPICard
                    label="Pedidos Realizados"
                    value={stats.ordersCount}
                    icon={ShoppingBag}
                    color="secondary"
                />
                <KPICard
                    label="Sacolas Ativas"
                    value={stats.activeBags}
                    icon={Clock}
                    color="accent"
                />
                <KPICard
                    label="Novos Clientes"
                    value={stats.customersCount}
                    icon={Users}
                    trend="+5"
                    color="primary"
                />
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 lg:gap-8">
                <div className="lg:col-span-2 bg-white p-6 lg:p-8 rounded-[2rem] lg:rounded-[2.5rem] shadow-premium border border-white">
                    <div className="flex items-center justify-between mb-8">
                        <h2 className="text-xl lg:text-2xl font-black text-muted-text">Pedidos Recentes</h2>
                        <button className="text-primary font-bold text-sm hover:underline">Ver Todos</button>
                    </div>
                    <div className="space-y-6">
                        <p className="text-center py-20 text-gray-400 font-bold italic">Os dados de pedidos detalhados aparecerão aqui em breve.</p>
                    </div>
                </div>

                <div className="bg-white p-6 lg:p-8 rounded-[2rem] lg:rounded-[2.5rem] shadow-premium border border-white">
                    <h2 className="text-xl lg:text-2xl font-black text-muted-text mb-8">Top Categorias</h2>
                    <div className="space-y-6">
                        {[
                            { name: "Vestidos", sales: 45, color: "primary" },
                            { name: "Bebês", sales: 32, color: "secondary" },
                            { name: "Acessórios", sales: 23, color: "accent" }
                        ].map((cat) => (
                            <div key={cat.name} className="space-y-2">
                                <div className="flex justify-between text-sm font-bold">
                                    <span className="text-muted-text">{cat.name}</span>
                                    <span className="text-gray-400">{cat.sales}%</span>
                                </div>
                                <div className="h-3 bg-soft rounded-full overflow-hidden">
                                    <div
                                        className={clsx("h-full rounded-full transition-all duration-1000", cat.color === 'primary' ? 'bg-primary' : cat.color === 'secondary' ? 'bg-secondary' : 'bg-accent-foreground')}
                                        style={{ width: `${cat.sales}%` }}
                                    />
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        </div>
    );
}
