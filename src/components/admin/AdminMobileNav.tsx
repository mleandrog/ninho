"use client";

import { Menu } from "lucide-react";

interface AdminMobileNavProps {
    onOpenSidebar: () => void;
}

export function AdminMobileNav({ onOpenSidebar }: AdminMobileNavProps) {
    return (
        <header className="lg:hidden bg-white border-b border-gray-100 p-4 sticky top-0 z-30 flex items-center justify-between">
            <div className="flex items-center gap-3">
                <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center text-white font-black text-sm shadow-vibrant">
                    N
                </div>
                <span className="text-lg font-black text-muted-text tracking-tight">Admin<span className="text-primary">Lar</span></span>
            </div>

            <button
                onClick={onOpenSidebar}
                className="p-2 text-gray-400 hover:text-muted-text hover:bg-soft rounded-xl transition-all"
            >
                <Menu size={24} />
            </button>
        </header>
    );
}
