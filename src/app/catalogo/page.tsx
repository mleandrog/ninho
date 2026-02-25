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
            const { data: catData } = await supabase.from("categories").select("*");
            setCategories(catData || []);

            const { data: prodData } = await supabase
                .from("products")
                .select("*, categories(name, slug)")
                .eq("available_in_store", true) // Ocultar produtos 'Aguardando'
                .eq("is_whatsapp_exclusive", false); // Ocultar produtos exclusivos do WA
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
