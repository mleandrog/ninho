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
                const { error } = await supabase.auth.signUp({
                    email,
                    password,
                    options: {
                        data: {
                            full_name: fullName,
                            phone: phone.replace(/\D/g, ""),
                        },
                    },
                });
                if (error) throw error;

                // Vincular pedidos automáticos
                const { data: authData } = await supabase.auth.getUser();
                if (authData?.user) {
                    await fetch("/api/auth/link-orders", {
                        method: "POST",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify({ phone, userId: authData.user.id }),
                    });
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
                <>
                    <Input
                        label="WhatsApp"
                        placeholder="Ex: 11 99999-9999"
                        value={phone}
                        onChange={(e) => setPhone(e.target.value)}
                        required
                        disabled={isOtpVerified}
                    />
                    {!isOtpVerified && (
                        <div className="space-y-4">
                            {!isOtpSent ? (
                                <Button
                                    type="button"
                                    variant="outline"
                                    className="w-full h-12 border-primary text-primary font-bold"
                                    onClick={handleSendOtp}
                                    isLoading={sendingOtp}
                                >
                                    Enviar Código WhatsApp
                                </Button>
                            ) : (
                                <div className="flex gap-2 items-end">
                                    <div className="flex-1">
                                        <Input
                                            label="Código de Verificação"
                                            placeholder="123456"
                                            value={otpCode}
                                            onChange={(e) => setOtpCode(e.target.value)}
                                        />
                                    </div>
                                    <Button
                                        type="button"
                                        className="h-14 px-6 font-bold"
                                        onClick={handleVerifyOtp}
                                        isLoading={verifyingOtp}
                                    >
                                        Validar
                                    </Button>
                                </div>
                            )}
                        </div>
                    )}
                    {isOtpVerified && (
                        <div className="flex items-center gap-2 text-green-600 bg-green-50 p-4 rounded-xl text-xs font-bold uppercase tracking-widest border border-green-100">
                            ✓ Telefone Verificado
                        </div>
                    )}
                </>
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
                disabled={type === "register" && !isOtpVerified}
            >
                {type === "login" ? "Entrar" : "Criar Minha Conta"}
            </Button>
        </form>
    );
}
