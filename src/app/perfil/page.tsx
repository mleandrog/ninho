"use client";

import { useEffect, useState } from "react";
import { Header } from "@/components/layout/Header";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/lib/supabase";
import { Button } from "@/components/ui/Button";
import { ShoppingBag, Package, User, LogOut, Clock, ChevronRight } from "lucide-react";
import { useRouter } from "next/navigation";
import { toast } from "react-hot-toast";

export default function ProfilePage() {
    const { user, profile, loading: authLoading } = useAuth();
    const [activeTab, setActiveTab] = useState<"bags" | "orders">("bags");
    const [bags, setBags] = useState<any[]>([]);
    const [orders, setOrders] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const router = useRouter();

    useEffect(() => {
        if (!authLoading && !user) {
            router.push("/login");
        } else if (user) {
            fetchUserData();
        }
    }, [user, authLoading]);

    const fetchUserData = async () => {
        setLoading(true);
        try {
            // Fetch Bags
            const { data: bagsData } = await supabase
                .from("bags")
                .select(`
          *,
          bag_items (
            quantity,
            products (name, price, category_id, categories(name))
          )
        `)
                .eq("customer_id", user?.id)
                .order("created_at", { ascending: false });

            setBags(bagsData || []);

            // Fetch Orders
            const { data: ordersData } = await supabase
                .from("orders")
                .select("*")
                .eq("customer_id", user?.id)
                .order("created_at", { ascending: false });

            setOrders(ordersData || []);
        } catch (error) {
            console.error(error);
        } finally {
            setLoading(false);
        }
    };

    const handleLogout = async () => {
        await supabase.auth.signOut();
        toast.success("Até logo!");
        router.push("/");
    };

    if (authLoading || loading) return (
        <div className="min-h-screen bg-soft">
            <Header />
            <div className="container mx-auto px-6 py-20 flex justify-center">
                <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin" />
            </div>
        </div>
    );

    return (
        <div className="min-h-screen bg-soft">
            <Header />

            <main className="container mx-auto px-4 lg:px-6 py-6 lg:py-12">
                <div className="grid lg:grid-cols-4 gap-8 lg:gap-12">
                    {/* Sidebar / Profile Header */}
                    <aside className="lg:col-span-1 space-y-4 sm:space-y-6">
                        <div className="bg-white p-4 sm:p-6 lg:p-8 rounded-2xl lg:rounded-[2.5rem] shadow-premium border border-white flex lg:flex-col items-center gap-4 lg:text-center group hover:border-primary/20 transition-all">
                            <div className="w-14 h-14 sm:w-16 sm:h-16 lg:w-24 lg:h-24 bg-soft rounded-xl sm:rounded-2xl lg:rounded-3xl flex items-center justify-center text-2xl lg:text-4xl relative shrink-0">
                                👤
                                <div className="absolute -bottom-1 -right-1 w-5 h-5 sm:w-6 sm:h-6 lg:w-8 lg:h-8 bg-primary rounded-lg flex items-center justify-center text-white border-2 lg:border-4 border-white shadow-vibrant">
                                    <User size={10} className="sm:w-3 sm:h-3 lg:w-4 lg:h-4" />
                                </div>
                            </div>
                            <div className="flex-1 lg:flex-none min-w-0">
                                <h2 className="text-lg lg:text-2xl font-black text-muted-text truncate">{profile?.full_name || "Cliente"}</h2>
                                <p className="text-[10px] lg:text-sm text-gray-400 font-bold uppercase tracking-widest truncate">{user?.email}</p>
                            </div>
                            <button onClick={handleLogout} className="lg:hidden p-2 text-red-400 hover:bg-red-50 rounded-lg transition-colors">
                                <LogOut size={18} />
                            </button>
                        </div>

                        {/* Tabs Selector - Mobile Optimized */}
                        <nav className="flex lg:flex-col p-1 bg-white rounded-xl sm:rounded-2xl lg:rounded-[2.5rem] shadow-premium border border-white overflow-hidden">
                            <button
                                onClick={() => setActiveTab("bags")}
                                className={`flex-1 lg:w-full flex items-center justify-center lg:justify-start gap-2 sm:gap-3 px-3 sm:px-4 lg:px-6 py-3 sm:py-4 lg:py-5 font-black text-[10px] sm:text-xs lg:text-base uppercase tracking-widest transition-all rounded-lg lg:rounded-none ${activeTab === 'bags' ? 'bg-primary text-white shadow-vibrant' : 'text-gray-400 hover:bg-soft'}`}
                            >
                                <ShoppingBag size={14} className="sm:w-4 sm:h-4 lg:w-5 lg:h-5" />
                                <span>Sacolas</span>
                            </button>
                            <button
                                onClick={() => setActiveTab("orders")}
                                className={`flex-1 lg:w-full flex items-center justify-center lg:justify-start gap-2 sm:gap-3 px-3 sm:px-4 lg:px-6 py-3 sm:py-4 lg:py-5 font-black text-[10px] sm:text-xs lg:text-base uppercase tracking-widest transition-all rounded-lg lg:rounded-none ${activeTab === 'orders' ? 'bg-secondary text-white shadow-premium' : 'text-gray-400 hover:bg-soft'}`}
                            >
                                <Package size={14} className="sm:w-4 sm:h-4 lg:w-5 lg:h-5" />
                                <span>Pedidos</span>
                            </button>
                            <button
                                onClick={handleLogout}
                                className="hidden lg:flex w-full items-center gap-4 px-6 py-5 font-black text-red-400 hover:bg-red-50 transition-all border-t border-gray-50 uppercase tracking-widest text-sm"
                            >
                                <LogOut size={20} />
                                Sair da Conta
                            </button>
                        </nav>
                    </aside>

                    {/* Content */}
                    <div className="lg:col-span-3 space-y-6">
                        <div className="hidden lg:flex items-center justify-between">
                            <h1 className="text-4xl font-black text-muted-text">
                                {activeTab === 'bags' ? "Minhas Sacolas" : "Meus Pedidos"}
                            </h1>
                        </div>

                        {activeTab === 'bags' ? (
                            <div className="bg-white rounded-2xl sm:rounded-[2.5rem] shadow-premium border border-white overflow-hidden animate-in fade-in slide-in-from-right-4 duration-500">
                                {bags.length === 0 ? (
                                    <div className="p-12 sm:p-20 text-center space-y-4">
                                        <div className="w-20 h-20 bg-soft rounded-full flex items-center justify-center mx-auto text-4xl">🛍️</div>
                                        <p className="font-black text-gray-400 uppercase tracking-widest text-[10px] sm:text-xs">Você ainda não tem sacolas ativas.</p>
                                        <Button variant="outline" className="rounded-xl font-black uppercase text-[10px] tracking-widest" onClick={() => router.push('/catalogo')}>Catálogo</Button>
                                    </div>
                                ) : (
                                    <div className="divide-y divide-gray-50">
                                        {bags.map((bag) => (
                                            <div key={bag.id} className="dense-row group active:bg-soft transition-colors" onClick={() => router.push(`/checkout/sacola/${bag.id}`)}>
                                                <div className="w-10 h-10 sm:w-12 sm:h-12 bg-soft rounded-lg sm:rounded-xl flex items-center justify-center text-lg shrink-0 overflow-hidden group-hover:scale-110 transition-transform">
                                                    {bag.bag_items[0]?.products?.image_url ? (
                                                        <img src={bag.bag_items[0].products.image_url} alt="" className="w-full h-full object-cover" />
                                                    ) : "🛍️"}
                                                </div>
                                                <div className="flex-1 min-w-0">
                                                    <h3 className="font-black text-muted-text text-sm sm:text-base truncate">Sacola #{bag.id.slice(0, 6)}</h3>
                                                    <div className="flex items-center gap-2 text-[9px] sm:text-xs text-gray-400 font-bold uppercase tracking-wider">
                                                        <Clock size={10} className="text-secondary" />
                                                        Expira {new Date(bag.expires_at).toLocaleDateString()}
                                                    </div>
                                                </div>
                                                <div className="text-right shrink-0 flex items-center gap-3">
                                                    <div className="text-[10px] sm:text-sm font-black text-primary uppercase tracking-widest">
                                                        {bag.bag_items.reduce((acc: number, cur: any) => acc + (cur.quantity), 0)} un.
                                                    </div>
                                                    <ChevronRight size={14} className="text-gray-200 group-hover:text-primary transition-colors group-hover:translate-x-1 duration-300" />
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        ) : (
                            <div className="bg-white rounded-2xl sm:rounded-[2.5rem] shadow-premium border border-white overflow-hidden animate-in fade-in slide-in-from-right-4 duration-500">
                                {orders.length === 0 ? (
                                    <div className="p-12 sm:p-20 text-center space-y-4">
                                        <div className="w-20 h-20 bg-soft rounded-full flex items-center justify-center mx-auto text-4xl">📦</div>
                                        <p className="font-black text-gray-400 uppercase tracking-widest text-[10px] sm:text-xs">Sua lista de pedidos está vazia.</p>
                                        <Button variant="outline" className="rounded-xl font-black uppercase text-[10px] tracking-widest" onClick={() => router.push('/catalogo')}>Começar</Button>
                                    </div>
                                ) : (
                                    <div className="divide-y divide-gray-50">
                                        {orders.map((order) => (
                                            <div key={order.id} className="dense-row active:bg-soft transition-colors">
                                                <div className="w-10 h-10 sm:w-12 sm:h-12 bg-primary/10 text-primary rounded-lg sm:rounded-xl flex items-center justify-center text-xl shrink-0">
                                                    <Package size={20} />
                                                </div>
                                                <div className="flex-1 min-w-0">
                                                    <h3 className="font-black text-muted-text text-sm sm:text-base truncate">Pedido #{order.order_number || order.id.slice(0, 6)}</h3>
                                                    <div className="text-[9px] sm:text-xs font-bold text-gray-400 uppercase tracking-widest">
                                                        {new Date(order.created_at).toLocaleDateString()}
                                                    </div>
                                                </div>
                                                <div className="text-right shrink-0 flex flex-col items-end gap-1 sm:gap-1.5">
                                                    <div className="text-xs sm:text-base font-black text-primary leading-none">R$ {order.total_amount.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</div>
                                                    <span className={`px-2 py-0.5 rounded-full text-[7px] sm:text-[9px] font-black uppercase tracking-widest shadow-sm ${order.status === 'paid' ? 'bg-green-500 text-white' :
                                                        order.status === 'pending' ? 'bg-secondary text-white' :
                                                            'bg-gray-100 text-gray-400'
                                                        }`}>
                                                        {order.status === 'paid' ? 'Pago' : order.status === 'pending' ? 'Pendente' : order.status}
                                                    </span>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        )}
                    </div>
                </div>
            </main>
        </div>
    );
}
