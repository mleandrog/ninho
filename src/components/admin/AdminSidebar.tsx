"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
    LayoutDashboard,
    Package,
    ShoppingBag,
    Settings,
    LogOut,
    ChevronRight,
    TrendingUp,
    FolderTree,
    MessageSquare,
    Truck,
    Users,
    MapPin,
    X
} from "lucide-react";
import { clsx } from "clsx";

const menuItems = [
    { icon: LayoutDashboard, label: "Dashboard", href: "/admin" },
    { icon: Package, label: "Produtos", href: "/admin/produtos" },
    { icon: FolderTree, label: "Categorias", href: "/admin/categorias" },
    { icon: ShoppingBag, label: "Pedidos", href: "/admin/pedidos" },
    { icon: Users, label: "Clientes", href: "/admin/clientes" },
    { icon: MessageSquare, label: "Campanhas", href: "/admin/whatsapp" },
    { icon: Truck, label: "Entregadores", href: "/admin/entregadores" },
    { icon: MapPin, label: "Zonas de Frete", href: "/admin/frete" },
    { icon: TrendingUp, label: "Relatórios", href: "/admin/relatorios" },
    { icon: Settings, label: "Configurações", href: "/admin/configuracoes" },
];

export function AdminSidebar({ onClose }: { onClose?: () => void }) {
    const pathname = usePathname();

    return (
        <aside className="w-80 bg-white border-r border-gray-100 flex flex-col h-screen overflow-y-auto">
            <div className="p-8">
                <div className="flex items-center justify-between mb-12">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-primary rounded-xl flex items-center justify-center text-white font-black text-xl shadow-vibrant">
                            N
                        </div>
                        <span className="text-2xl font-black text-muted-text tracking-tight">Admin<span className="text-primary">Lar</span></span>
                    </div>
                    {/* Botão para fechar no mobile */}
                    {onClose && (
                        <button
                            onClick={onClose}
                            className="lg:hidden p-2 text-gray-400 hover:text-muted-text hover:bg-soft rounded-xl transition-all"
                        >
                            <X size={24} />
                        </button>
                    )}
                </div>

                <nav className="space-y-2">
                    {menuItems.map((item) => {
                        const isActive = pathname === item.href;
                        return (
                            <Link
                                key={item.href}
                                href={item.href}
                                onClick={() => onClose?.()}
                                className={clsx(
                                    "flex items-center justify-between px-6 py-4 rounded-2xl font-bold transition-all group",
                                    isActive
                                        ? "bg-primary text-white shadow-vibrant"
                                        : "text-gray-400 hover:bg-soft hover:text-muted-text"
                                )}
                            >
                                <div className="flex items-center gap-4">
                                    <item.icon size={22} className={clsx(isActive ? "text-white" : "group-hover:text-primary")} />
                                    {item.label}
                                </div>
                                {isActive && <ChevronRight size={18} />}
                            </Link>
                        );
                    })}
                </nav>
            </div>

            <div className="mt-auto p-8">
                <button className="flex items-center gap-4 px-6 py-4 w-full rounded-2xl font-bold text-red-400 hover:bg-red-50 transition-all">
                    <LogOut size={22} />
                    Sair do Admin
                </button>
            </div>
        </aside>
    );
}
