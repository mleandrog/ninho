"use client";

import { motion, AnimatePresence } from "framer-motion";
import { X, AlertCircle, Trash2, Info, CheckCircle2 } from "lucide-react";
import { Button } from "./Button";

interface ConfirmModalProps {
    isOpen: boolean;
    onClose: () => void;
    onConfirm: () => void;
    title: string;
    message: string;
    confirmText?: string;
    cancelText?: string;
    type?: "danger" | "info" | "success" | "warning";
    loading?: boolean;
}

export function ConfirmModal({
    isOpen,
    onClose,
    onConfirm,
    title,
    message,
    confirmText = "Confirmar",
    cancelText = "Cancelar",
    type = "info",
    loading = false,
}: ConfirmModalProps) {
    const icons = {
        danger: <Trash2 className="text-red-500" size={32} />,
        info: <Info className="text-primary" size={32} />,
        success: <CheckCircle2 className="text-green-500" size={32} />,
        warning: <AlertCircle className="text-amber-500" size={32} />,
    };

    const colors = {
        danger: "bg-red-50 text-red-600",
        info: "bg-primary/10 text-primary",
        success: "bg-green-50 text-green-600",
        warning: "bg-amber-50 text-amber-600",
    };

    const buttonVariants = {
        danger: "bg-red-500 hover:bg-red-600",
        info: "bg-primary hover:bg-primary/90",
        success: "bg-green-500 hover:bg-green-600",
        warning: "bg-amber-500 hover:bg-amber-600",
    };

    return (
        <AnimatePresence>
            {isOpen && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-6">
                    {/* Ovelay */}
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        onClick={onClose}
                        className="absolute inset-0 bg-black/40 backdrop-blur-md"
                    />

                    {/* Modal Content */}
                    <motion.div
                        initial={{ opacity: 0, scale: 0.9, y: 20 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.9, y: 20 }}
                        className="relative w-full max-w-md bg-white rounded-[2.5rem] shadow-2xl p-8 lg:p-10 overflow-hidden border border-white"
                    >
                        {/* Design Ornaments */}
                        <div className={`absolute top-0 right-0 w-32 h-32 opacity-10 blur-3xl rounded-full translate-x-12 -translate-y-12 ${type === 'danger' ? 'bg-red-500' : 'bg-primary'}`} />

                        <div className="relative z-10 flex flex-col items-center text-center space-y-6">
                            {/* Icon Circle */}
                            <div className={`w-20 h-20 rounded-[2rem] flex items-center justify-center shadow-inner ${colors[type]}`}>
                                {icons[type]}
                            </div>

                            <div className="space-y-2">
                                <h3 className="text-2xl lg:text-3xl font-black text-muted-text lowercase tracking-tighter">
                                    {title}
                                </h3>
                                <p className="text-sm lg:text-base font-bold text-gray-500 leading-relaxed">
                                    {message}
                                </p>
                            </div>

                            <div className="flex flex-col sm:flex-row gap-3 w-full pt-4">
                                <Button
                                    variant="outline"
                                    onClick={onClose}
                                    disabled={loading}
                                    className="h-14 rounded-2xl font-black lowercase flex-1 border-gray-100 hover:bg-soft"
                                >
                                    {cancelText}
                                </Button>
                                <Button
                                    onClick={onConfirm}
                                    isLoading={loading}
                                    className={`h-14 rounded-2xl font-black lowercase flex-1 shadow-vibrant ${buttonVariants[type]} text-white border-none`}
                                >
                                    {confirmText}
                                </Button>
                            </div>
                        </div>

                        <button
                            onClick={onClose}
                            className="absolute top-6 right-6 p-2 text-gray-400 hover:bg-soft rounded-xl transition-all active:scale-90"
                        >
                            <X size={20} />
                        </button>
                    </motion.div>
                </div>
            )}
        </AnimatePresence>
    );
}
