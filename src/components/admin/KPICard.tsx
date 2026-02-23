"use client";

import { LucideIcon } from "lucide-react";
import { clsx } from "clsx";

interface KPICardProps {
    label: string;
    value: string | number;
    icon: LucideIcon;
    trend?: string;
    color: "primary" | "secondary" | "accent";
}

export function KPICard({ label, value, icon: Icon, trend, color }: KPICardProps) {
    const colorMap = {
        primary: "bg-primary/10 text-primary",
        secondary: "bg-secondary/10 text-secondary",
        accent: "bg-accent-foreground/10 text-accent-foreground",
    };

    return (
        <div className="bg-white p-8 rounded-[2.5rem] shadow-premium border border-white/20 space-y-4 hover:scale-[1.02] transition-transform">
            <div className="flex items-center justify-between">
                <div className={clsx("p-4 rounded-2xl", colorMap[color])}>
                    <Icon size={24} />
                </div>
                {trend && (
                    <span className="text-xs font-black px-3 py-1 bg-green-50 text-green-500 rounded-full">
                        {trend}
                    </span>
                )}
            </div>
            <div>
                <p className="text-gray-400 font-bold text-sm tracking-widest uppercase">{label}</p>
                <h3 className="text-4xl font-black text-muted-text mt-1">{value}</h3>
            </div>
        </div>
    );
}
