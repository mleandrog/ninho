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

            <main className="container mx-auto px-6 py-12">
                <div className="grid lg:grid-cols-4 gap-12">
                    {/* Sidebar */}
                    <aside className="lg:col-span-1 space-y-8">
                        <div className="bg-white p-8 rounded-[2.5rem] shadow-premium border border-white/20 flex flex-col items-center text-center">
                            <div className="w-24 h-24 bg-soft rounded-3xl flex items-center justify-center text-4xl mb-4 relative">
                                👤
                                <div className="absolute -bottom-1 -right-1 w-8 h-8 bg-primary rounded-xl flex items-center justify-center text-white border-4 border-white">
                                    <User size={14} />
                                </div>
                            </div>
                            <h2 className="text-2xl font-black text-muted-text">{profile?.full_name || "Cliente"}</h2>
                            <p className="text-gray-400 font-medium text-sm">{user?.email}</p>
                        </div>

                        <nav className="bg-white rounded-[2.5rem] shadow-premium border border-white/20 overflow-hidden">
                            <button
                                onClick={() => setActiveTab("bags")}
                                className={`w-full flex items-center gap-4 px-6 py-5 font-bold transition-all ${activeTab === 'bags' ? 'bg-primary text-white shadow-vibrant' : 'text-gray-500 hover:bg-soft'}`}
                            >
                                <ShoppingBag size={20} />
                                Minhas Sacolas
                            </button>
                            <button
                                onClick={() => setActiveTab("orders")}
                                className={`w-full flex items-center gap-4 px-6 py-5 font-bold transition-all ${activeTab === 'orders' ? 'bg-secondary text-white shadow-premium' : 'text-gray-500 hover:bg-soft'}`}
                            >
                                <Package size={20} />
                                Meus Pedidos
                            </button>
                            <button
                                onClick={handleLogout}
                                className="w-full flex items-center gap-4 px-6 py-5 font-bold text-red-400 hover:bg-red-50 transition-all border-t border-gray-50"
                            >
                                <LogOut size={20} />
                                Sair da Conta
                            </button>
                        </nav>
                    </aside>

                    {/* Content */}
                    <div className="lg:col-span-3 space-y-8">
                        <div className="flex items-center justify-between">
                            <h1 className="text-4xl font-black text-muted-text">
                                {activeTab === 'bags' ? "Minhas Sacolas" : "Meus Pedidos"}
                            </h1>
                        </div>

                        {activeTab === 'bags' ? (
                            <div className="grid gap-6">
                                {bags.length === 0 ? (
                                    <div className="bg-white rounded-[2.5rem] p-20 text-center space-y-4 shadow-premium border border-white">
                                        <span className="text-6xl italic">🛍️</span>
                                        <p className="text-xl font-bold text-gray-400">Você ainda não tem sacolas ativas.</p>
                                        <Button variant="outline" onClick={() => router.push('/catalogo')}>Ir para o Catálogo</Button>
                                    </div>
                                ) : (
                                    bags.map((bag) => (
                                        <div key={bag.id} className="bg-white rounded-[2.5rem] p-8 shadow-premium border border-white flex flex-col md:flex-row gap-8 items-center group hover:border-primary/20 transition-all">
                                            <div className="grid grid-cols-2 gap-2 w-full md:w-32">
                                                {bag.bag_items.slice(0, 4).map((item: any, idx: number) => (
                                                    <div key={idx} className="aspect-square bg-soft rounded-xl flex items-center justify-center text-xl">
                                                        {item.products.categories.name === 'Vestidos' ? "👗" : item.products.categories.name === 'Bebês' ? "👶" : "👕"}
                                                    </div>
                                                ))}
                                            </div>
                                            <div className="flex-1 space-y-1">
                                                <h3 className="text-xl font-black text-muted-text">Sacola #{bag.id.slice(0, 8)}</h3>
                                                <div className="flex items-center gap-2 text-gray-400 font-medium">
                                                    <Clock size={16} />
                                                    Expira em: {new Date(bag.expires_at).toLocaleDateString()}
                                                </div>
                                                <p className="text-primary font-black pt-2">
                                                    {bag.bag_items.reduce((acc: number, cur: any) => acc + (cur.quantity), 0)} itens reservados
                                                </p>
                                            </div>
                                            <Button variant="outline" className="rounded-2xl group-hover:bg-primary group-hover:text-white group-hover:border-primary transition-all">
                                                Ver Detalhes <ChevronRight size={18} className="ml-2" />
                                            </Button>
                                        </div>
                                    ))
                                )}
                            </div>
                        ) : (
                            <div className="grid gap-6">
                                {orders.length === 0 ? (
                                    <div className="bg-white rounded-[2.5rem] p-20 text-center space-y-4 shadow-premium border border-white">
                                        <span className="text-6xl italic">📦</span>
                                        <p className="text-xl font-bold text-gray-400">Sua lista de pedidos está vazia.</p>
                                        <Button variant="outline" onClick={() => router.push('/catalogo')}>Começar a Comprar</Button>
                                    </div>
                                ) : (
                                    orders.map((order) => (
                                        <div key={order.id} className="bg-white rounded-[2.5rem] p-8 shadow-premium border border-white flex justify-between items-center">
                                            <div className="space-y-1">
                                                <h3 className="text-xl font-black text-muted-text">Pedido #{order.id.slice(0, 8)}</h3>
                                                <div className="text-sm font-bold text-gray-400 uppercase tracking-widest">{new Date(order.created_at).toLocaleDateString()}</div>
                                            </div>
                                            <div className="text-right space-y-1">
                                                <div className="text-2xl font-black text-primary">R$ {order.total_amount.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</div>
                                                <span className="inline-block px-3 py-1 bg-yellow-100 text-yellow-600 rounded-full text-xs font-black uppercase">
                                                    {order.status}
                                                </span>
                                            </div>
                                        </div>
                                    ))
                                )}
                            </div>
                        )}
                    </div>
                </div>
            </main>
        </div>
    );
}
