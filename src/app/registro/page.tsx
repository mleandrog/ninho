import { AuthForm } from "@/components/auth/AuthForm";
import Link from "next/link";

export default function RegisterPage() {
    return (
        <div className="flex min-h-screen items-center justify-center bg-soft px-6">
            <div className="w-full max-w-md bg-white p-8 rounded-[2.5rem] shadow-premium border border-white/20 flex flex-col items-center gap-8">
                <div className="flex flex-col items-center gap-2">
                    <div className="w-12 h-12 bg-secondary rounded-2xl flex items-center justify-center text-white font-bold text-2xl shadow-premium">
                        N
                    </div>
                    <h1 className="text-3xl font-black text-muted-text mt-4">Criar Conta</h1>
                    <p className="text-gray-500 font-medium text-center">Faça parte do Ninho Lar e aproveite o melhor da moda infantil.</p>
                </div>

                <AuthForm type="register" />

                <p className="text-sm text-gray-500">
                    Já tem uma conta?{" "}
                    <Link href="/login" className="text-secondary font-bold hover:underline">
                        Faça login
                    </Link>
                </p>
            </div>
        </div>
    );
}
