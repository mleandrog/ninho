"use client";

import { useState } from "react";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { supabase } from "@/lib/supabase";
import { useRouter } from "next/navigation";
import { toast } from "react-hot-toast";

interface AuthFormProps {
    type: "login" | "register";
}

export function AuthForm({ type }: AuthFormProps) {
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [fullName, setFullName] = useState("");
    const [phone, setPhone] = useState("");
    const [otpCode, setOtpCode] = useState("");
    const [isOtpSent, setIsOtpSent] = useState(false);
    const [isOtpVerified, setIsOtpVerified] = useState(false);
    const [sendingOtp, setSendingOtp] = useState(false);
    const [verifyingOtp, setVerifyingOtp] = useState(false);
    const [loading, setLoading] = useState(false);
    const router = useRouter();

    const handleSendOtp = async () => {
        if (!phone) return toast.error("Informe seu WhatsApp");
        setSendingOtp(true);
        try {
            const res = await fetch("/api/auth/send-otp", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ phone }),
            });
            const data = await res.json();
            if (data.success) {
                setIsOtpSent(true);
                toast.success("Código enviado para seu WhatsApp!");
            } else {
                throw new Error(data.error);
            }
        } catch (error: any) {
            toast.error(error.message || "Erro ao enviar código");
        } finally {
            setSendingOtp(false);
        }
    };

    const handleVerifyOtp = async () => {
        if (!otpCode) return toast.error("Informe o código recebido");
        setVerifyingOtp(true);
        try {
            const res = await fetch("/api/auth/verify-otp", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ phone, code: otpCode }),
            });
            const data = await res.json();
            if (data.success) {
                setIsOtpVerified(true);
                toast.success("Telefone verificado com sucesso!");
            } else {
                throw new Error(data.error);
            }
        } catch (error: any) {
            toast.error(error.message || "Código inválido");
        } finally {
            setVerifyingOtp(false);
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);

        try {
            if (type === "register") {
                const cleanPhone = phone.replace(/\D/g, "");
                const { error } = await supabase.auth.signUp({
                    email,
                    password,
                    options: {
                        data: {
                            full_name: fullName,
                            phone: cleanPhone,
                        },
                    },
                });
                if (error) throw error;

                // Tenta vincular pedidos se houver telefone, mas sem travar o cadastro
                if (cleanPhone) {
                    const { data: authData } = await supabase.auth.getUser();
                    if (authData?.user) {
                        try {
                            await fetch("/api/auth/link-orders", {
                                method: "POST",
                                headers: { "Content-Type": "application/json" },
                                body: JSON.stringify({ phone: cleanPhone, userId: authData.user.id }),
                            });
                        } catch (linkError) {
                            console.error("Erro silencioso ao vincular:", linkError);
                        }
                    }
                }

                toast.success("Cadastro realizado! Verifique seu e-mail.");
                router.push("/login");
            } else {
                const { error } = await supabase.auth.signInWithPassword({
                    email,
                    password,
                });
                if (error) throw error;
                toast.success("Bem-vindo de volta!");
                router.push("/");
            }
        } catch (error: any) {
            toast.error(error.message || "Ocorreu um erro na autenticação.");
        } finally {
            setLoading(false);
        }
    };

    return (
        <form onSubmit={handleSubmit} className="space-y-4 w-full max-w-sm">
            {type === "register" && (
                <Input
                    label="Nome Completo"
                    placeholder="Seu nome"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    required
                />
            )}
            <Input
                label="E-mail"
                type="email"
                placeholder="seu@email.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
            />
            {type === "register" && (
                <Input
                    label="WhatsApp (Opcional)"
                    placeholder="Ex: 11 99999-9999"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                />
            )}
            <Input
                label="Senha"
                type="password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
            />
            <Button
                type="submit"
                className="w-full h-14 text-lg font-black"
                isLoading={loading}
            >
                {type === "login" ? "Entrar" : "Criar Minha Conta"}
            </Button>
        </form>
    );
}
