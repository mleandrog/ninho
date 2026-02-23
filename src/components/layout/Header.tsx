"use client";

import { Button } from "@/components/ui/Button";
import { ShoppingBag, Search, User, Menu } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { CartDrawer } from "@/components/cart/CartDrawer";
import { useCart } from "@/hooks/useCart";
import { useAuth } from "@/contexts/AuthContext";

export function Header() {
    const [isDrawerOpen, setIsDrawerOpen] = useState(false);
    const { totalItems } = useCart();
    const { user } = useAuth();

    return (
        <>
            <header className="sticky top-0 z-50 bg-white/80 backdrop-blur-md border-b border-white/20">
                <div className="container mx-auto px-6 h-20 flex items-center justify-between">
                    <Link href="/" className="flex items-center gap-2">
                        <div className="w-10 h-10 bg-primary rounded-xl flex items-center justify-center text-white font-bold text-xl shadow-vibrant">
                            N
                        </div>
                        <span className="text-xl font-extrabold text-muted-text hidden sm:block">Ninho Lar</span>
                    </Link>

                    <nav className="hidden md:flex items-center gap-8 font-semibold text-muted-text">
                        <Link href="/catalogo" className="hover:text-primary transition-colors">Catálogo</Link>
                        <Link href="/sobre" className="hover:text-primary transition-colors">Sobre</Link>
                        <Link href="/contato" className="hover:text-primary transition-colors">Contato</Link>
                    </nav>

                    <div className="flex items-center gap-2 sm:gap-4">
                        <Button variant="ghost" className="p-2 rounded-full hidden sm:flex">
                            <Search size={22} />
                        </Button>

                        <Link href={user ? "/perfil" : "/login"}>
                            <Button variant="ghost" className="p-2 rounded-full">
                                <User size={22} className={user ? "text-primary" : ""} />
                            </Button>
                        </Link>

                        <Button
                            variant="ghost"
                            className="p-2 rounded-full relative"
                            onClick={() => setIsDrawerOpen(true)}
                        >
                            <ShoppingBag size={22} />
                            {totalItems() > 0 && (
                                <span className="absolute top-0 right-0 w-4 h-4 bg-primary text-white text-[10px] rounded-full flex items-center justify-center animate-bounce">
                                    {totalItems()}
                                </span>
                            )}
                        </Button>

                        <Button variant="ghost" className="p-2 rounded-full md:hidden">
                            <Menu size={22} />
                        </Button>
                    </div>
                </div>
            </header>

            <CartDrawer isOpen={isDrawerOpen} onClose={() => setIsDrawerOpen(false)} />
        </>
    );
}
