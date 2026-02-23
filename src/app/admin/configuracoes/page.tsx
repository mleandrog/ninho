"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { AdminSidebar } from "@/components/admin/AdminSidebar";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Settings, Save, Bell, Shield, Info } from "lucide-react";
import { toast } from "react-hot-toast";

export default function AdminSettingsPage() {
    const [config, setConfig] = useState<any>({
        store_name: "Ninho Lar",
        contact_email: "contato@ninholar.com.br",
        whatsapp_number: "5511999999999",
        free_shipping_threshold: 300,
    });
    const [loading, setLoading] = useState(false);

    const handleSave = async () => {
        setLoading(true);
        // Aqui no futuro salvaríamos em uma tabela 'store_config'
        setTimeout(() => {
            toast.success("Configurações atualizadas com sucesso!");
            setLoading(false);
        }, 1000);
    };

    return (
        <div className="min-h-screen bg-soft flex">
            <AdminSidebar />

            <main className="flex-1 p-12 overflow-y-auto">
                <header className="mb-12">
                    <h1 className="text-4xl font-black text-muted-text flex items-center gap-4">
                        <Settings size={36} className="text-primary" />
                        Configurações
                    </h1>
                    <p className="text-gray-400 font-bold mt-1">Gerencie as preferências globais da sua loja</p>
                </header>

                <div className="grid lg:grid-cols-2 gap-12">
                    <div className="space-y-8">
                        <section className="bg-white p-8 rounded-[2.5rem] shadow-premium border border-white space-y-6">
                            <h2 className="text-2xl font-black text-muted-text flex items-center gap-3">
                                <Info size={24} className="text-secondary" />
                                Informações da Loja
                            </h2>
                            <div className="space-y-4">
                                <Input
                                    label="Nome da Loja"
                                    value={config.store_name}
                                    onChange={(e) => setConfig({ ...config, store_name: e.target.value })}
                                />
                                <Input
                                    label="E-mail de Contato"
                                    value={config.contact_email}
                                    onChange={(e) => setConfig({ ...config, contact_email: e.target.value })}
                                />
                                <Input
                                    label="WhatsApp de Atendimento"
                                    value={config.whatsapp_number}
                                    onChange={(e) => setConfig({ ...config, whatsapp_number: e.target.value })}
                                />
                            </div>
                        </section>

                        <section className="bg-white p-8 rounded-[2.5rem] shadow-premium border border-white space-y-6">
                            <h2 className="text-2xl font-black text-muted-text flex items-center gap-3">
                                <Bell size={24} className="text-accent-foreground" />
                                Notificações
                            </h2>
                            <div className="space-y-4">
                                <div className="flex items-center justify-between p-4 bg-soft rounded-2xl">
                                    <div>
                                        <p className="font-black text-muted-text">Avisar novos pedidos via WhatsApp</p>
                                        <p className="text-xs font-bold text-gray-400">Envia uma mensagem automática para você</p>
                                    </div>
                                    <div className="w-12 h-6 bg-primary rounded-full relative cursor-pointer">
                                        <div className="absolute right-1 top-1 w-4 h-4 bg-white rounded-full" />
                                    </div>
                                </div>
                            </div>
                        </section>
                    </div>

                    <div className="space-y-8">
                        <section className="bg-white p-8 rounded-[2.5rem] shadow-premium border border-white space-y-6">
                            <h2 className="text-2xl font-black text-muted-text flex items-center gap-3">
                                <Shield size={24} className="text-primary" />
                                Regras de Negócio
                            </h2>
                            <div className="space-y-4">
                                <Input
                                    label="Frete Grátis acima de (R$)"
                                    type="number"
                                    value={config.free_shipping_threshold}
                                    onChange={(e) => setConfig({ ...config, free_shipping_threshold: e.target.value })}
                                />
                            </div>
                        </section>

                        <div className="bg-white/50 p-8 rounded-[2.5rem] border border-dashed border-gray-200">
                            <p className="text-gray-400 font-medium text-center mb-6">
                                Certifique-se de que todas as alterações estão corretas antes de salvar.
                            </p>
                            <Button
                                className="w-full h-16 text-lg font-black gap-3 shadow-vibrant"
                                onClick={handleSave}
                                isLoading={loading}
                            >
                                <Save size={24} />
                                Salvar Alterações
                            </Button>
                        </div>
                    </div>
                </div>
            </main>
        </div>
    );
}
