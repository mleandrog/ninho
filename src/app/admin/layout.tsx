"use client";

import { useAuth } from "@/contexts/AuthContext";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { toast } from "react-hot-toast";

export default function AdminLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    const { user, profile, loading } = useAuth();
    const router = useRouter();

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

    return <>{children}</>;
}
