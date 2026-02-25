"use client";

import { useAuth } from "@/contexts/AuthContext";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { toast } from "react-hot-toast";
import { AdminSidebar } from "@/components/admin/AdminSidebar";
import { AdminMobileNav } from "@/components/admin/AdminMobileNav";
import { clsx } from "clsx";

export default function AdminLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    const { user, profile, loading } = useAuth();
    const router = useRouter();
    const [isSidebarOpen, setIsSidebarOpen] = useState(false);

    useEffect(() => {
        if (!loading) {
            if (!user) {
                router.push("/login");
            } else if (profile && profile.role !== 'admin') {
                router.push("/");
                toast.error("Acesso restrito a administradores");
            }
        }
    }, [user, profile, loading, router]);

    if (loading || !user || (profile && profile.role !== 'admin')) {
        return (
            <div className="min-h-screen bg-soft flex items-center justify-center">
                <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin" />
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-soft flex flex-col lg:flex-row">
            {/* Navegação Mobile (Top Bar) */}
            <AdminMobileNav onOpenSidebar={() => setIsSidebarOpen(true)} />

            {/* Overlay para fechar sidebar mobile ao clicar fora */}
            {isSidebarOpen && (
                <div
                    className="fixed inset-0 bg-black/50 z-40 lg:hidden backdrop-blur-sm transition-all"
                    onClick={() => setIsSidebarOpen(false)}
                />
            )}

            {/* Sidebar (Desktop fixo, Mobile Drawer) */}
            <div className={clsx(
                "fixed inset-y-0 left-0 z-50 transform transition-transform duration-300 lg:relative lg:translate-x-0",
                isSidebarOpen ? "translate-x-0" : "-translate-x-full"
            )}>
                <AdminSidebar onClose={() => setIsSidebarOpen(false)} />
            </div>

            {/* Conteúdo Principal */}
            <main className="flex-1 overflow-x-hidden p-6 lg:p-12">
                {children}
            </main>
        </div>
    );
}
