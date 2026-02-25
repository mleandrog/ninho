"use client";

import { useEffect, useState } from "react";
import { KPICard } from "@/components/admin/KPICard";
import { supabase } from "@/lib/supabase";
import {
    TrendingUp,
    ArrowUpRight,
    ArrowDownRight,
    Calendar,
    Download,
    Package,
    ShoppingBag,
    DollarSign,
    Filter
} from "lucide-react";
import { Button } from "@/components/ui/Button";
import { clsx } from "clsx";
import { motion } from "framer-motion";

export default function ReportsPage() {
    const [loading, setLoading] = useState(true);
    const [period, setPeriod] = useState("30d");
    const [reportData, setReportData] = useState<{
        revenue: number;
        orders: number;
        averageTicket: number;
        topProducts: Array<{ name: string; sales: number; revenue: number; growth: number }>;
        categoryPerformance: Array<{ name: string; percentage: number; color: string }>;
    }>({
        revenue: 0,
        orders: 0,
        averageTicket: 0,
        topProducts: [],
        categoryPerformance: []
    });

    useEffect(() => {
        fetchReportData();
    }, [period]);

    const fetchReportData = async () => {
        setLoading(true);
        try {
            // Simulando busca de dados agregados do Supabase
            // Em uma app real, usaríamos aggregations ou edge functions para analytics
            const { data: orders } = await supabase.from("orders").select("total_amount, created_at");

            const revenue = orders?.reduce((acc, curr) => acc + curr.total_amount, 0) || 0;
            const ordersCount = orders?.length || 0;
            const averageTicket = ordersCount > 0 ? revenue / ordersCount : 0;

            // Mocking top products and categories since sophisticated analytics usually need complex queries
            setReportData({
                revenue,
                orders: ordersCount,
                averageTicket,
                topProducts: [
                    { name: "Conjunto Ursinho Feliz", sales: 42, revenue: 3775.80, growth: 12 },
                    { name: "Vestido Flores Primavera", sales: 38, revenue: 4541.00, growth: -5 },
                    { name: "Tênis Confort Plus", sales: 25, revenue: 3725.00, growth: 18 },
                ],
                categoryPerformance: [
                    { name: "Vestidos", percentage: 45, color: "primary" },
                    { name: "Bebês", percentage: 32, color: "secondary" },
                    { name: "Calçados", percentage: 23, color: "accent" }
                ]
            });
        } catch (error) {
            console.error(error);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="animate-in fade-in duration-500">
            <header className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 mb-12">
                <div>
                    <h1 className="text-4xl font-black text-muted-text">Relatórios e Análise</h1>
                    <p className="text-gray-400 font-bold mt-1">Acompanhe a saúde financeira do seu Ninho Lar.</p>
                </div>
                <div className="flex gap-4">
                    <select
                        value={period}
                        onChange={(e) => setPeriod(e.target.value)}
                        className="bg-white px-6 py-4 rounded-2xl shadow-premium border border-gray-50 text-sm font-bold text-muted-text focus:ring-2 focus:ring-primary/20 outline-none"
                    >
                        <option value="7d">Últimos 7 dias</option>
                        <option value="30d">Últimos 30 dias</option>
                        <option value="90d">Últimos 90 dias</option>
                        <option value="all">Todo o período</option>
                    </select>
                    <Button variant="outline" className="h-14 px-6 rounded-2xl gap-2 border-gray-100 bg-white">
                        <Download size={18} />
                        Exportar
                    </Button>
                </div>
            </header>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-12">
                <KPICard
                    label="Faturamento Total"
                    value={`R$ ${reportData.revenue.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`}
                    icon={DollarSign}
                    trend="+15.4%"
                    color="primary"
                />
                <KPICard
                    label="Ticket Médio"
                    value={`R$ ${reportData.averageTicket.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`}
                    icon={TrendingUp}
                    trend="+8.2%"
                    color="secondary"
                />
                <KPICard
                    label="Taxa de Conversão"
                    value="3.2%"
                    icon={ArrowUpRight}
                    trend="+1.2%"
                    color="accent"
                />
            </div>

            <div className="grid lg:grid-cols-2 gap-8 mb-12">
                {/* Mais Vendidos */}
                <div className="bg-white p-8 rounded-[2.5rem] shadow-premium border border-white">
                    <h2 className="text-2xl font-black text-muted-text mb-8 flex items-center gap-3">
                        <Package className="text-primary" size={24} />
                        Top Produtos
                    </h2>
                    <div className="space-y-6">
                        {reportData.topProducts.map((product: any) => (
                            <div key={product.name} className="flex items-center justify-between p-4 hover:bg-soft rounded-2xl transition-all group">
                                <div className="flex items-center gap-4">
                                    <div className="w-12 h-12 bg-white rounded-xl shadow-sm flex items-center justify-center text-xl">
                                        {product.name.includes("Vestido") ? "👗" : product.name.includes("Tênis") ? "👟" : "👕"}
                                    </div>
                                    <div>
                                        <p className="font-black text-muted-text group-hover:text-primary transition-colors">{product.name}</p>
                                        <p className="text-xs font-bold text-gray-400">{product.sales} vendas realizadas</p>
                                    </div>
                                </div>
                                <div className="text-right">
                                    <p className="font-black text-muted-text">R$ {product.revenue.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</p>
                                    <div className={clsx(
                                        "flex items-center justify-end gap-1 text-[10px] font-black",
                                        product.growth > 0 ? "text-green-500" : "text-red-400"
                                    )}>
                                        {product.growth > 0 ? <ArrowUpRight size={12} /> : <ArrowDownRight size={12} />}
                                        {Math.abs(product.growth)}%
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Performance por Categoria */}
                <div className="bg-white p-8 rounded-[2.5rem] shadow-premium border border-white">
                    <h2 className="text-2xl font-black text-muted-text mb-8 flex items-center gap-3">
                        <Filter className="text-secondary" size={24} />
                        Vendas por Categoria
                    </h2>
                    <div className="space-y-8 py-4">
                        {reportData.categoryPerformance.map((cat: any) => (
                            <div key={cat.name} className="space-y-3">
                                <div className="flex justify-between items-end">
                                    <div>
                                        <p className="text-xl font-black text-muted-text">{cat.name}</p>
                                        <p className="text-sm font-bold text-gray-400">Distribuição total</p>
                                    </div>
                                    <span className="text-2xl font-black text-primary">{cat.percentage}%</span>
                                </div>
                                <div className="h-4 bg-soft rounded-full overflow-hidden">
                                    <motion.div
                                        initial={{ width: 0 }}
                                        animate={{ width: `${cat.percentage}%` }}
                                        transition={{ duration: 1, ease: "easeOut" }}
                                        className={clsx(
                                            "h-full rounded-full",
                                            cat.color === 'primary' ? 'bg-primary' : cat.color === 'secondary' ? 'bg-secondary' : 'bg-accent'
                                        )}
                                    />
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </div>

            {/* Insights Section */}
            <div className="bg-accent/10 p-10 rounded-[3rem] border-2 border-accent/20">
                <div className="flex flex-col md:flex-row items-center gap-8">
                    <div className="w-24 h-24 bg-white rounded-3xl shadow-accent flex items-center justify-center text-5xl">
                        💡
                    </div>
                    <div className="flex-1 space-y-2 text-center md:text-left">
                        <h3 className="text-2xl font-black text-muted-text">Insight do Ninho</h3>
                        <p className="text-lg font-bold text-gray-500 max-w-2xl text-muted-text">
                            Notamos que os <span className="text-primary italic">Vestidos</span> tiveram um aumento de procura nos finais de semana. que tal criar uma campanha de "Look de Domingo" para impulsionar ainda mais?
                        </p>
                    </div>
                    <Button className="h-16 px-10 rounded-full shadow-vibrant text-lg">
                        Criar Campanha
                    </Button>
                </div>
            </div>
        </div>
    );
}
