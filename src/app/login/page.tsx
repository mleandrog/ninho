import { AuthForm } from "@/components/auth/AuthForm";
import Link from "next/link";

export default function LoginPage() {
    return (
        <div className="flex min-h-screen items-center justify-center bg-soft px-6">
            <div className="w-full max-w-md bg-white p-8 rounded-[2.5rem] shadow-premium border border-white/20 flex flex-col items-center gap-8">
                <div className="flex flex-col items-center gap-2">
                    <div className="w-12 h-12 bg-primary rounded-2xl flex items-center justify-center text-white font-bold text-2xl shadow-vibrant">
                        N
                    </div>
                    <h1 className="text-3xl font-black text-muted-text mt-4">Ninho Lar</h1>
                    <p className="text-gray-500 font-medium text-center">Entre para gerenciar suas sacolas e pedidos.</p>
                </div>

                <AuthForm type="login" />

                <p className="text-sm text-gray-500">
                    Não tem uma conta?{" "}
                    <Link href="/registro" className="text-primary font-bold hover:underline">
                        Cadastre-se agora
                    </Link>
                </p>
            </div>
        </div>
    );
}
