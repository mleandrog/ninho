"use client";

import { useCart } from "@/hooks/useCart";
import { Button } from "@/components/ui/Button";
import { ShoppingBag, X, Trash2, Plus, Minus } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "react-hot-toast";
import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import Link from "next/link";

export function CartDrawer({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) {
    const { items, removeItem, updateQuantity, totalPrice, clearCart } = useCart();
    const { user } = useAuth();
    const [isSaving, setIsSaving] = useState(false);

    const handleSaveBag = async () => {
        if (!user) {
            toast.error("Você precisa estar logado para criar uma sacola.");
            return;
        }

        if (items.length === 0) {
            toast.error("O carrinho está vazio.");
            return;
        }

        setIsSaving(true);
        try {
            // 1. Create Bag
            const expiresAt = new Date();
            expiresAt.setDate(expiresAt.getDate() + 30);

            const { data: bag, error: bagError } = await supabase
                .from("bags")
                .insert({
                    customer_id: user.id,
                    expires_at: expiresAt.toISOString(),
                })
                .select()
                .single();

            if (bagError) throw bagError;

            // 2. Add Items to Bag
            const bagItems = items.map((item) => ({
                bag_id: bag.id,
                product_id: item.id,
                quantity: item.quantity,
            }));

            const { error: itemsError } = await supabase.from("bag_items").insert(bagItems);
            if (itemsError) throw itemsError;

            toast.success("Sacola criada com sucesso! Itens reservados por 30 dias.");
            clearCart();
            onClose();
        } catch (error: any) {
            toast.error("Erro ao salvar sacola: " + error.message);
        } finally {
            setIsSaving(false);
        }
    };

    return (
        <AnimatePresence>
            {isOpen && (
                <>
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        onClick={onClose}
                        className="fixed inset-0 bg-black/40 z-[60] backdrop-blur-sm"
                    />
                    <motion.div
                        initial={{ x: "100%" }}
                        animate={{ x: 0 }}
                        exit={{ x: "100%" }}
                        transition={{ type: "spring", damping: 25, stiffness: 200 }}
                        className="fixed right-0 top-0 bottom-0 w-full max-w-md bg-white z-[70] shadow-2xl flex flex-col"
                    >
                        <div className="p-6 border-b border-gray-100 flex items-center justify-between bg-soft">
                            <div className="flex items-center gap-3">
                                <ShoppingBag className="text-primary" />
                                <h2 className="text-2xl font-black text-muted-text">Meu Carrinho</h2>
                            </div>
                            <Button variant="ghost" onClick={onClose} className="p-2 rounded-full">
                                <X size={24} />
                            </Button>
                        </div>

                        <div className="flex-1 overflow-y-auto p-6 space-y-6">
                            {items.length === 0 ? (
                                <div className="h-full flex flex-col items-center justify-center text-center space-y-4">
                                    <div className="text-6xl italic">🛒</div>
                                    <p className="text-gray-400 font-bold">Seu carrinho está vazio.</p>
                                </div>
                            ) : (
                                items.map((item) => (
                                    <div key={item.id} className="flex gap-4 items-center bg-soft p-4 rounded-2xl border border-white">
                                        <div className="w-20 h-20 bg-white rounded-xl flex items-center justify-center text-3xl">
                                            {item.category === 'Vestidos' ? "👗" : item.category === 'Bebês' ? "👶" : "👕"}
                                        </div>
                                        <div className="flex-1">
                                            <h4 className="font-bold text-muted-text leading-tight">{item.name}</h4>
                                            <p className="text-primary font-black mt-1">
                                                R$ {(item.price * item.quantity).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
                                            </p>

                                            <div className="flex items-center gap-4 mt-3">
                                                <div className="flex items-center bg-white rounded-lg border border-gray-100">
                                                    <button
                                                        onClick={() => updateQuantity(item.id, item.quantity - 1)}
                                                        className="p-1 hover:text-primary transition-colors"
                                                    >
                                                        <Minus size={16} />
                                                    </button>
                                                    <span className="w-8 text-center font-bold text-sm">{item.quantity}</span>
                                                    <button
                                                        onClick={() => updateQuantity(item.id, item.quantity + 1)}
                                                        className="p-1 hover:text-primary transition-colors"
                                                    >
                                                        <Plus size={16} />
                                                    </button>
                                                </div>
                                                <button onClick={() => removeItem(item.id)} className="text-gray-400 hover:text-red-500 transition-colors">
                                                    <Trash2 size={18} />
                                                </button>
                                            </div>
                                        </div>
                                    </div>
                                ))
                            )}
                        </div>

                        {items.length > 0 && (
                            <div className="p-8 border-t border-gray-100 bg-white space-y-4">
                                <div className="flex items-center justify-between">
                                    <span className="text-gray-500 font-bold">Total</span>
                                    <span className="text-3xl font-black text-primary">
                                        R$ {totalPrice().toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
                                    </span>
                                </div>

                                <div className="grid gap-3">
                                    <Button className="w-full h-14 text-lg">
                                        Ir para o Pagamento
                                    </Button>
                                    <Button
                                        variant="secondary"
                                        className="w-full h-14 text-lg"
                                        onClick={handleSaveBag}
                                        isLoading={isSaving}
                                    >
                                        Monto minha Sacola (30 dias)
                                    </Button>
                                </div>
                            </div>
                        )}
                    </motion.div>
                </>
            )}
        </AnimatePresence>
    );
}
