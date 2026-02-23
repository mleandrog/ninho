"use client";

import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { ShoppingBag, Heart } from "lucide-react";
import { useCart } from "@/hooks/useCart";
import Link from "next/link";

interface ProductCardProps {
    product: {
        id: number | string;
        name: string;
        price: number;
        category: string;
        images?: string[];
    };
}

export function ProductCard({ product }: ProductCardProps) {
    const { addItem } = useCart();

    return (
        <Card className="group overflow-hidden p-0 rounded-[2rem] border-none shadow-premium bg-white">
            <Link href={`/produtos/${product.id}`} className="block">
                <div className="aspect-[4/5] bg-soft flex items-center justify-center text-8xl relative overflow-hidden">
                    {/* Placeholder Emoji based on Category */}
                    <span className="group-hover:scale-110 transition-transform duration-500">
                        {product.category === 'Vestidos' ? "👗" : product.category === 'Bebês' ? "👶" : "👕"}
                    </span>

                    <button
                        type="button"
                        className="absolute top-4 right-4 p-2.5 bg-white/70 backdrop-blur-md rounded-xl opacity-0 group-hover:opacity-100 transition-all duration-300 z-10"
                        onClick={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            // Adicionaremos lógica de favoritos no futuro
                        }}
                    >
                        <Heart size={20} className="text-gray-400 hover:text-primary transition-colors" />
                    </button>
                </div>
            </Link>

            <div className="p-6 space-y-3">
                <span className="text-xs font-bold text-secondary uppercase tracking-[0.15em]">
                    {product.category}
                </span>
                <Link href={`/produtos/${product.id}`}>
                    <h3 className="text-lg font-black text-muted-text leading-tight group-hover:text-primary transition-colors">
                        {product.name}
                    </h3>
                </Link>
                <div className="flex items-center justify-between pt-1">
                    <span className="text-xl font-black text-primary">
                        R$ {product.price.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
                    </span>
                    <Button
                        size="sm"
                        className="w-10 h-10 p-0 rounded-xl"
                        onClick={() => addItem(product)}
                    >
                        <ShoppingBag size={18} />
                    </Button>
                </div>
            </div>
        </Card>
    );
}
