"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { Header } from "@/components/layout/Header";
import { ProductGallery } from "@/components/product/ProductGallery";
import { Button } from "@/components/ui/Button";
import { useCart } from "@/hooks/useCart";
import { ShoppingBag, Heart, ArrowLeft, Truck, ShieldCheck, RefreshCcw } from "lucide-react";
import { ProductCard } from "@/components/catalog/ProductCard";
import { toast } from "react-hot-toast";

export default function ProductDetailPage() {
    const { id } = useParams();
    const router = useRouter();
    const { addItem } = useCart();
    const [product, setProduct] = useState<any>(null);
    const [relatedProducts, setRelatedProducts] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (id) fetchProduct();
    }, [id]);

    const fetchProduct = async () => {
        setLoading(true);
        try {
            const { data, error } = await supabase
                .from("products")
                .select("*, categories(name, slug)")
                .eq("id", id)
                .single();

            if (error || !data) {
                toast.error("Produto não encontrado.");
                router.push("/catalogo");
                return;
            }

            setProduct(data);

            // Fetch related
            const { data: related } = await supabase
                .from("products")
                .select("*, categories(name, slug)")
                .eq("category_id", data.category_id)
                .neq("id", data.id)
                .limit(4);

            setRelatedProducts(related || []);
        } catch (error) {
            console.error(error);
        } finally {
            setLoading(false);
        }
    };

    if (loading) return (
        <div className="min-h-screen bg-soft">
            <Header />
            <div className="container mx-auto px-6 py-20 animate-pulse space-y-8">
                <div className="h-8 w-32 bg-gray-200 rounded-lg" />
                <div className="grid lg:grid-cols-2 gap-12">
                    <div className="aspect-[4/5] bg-gray-200 rounded-[2.5rem]" />
                    <div className="space-y-6">
                        <div className="h-12 w-3/4 bg-gray-200 rounded-lg" />
                        <div className="h-6 w-1/4 bg-gray-200 rounded-lg" />
                        <div className="h-32 w-full bg-gray-200 rounded-lg" />
                    </div>
                </div>
            </div>
        </div>
    );

    return (
        <div className="min-h-screen bg-soft">
            <Header />

            <main className="container mx-auto px-6 py-12">
                <button
                    onClick={() => router.back()}
                    className="flex items-center gap-2 text-gray-500 font-bold hover:text-primary transition-colors mb-8"
                >
                    <ArrowLeft size={20} />
                    Voltar
                </button>

                <div className="grid lg:grid-cols-2 gap-12 items-start">
                    <ProductGallery images={product.images || []} category={product.categories?.name} />

                    <div className="space-y-10">
                        <div className="space-y-4">
                            <span className="inline-block px-4 py-1.5 bg-secondary/10 text-secondary font-black text-xs uppercase tracking-widest rounded-full">
                                {product.categories?.name}
                            </span>
                            <h1 className="text-4xl lg:text-5xl font-black text-muted-text leading-tight">
                                {product.name}
                            </h1>
                            <div className="text-3xl font-black text-primary">
                                R$ {product.price.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
                            </div>
                        </div>

                        <div className="space-y-4">
                            <h3 className="text-lg font-black text-muted-text">Descrição</h3>
                            <p className="text-gray-500 leading-relaxed font-medium">
                                {product.description || "Este produtinho foi escolhido com muito carinho para garantir o máximo de conforto e estilo para o seu pequeno ninho."}
                            </p>
                        </div>

                        <div className="flex flex-col sm:flex-row gap-4 pt-6">
                            <Button size="lg" className="h-16 px-10 text-lg flex-1 gap-3" onClick={() => addItem(product)}>
                                <ShoppingBag size={22} />
                                Adicionar ao Carrinho
                            </Button>
                            <Button variant="outline" size="lg" className="h-16 w-16 p-0 group">
                                <Heart size={22} className="text-gray-400 group-hover:text-primary transition-colors" />
                            </Button>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 pt-10 border-t border-white">
                            <div className="flex items-center gap-3">
                                <div className="p-3 bg-white rounded-xl text-primary"><Truck size={20} /></div>
                                <div className="text-sm font-bold text-muted-text">Entrega Rápida</div>
                            </div>
                            <div className="flex items-center gap-3">
                                <div className="p-3 bg-white rounded-xl text-secondary"><ShieldCheck size={20} /></div>
                                <div className="text-sm font-bold text-muted-text">Compra Segura</div>
                            </div>
                            <div className="flex items-center gap-3">
                                <div className="p-3 bg-white rounded-xl text-accent-foreground"><RefreshCcw size={20} /></div>
                                <div className="text-sm font-bold text-muted-text">Decom. Grátis</div>
                            </div>
                        </div>
                    </div>
                </div>

                {relatedProducts.length > 0 && (
                    <section className="mt-32 space-y-12">
                        <div className="flex items-center justify-between">
                            <h2 className="text-3xl font-black text-muted-text">Você também vai amar</h2>
                            <Button variant="ghost">Ver Tudo</Button>
                        </div>
                        <div className="grid md:grid-cols-4 gap-8">
                            {relatedProducts.map((p) => (
                                <ProductCard key={p.id} product={{ ...p, category: p.categories?.name }} />
                            ))}
                        </div>
                    </section>
                )}
            </main>
        </div>
    );
}
