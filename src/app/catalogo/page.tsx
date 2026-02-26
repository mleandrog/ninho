"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { ProductCard } from "@/components/catalog/ProductCard";
import { CategoryFilter } from "@/components/catalog/CategoryFilter";
import { Input } from "@/components/ui/Input";
import { Search } from "lucide-react";
import { Header } from "@/components/layout/Header";

export default function CatalogPage() {
    const [products, setProducts] = useState<any[]>([]);
    const [categories, setCategories] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
    const [search, setSearch] = useState("");

    useEffect(() => {
        fetchData();
    }, []);

    const fetchData = async () => {
        setLoading(true);
        try {
            // 1. Verificar nível do usuário logado
            const { data: { user } } = await supabase.auth.getUser();
            let userLevelId: string | null = null;
            if (user) {
                const { data: profile } = await supabase
                    .from('profiles')
                    .select('customer_level_id')
                    .eq('id', user.id)
                    .single();
                userLevelId = profile?.customer_level_id ?? null;
            }

            // 2. Buscar todos os acessos de categoria
            const { data: accesses } = await supabase
                .from('category_level_access')
                .select('category_id, level_id');

            // 3. Buscar categorias e filtrar por visibilidade
            const { data: catData } = await supabase.from("categories").select("*");
            const allAccesses = accesses || [];

            const visibleCats = (catData || []).filter(cat => {
                const catRestrictions = allAccesses.filter(a => a.category_id === cat.id);
                // Sem restrição = pública para todos
                if (catRestrictions.length === 0) return true;
                // Com restrição = só se o usuário tem o nível permitido
                return userLevelId && catRestrictions.some(a => a.level_id === userLevelId);
            });
            setCategories(visibleCats);

            // 4. Buscar produtos (apenas das categorias visíveis)
            const visibleCatIds = visibleCats.map(c => c.id);
            const { data: prodData } = await supabase
                .from("products")
                .select("*, categories(name, slug)")
                .eq("available_in_store", true)
                .eq("whatsapp_exclusive", false)
                .in("category_id", visibleCatIds.length > 0 ? visibleCatIds : [-1]);
            setProducts(prodData || []);
        } catch (error) {
            console.error("Error fetching data:", error);
        } finally {
            setLoading(false);
        }
    };

    const filteredProducts = products.filter((p) => {
        const matchesCategory = selectedCategory
            ? p.categories?.slug === selectedCategory
            : true;
        const matchesSearch = p.name.toLowerCase().includes(search.toLowerCase());
        return matchesCategory && matchesSearch;
    });

    return (
        <div className="min-h-screen bg-soft">
            <Header />
            <div className="container mx-auto px-6 py-12">
                <header className="mb-12 space-y-8">
                    <div className="space-y-2">
                        <h1 className="text-4xl lg:text-5xl font-black text-muted-text">Nosso Catálogo</h1>
                        <p className="text-gray-500 font-medium">Explore as melhores peças para o conforto do seu ninho.</p>
                    </div>

                    <div className="flex flex-col md:flex-row gap-6 md:items-center">
                        <div className="relative flex-1">
                            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
                            <Input
                                placeholder="O que você está procurando?"
                                className="pl-12 bg-white"
                                value={search}
                                onChange={(e) => setSearch(e.target.value)}
                            />
                        </div>
                    </div>
                </header>

                <section>
                    <CategoryFilter
                        categories={categories}
                        selectedCategory={selectedCategory}
                        onSelect={setSelectedCategory}
                    />

                    {loading ? (
                        <div className="grid md:grid-cols-3 lg:grid-cols-4 gap-8">
                            {[1, 2, 3, 4].map((n) => (
                                <div key={n} className="h-[400px] bg-white/50 animate-pulse rounded-[2rem]" />
                            ))}
                        </div>
                    ) : (
                        <div className="grid md:grid-cols-3 lg:grid-cols-4 gap-8">
                            {filteredProducts.map((product) => (
                                <ProductCard key={product.id} product={{ ...product, category: product.categories?.name }} />
                            ))}
                            {filteredProducts.length === 0 && (
                                <div className="col-span-full py-20 text-center space-y-4">
                                    <span className="text-6xl italic">🔍</span>
                                    <p className="text-xl font-bold text-gray-400">Nenhum produto encontrado.</p>
                                </div>
                            )}
                        </div>
                    )}
                </section>
            </div>
        </div>
    );
}
