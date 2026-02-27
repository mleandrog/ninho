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
            let query = supabase.from("orders").select("id, total_amount, created_at, status");

            // Aplicar filtro de período
            if (period !== "all") {
                const days = parseInt(period);
                const date = new Date();
                date.setDate(date.getDate() - days);
                query = query.gte("created_at", date.toISOString());
            }

            const { data: orders } = await query;

            // Filtrar apenas pedidos pagos para métricas financeiras (opcional, mas recomendado)
            const paidOrders = orders?.filter(o => o.status === 'paid' || o.status === 'shipped' || o.status === 'delivered') || [];

            const revenue = paidOrders.reduce((acc, curr) => acc + (Number(curr.total_amount) || 0), 0);
            const ordersCount = paidOrders.length;
            const averageTicket = ordersCount > 0 ? revenue / ordersCount : 0;

            // 1. Buscar itens dos pedidos pagos para Top Produtos
            const orderIds = paidOrders.map(o => o.id);
            let topProducts: any[] = [];
            let categoryPerformance: any[] = [];

            if (orderIds.length > 0) {
                const { data: items } = await supabase
                    .from("order_items")
                    .select("product_id, product_name, quantity, subtotal, products(categories(name))")
                    .in("order_id", orderIds);

                if (items) {
                    // Agrupar por produto
                    const productMap = new Map();
                    const categoryMap = new Map();

                    items.forEach(item => {
                        // Top Produtos
                        const existing = productMap.get(item.product_id) || { name: item.product_name, sales: 0, revenue: 0 };
                        productMap.set(item.product_id, {
                            ...existing,
                            sales: existing.sales + (item.quantity || 1),
                            revenue: existing.revenue + (Number(item.subtotal) || 0)
                        });

                        // Categorias
                        const catName = (item.products as any)?.categories?.name || "Outros";
                        categoryMap.set(catName, (categoryMap.get(catName) || 0) + (Number(item.subtotal) || 0));
                    });

                    topProducts = Array.from(productMap.values())
                        .sort((a, b) => b.revenue - a.revenue)
                        .slice(0, 5)
                        .map(p => ({ ...p, growth: 0 })); // Growth simplificado como 0 sem histórico anterior

                    const totalCatRevenue = Array.from(categoryMap.values()).reduce((a, b) => a + b, 0);
                    const colors = ['primary', 'secondary', 'accent'];
                    categoryPerformance = Array.from(categoryMap.entries()).map(([name, val], i) => ({
                        name,
                        percentage: totalCatRevenue > 0 ? Math.round((val / totalCatRevenue) * 100) : 0,
                        color: colors[i % colors.length]
                    })).sort((a, b) => b.percentage - a.percentage);
                }
            }

            setReportData({
                revenue,
                orders: ordersCount,
                averageTicket,
                topProducts,
                categoryPerformance
            });
        } catch (error) {
            console.error(error);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="animate-in fade-in duration-500">
            <header className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4 sm:gap-6 mb-8 sm:mb-12">
                <div>
                    <h1 className="text-3xl sm:text-4xl font-black text-muted-text lowercase tracking-tighter">Relatórios</h1>
                    <p className="text-[10px] sm:text-sm font-bold text-gray-400 mt-1">Acompanhe a saúde financeira do seu Ninho Lar.</p>
                </div>
                <div className="flex gap-2 sm:gap-4 w-full lg:w-auto">
                    <select
                        value={period}
                        onChange={(e) => setPeriod(e.target.value)}
                        className="flex-1 lg:flex-none bg-white px-4 sm:px-6 py-3 sm:py-4 rounded-xl sm:rounded-2xl shadow-premium border border-gray-50 text-[10px] sm:text-sm font-bold text-muted-text focus:ring-2 focus:ring-primary/20 outline-none"
                    >
                        <option value="7d">7 dias</option>
                        <option value="30d">30 dias</option>
                        <option value="90d">90 dias</option>
                        <option value="all">Tudo</option>
                    </select>
                    <Button variant="outline" className="h-10 sm:h-14 px-4 sm:px-6 rounded-xl sm:rounded-2xl gap-2 border-gray-100 bg-white text-[10px] sm:text-sm">
                        <Download size={14} className="sm:w-[18px] sm:h-[18px]" />
                        Exportar
                    </Button>
                </div>
            </header>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-8 mb-8 sm:mb-12">
                <KPICard
                    label="Faturamento"
                    value={`R$ ${reportData.revenue.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`}
                    icon={DollarSign}
                    trend={reportData.revenue > 0 ? "+0.0%" : "0%"}
                    color="primary"
                />
                <KPICard
                    label="Ticket Médio"
                    value={`R$ ${reportData.averageTicket.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`}
                    icon={TrendingUp}
                    trend={reportData.averageTicket > 0 ? "+0.0%" : "0%"}
                    color="secondary"
                />
                <KPICard
                    label="Conversão"
                    value={loading ? "..." : reportData.orders > 0 ? "Real" : "0.0%"}
                    icon={ArrowUpRight}
                    trend="0%"
                    color="accent"
                />
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-8 mb-8 sm:mb-12">
                {/* Mais Vendidos */}
                <div className="bg-white p-5 sm:p-8 rounded-2xl sm:rounded-[2.5rem] shadow-premium border border-white min-h-[300px]">
                    <h2 className="text-lg sm:text-2xl font-black text-muted-text mb-6 sm:mb-8 flex items-center gap-3">
                        <Package className="text-primary" size={20} />
                        Top Produtos
                    </h2>
                    <div className="space-y-4 sm:space-y-6">
                        {reportData.topProducts.length > 0 ? reportData.topProducts.map((product: any) => (
                            <div key={product.name} className="flex items-center justify-between p-3 sm:p-4 hover:bg-soft rounded-xl sm:rounded-2xl transition-all group">
                                <div className="flex items-center gap-3 sm:gap-4 flex-1 min-w-0">
                                    <div className="w-10 h-10 sm:w-12 sm:h-12 bg-white rounded-lg sm:rounded-xl shadow-sm flex items-center justify-center text-lg shrink-0">
                                        {product.name.includes("Vestido") ? "👗" : product.name.includes("Tênis") ? "👟" : "👕"}
                                    </div>
                                    <div className="min-w-0">
                                        <p className="font-black text-muted-text group-hover:text-primary transition-colors text-[10px] sm:text-sm truncate">{product.name}</p>
                                        <p className="text-[9px] sm:text-xs font-bold text-gray-400">{product.sales} vendas</p>
                                    </div>
                                </div>
                                <div className="text-right shrink-0">
                                    <p className="font-black text-muted-text text-[10px] sm:text-sm">R$ {product.revenue.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</p>
                                </div>
                            </div>
                        )) : (
                            <div className="flex flex-col items-center justify-center py-12 text-gray-400">
                                <Package size={40} className="mb-2 opacity-20" />
                                <p className="font-bold text-sm text-center">Nenhum produto vendido no período.</p>
                            </div>
                        )}
                    </div>
                </div>

                {/* Performance por Categoria */}
                <div className="bg-white p-5 sm:p-8 rounded-2xl sm:rounded-[2.5rem] shadow-premium border border-white min-h-[300px]">
                    <h2 className="text-lg sm:text-2xl font-black text-muted-text mb-6 sm:mb-8 flex items-center gap-3">
                        <Filter className="text-secondary" size={20} />
                        Vendas por Categoria
                    </h2>
                    <div className="space-y-6 sm:space-y-8 py-2 sm:py-4">
                        {reportData.categoryPerformance.length > 0 ? reportData.categoryPerformance.map((cat: any) => (
                            <div key={cat.name} className="space-y-2 sm:space-y-3">
                                <div className="flex justify-between items-end">
                                    <div>
                                        <p className="text-base sm:text-xl font-black text-muted-text">{cat.name}</p>
                                        <p className="text-[10px] sm:text-sm font-bold text-gray-400">Distribuição total</p>
                                    </div>
                                    <span className="text-xl sm:text-2xl font-black text-primary">{cat.percentage}%</span>
                                </div>
                                <div className="h-3 sm:h-4 bg-soft rounded-full overflow-hidden">
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
                        )) : (
                            <div className="flex flex-col items-center justify-center py-12 text-gray-400">
                                <Filter size={40} className="mb-2 opacity-20" />
                                <p className="font-bold text-sm text-center">Sem dados de categorias.</p>
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* Insights Section */}
            {reportData.orders > 0 && (
                <div className="bg-accent/10 p-6 sm:p-10 rounded-2xl sm:rounded-[3rem] border-2 border-accent/20">
                    <div className="flex flex-col md:flex-row items-center gap-4 sm:gap-8">
                        <div className="w-16 h-16 sm:w-24 sm:h-24 bg-white rounded-2xl sm:rounded-3xl shadow-accent flex items-center justify-center text-3xl sm:text-5xl shrink-0">
                            💡
                        </div>
                        <div className="flex-1 space-y-1 sm:space-y-2 text-center md:text-left">
                            <h3 className="text-xl sm:text-2xl font-black text-muted-text">Insight do Ninho</h3>
                            <p className="text-sm sm:text-lg font-bold text-gray-500 max-w-2xl text-muted-text">
                                Com base nos dados reais, as vendas de <span className="text-primary italic">{reportData.categoryPerformance[0]?.name || 'produtos'}</span> estão liderando.
                            </p>
                        </div>
                        <Button className="h-12 sm:h-16 px-6 sm:px-10 rounded-full shadow-vibrant text-xs sm:text-lg w-full md:w-auto">
                            Ver Detalhes
                        </Button>
                    </div>
                </div>
            )}
        </div>
    );
}
