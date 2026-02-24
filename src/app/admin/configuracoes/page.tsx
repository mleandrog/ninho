"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { AdminSidebar } from "@/components/admin/AdminSidebar";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import {
    Settings, Save, Info, MapPin, CreditCard,
    MessageSquare, Loader2, Search, Smartphone,
    Globe, Shield, Bell, Bold, Italic
} from "lucide-react";
import { toast } from "react-hot-toast";

type TabType = "geral" | "logistica" | "pagamentos" | "whatsapp";

export default function AdminSettingsPage() {
    const [activeTab, setActiveTab] = useState<TabType>("geral");
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [settings, setSettings] = useState<any>(null);

    useEffect(() => {
        fetchSettings();
    }, []);

    const fetchSettings = async () => {
        try {
            const { data, error } = await supabase
                .from("whatsapp_settings")
                .select("*")
                .limit(1)
                .single();

            if (error) throw error;
            setSettings(data);
        } catch (error: any) {
            toast.error("Erro ao carregar configurações: " + error.message);
        } finally {
            setLoading(false);
        }
    };

    const handleSave = async () => {
        setSaving(true);
        try {
            const { error } = await supabase
                .from("whatsapp_settings")
                .update({
                    store_name: settings.store_name,
                    whatsapp_number: settings.whatsapp_number,
                    keyword: settings.keyword,
                    rules_message: settings.rules_message,
                    final_message: settings.final_message,
                    default_interval_seconds: settings.default_interval_seconds,
                    cart_expiration_minutes: settings.cart_expiration_minutes,
                    payment_expiration_minutes: settings.payment_expiration_minutes,
                    asaas_pix_enabled: settings.asaas_pix_enabled,
                    asaas_card_enabled: settings.asaas_card_enabled,
                    store_lat: parseFloat(String(settings.store_lat).replace(',', '.')) || null,
                    store_lng: parseFloat(String(settings.store_lng).replace(',', '.')) || null,
                    store_address: settings.store_address,
                    store_cep: settings.store_cep,
                })
                .eq("id", settings.id);

            if (error) throw error;
            toast.success("Configurações salvas com sucesso!");
        } catch (error: any) {
            toast.error("Erro ao salvar: " + error.message);
        } finally {
            setSaving(false);
        }
    };

    const insertFormat = (field: 'rules_message' | 'final_message', format: string) => {
        const textarea = document.getElementById(field) as HTMLTextAreaElement;
        if (!textarea) {
            // Fallback se não achar o textarea
            setSettings({ ...settings, [field]: (settings[field] || "") + format });
            return;
        }

        const start = textarea.selectionStart;
        const end = textarea.selectionEnd;
        const text = settings[field] || "";
        const selectedText = text.substring(start, end);

        let newText;
        if (format === '*' || format === '_') {
            newText = text.substring(0, start) + format + selectedText + format + text.substring(end);
        } else {
            newText = text.substring(0, start) + format + text.substring(end);
        }

        setSettings({ ...settings, [field]: newText });

        setTimeout(() => {
            textarea.focus();
            const newCursorPos = format === '*' || format === '_'
                ? start + format.length + selectedText.length + format.length
                : start + format.length;
            textarea.setSelectionRange(newCursorPos, newCursorPos);
        }, 10);
    };

    const handleCepBlur = async () => {
        const cep = settings.store_cep?.replace(/\D/g, "");
        if (cep && cep.length === 8) {
            try {
                const res = await fetch(`https://viacep.com.br/ws/${cep}/json/`);
                const data = await res.json();
                if (!data.erro) {
                    const fullAddress = `${data.logradouro}, ${data.bairro}, ${data.localidade} - ${data.uf}`;
                    setSettings({ ...settings, store_address: fullAddress });
                    toast.success("Endereço preenchido!");

                    // Buscar coordenadas
                    // Importante: Removendo o bairro da string para aumentar a taxa de sucesso do Nominatim OpenStreetMap
                    const searchAddress = `${data.logradouro}, ${data.localidade} - ${data.uf}`;
                    const coordsRes = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(searchAddress)}&limit=1`);
                    const coordsData = await coordsRes.json();
                    if (coordsData && coordsData.length > 0) {
                        setSettings((prev: any) => ({
                            ...prev,
                            store_lat: String(coordsData[0].lat),
                            store_lng: String(coordsData[0].lon)
                        }));
                    }
                }
            } catch (e) {
                console.error("Erro ao buscar CEP:", e);
            }
        }
    };

    if (loading) {
        return (
            <div className="min-h-screen bg-soft flex items-center justify-center">
                <Loader2 className="w-10 h-10 text-primary animate-spin" />
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-soft flex">
            <AdminSidebar />

            <main className="flex-1 p-12 overflow-y-auto">
                <header className="mb-12 flex justify-between items-end">
                    <div>
                        <h1 className="text-4xl font-black text-muted-text flex items-center gap-4">
                            <Settings size={36} className="text-primary" />
                            Configurações
                        </h1>
                        <p className="text-gray-400 font-bold mt-1">Gerencie as preferências globais da sua loja</p>
                    </div>

                    <Button
                        className="h-14 px-8 rounded-2xl font-black gap-3 shadow-vibrant"
                        onClick={handleSave}
                        isLoading={saving}
                    >
                        <Save size={20} />
                        Salvar Todas as Pequenas Mudanças
                    </Button>
                </header>

                {/* Navegação por Abas */}
                <div className="flex gap-4 mb-8 bg-white/50 p-2 rounded-[2rem] w-fit">
                    {(["geral", "logistica", "pagamentos", "whatsapp"] as TabType[]).map((tab) => (
                        <button
                            key={tab}
                            onClick={() => setActiveTab(tab)}
                            className={`px-8 py-4 rounded-2xl font-black text-sm transition-all uppercase tracking-widest ${activeTab === tab
                                ? "bg-primary text-white shadow-vibrant scale-105"
                                : "text-gray-400 hover:text-muted-text hover:bg-white"
                                }`}
                        >
                            {tab}
                        </button>
                    ))}
                </div>

                <div className="max-w-4xl">
                    {/* ABA GERAL */}
                    {activeTab === "geral" && (
                        <section className="bg-white p-10 rounded-[3rem] shadow-premium border border-white space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
                            <div className="flex items-center gap-4 mb-2">
                                <div className="p-3 bg-secondary/10 rounded-2xl text-secondary">
                                    <Info size={24} />
                                </div>
                                <div>
                                    <h2 className="text-2xl font-black text-muted-text">Informações da Loja</h2>
                                    <p className="text-xs font-bold text-gray-400 uppercase tracking-widest">Contatos básicos e identificação</p>
                                </div>
                            </div>

                            <div className="grid md:grid-cols-2 gap-6">
                                <div className="space-y-2">
                                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest px-1">Nome da Loja</label>
                                    <input
                                        type="text"
                                        className="w-full p-5 bg-soft rounded-2xl border-none font-bold text-sm outline-none focus:ring-2 focus:ring-primary/20"
                                        value={settings.store_name || ""}
                                        onChange={e => setSettings({ ...settings, store_name: e.target.value })}
                                        placeholder="Ex: Ninho Lar"
                                    />
                                </div>
                                <div className="space-y-2">
                                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest px-1">WhatsApp de Atendimento</label>
                                    <input
                                        type="text"
                                        className="w-full p-5 bg-soft rounded-2xl border-none font-bold text-sm outline-none focus:ring-2 focus:ring-primary/20"
                                        value={settings.whatsapp_number || ""}
                                        onChange={e => setSettings({ ...settings, whatsapp_number: e.target.value })}
                                        placeholder="Ex: 5511999999999"
                                    />
                                </div>
                            </div>

                            <div className="p-4 bg-amber-50 rounded-2xl border border-amber-100 flex gap-4">
                                <Shield className="text-amber-500 flex-shrink-0" size={20} />
                                <p className="text-xs font-bold text-amber-700 leading-relaxed">
                                    Algumas informações básicas são obtidas diretamente da conta principal e não podem ser alteradas por aqui.
                                </p>
                            </div>
                        </section>
                    )}

                    {/* ABA LOGÍSTICA */}
                    {activeTab === "logistica" && (
                        <section className="bg-white p-10 rounded-[3rem] shadow-premium border border-white space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
                            <div className="flex items-center gap-4 mb-2">
                                <div className="p-3 bg-primary/10 rounded-2xl text-primary">
                                    <MapPin size={24} />
                                </div>
                                <div>
                                    <h2 className="text-2xl font-black text-muted-text">Logística e Frete</h2>
                                    <p className="text-xs font-bold text-gray-400 uppercase tracking-widest">Endereço de origem para cálculo de frete</p>
                                </div>
                            </div>

                            <div className="grid md:grid-cols-3 gap-6">
                                <div className="md:col-span-1 space-y-2">
                                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest px-1">CEP da Loja</label>
                                    <input
                                        type="text"
                                        className="w-full p-5 bg-soft rounded-2xl border-none font-bold text-sm outline-none focus:ring-2 focus:ring-primary/20 transition-all"
                                        placeholder="00000-000"
                                        value={settings.store_cep || ""}
                                        onChange={e => setSettings({ ...settings, store_cep: e.target.value })}
                                        onBlur={handleCepBlur}
                                    />
                                </div>
                                <div className="md:col-span-2 space-y-2">
                                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest px-1">Endereço de Origem</label>
                                    <input
                                        type="text"
                                        className="w-full p-5 bg-soft rounded-2xl border-none font-bold text-sm outline-none focus:ring-2 focus:ring-primary/20"
                                        placeholder="Carregando automaticamente via CEP..."
                                        value={settings.store_address || ""}
                                        onChange={e => setSettings({ ...settings, store_address: e.target.value })}
                                    />
                                </div>
                            </div>

                            <div className="grid md:grid-cols-2 gap-6 bg-soft/50 p-6 rounded-[2rem] border border-white/50">
                                <div className="space-y-2">
                                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest px-1">Latitude</label>
                                    <input
                                        type="text"
                                        className="w-full p-4 bg-white rounded-xl border-none font-bold text-xs"
                                        value={settings.store_lat ?? ""}
                                        onChange={e => setSettings({ ...settings, store_lat: e.target.value })}
                                        placeholder="Ex: -23.550520"
                                    />
                                </div>
                                <div className="space-y-2">
                                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest px-1">Longitude</label>
                                    <input
                                        type="text"
                                        className="w-full p-4 bg-white rounded-xl border-none font-bold text-xs"
                                        value={settings.store_lng ?? ""}
                                        onChange={e => setSettings({ ...settings, store_lng: e.target.value })}
                                        placeholder="Ex: -46.633308"
                                    />
                                </div>
                            </div>
                        </section>
                    )}

                    {/* ABA PAGAMENTOS */}
                    {activeTab === "pagamentos" && (
                        <section className="bg-white p-10 rounded-[3rem] shadow-premium border border-white space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
                            <div className="flex items-center gap-4 mb-2">
                                <div className="p-3 bg-secondary/10 rounded-2xl text-secondary">
                                    <CreditCard size={24} />
                                </div>
                                <div>
                                    <h2 className="text-2xl font-black text-muted-text">Pagamentos e Prazos</h2>
                                    <p className="text-xs font-bold text-gray-400 uppercase tracking-widest">Configurações do checkout e gateway</p>
                                </div>
                            </div>

                            <div className="grid md:grid-cols-2 gap-8">
                                <div className="space-y-4">
                                    <h3 className="text-xs font-black text-gray-400 uppercase tracking-widest">Métodos Habilitados</h3>
                                    <div className="space-y-3">
                                        <div className="flex items-center justify-between p-4 bg-soft rounded-2xl hover:bg-gray-100 transition-colors cursor-pointer"
                                            onClick={() => setSettings({ ...settings, asaas_pix_enabled: !settings.asaas_pix_enabled })}>
                                            <span className="font-bold text-muted-text">PIX Automático (Asaas)</span>
                                            <div className={`w-12 h-6 rounded-full relative transition-all ${settings.asaas_pix_enabled ? "bg-primary" : "bg-gray-300"}`}>
                                                <div className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-all ${settings.asaas_pix_enabled ? "right-1" : "left-1"}`} />
                                            </div>
                                        </div>
                                        <div className="flex items-center justify-between p-4 bg-soft rounded-2xl hover:bg-gray-100 transition-colors cursor-pointer"
                                            onClick={() => setSettings({ ...settings, asaas_card_enabled: !settings.asaas_card_enabled })}>
                                            <span className="font-bold text-muted-text">Cartão / Boleto / Link</span>
                                            <div className={`w-12 h-6 rounded-full relative transition-all ${settings.asaas_card_enabled ? "bg-primary" : "bg-gray-300"}`}>
                                                <div className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-all ${settings.asaas_card_enabled ? "right-1" : "left-1"}`} />
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                <div className="space-y-4">
                                    <h3 className="text-xs font-black text-gray-400 uppercase tracking-widest">Prazos de Expiração</h3>
                                    <div className="space-y-4">
                                        <div className="space-y-2">
                                            <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Carrinho Aberto (Minutos)</label>
                                            <input type="number" className="w-full p-4 bg-soft rounded-2xl border-none font-bold text-sm"
                                                value={settings.cart_expiration_minutes}
                                                onChange={e => setSettings({ ...settings, cart_expiration_minutes: parseInt(e.target.value) })} />
                                        </div>
                                        <div className="space-y-2">
                                            <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Link de Pagamento (Minutos)</label>
                                            <input type="number" className="w-full p-4 bg-soft rounded-2xl border-none font-bold text-sm"
                                                value={settings.payment_expiration_minutes}
                                                onChange={e => setSettings({ ...settings, payment_expiration_minutes: parseInt(e.target.value) })} />
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </section>
                    )}

                    {/* ABA WHATSAPP */}
                    {activeTab === "whatsapp" && (
                        <section className="bg-white p-10 rounded-[3rem] shadow-premium border border-white space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
                            <div className="flex items-center gap-4 mb-2">
                                <div className="p-3 bg-accent/10 rounded-2xl text-accent-foreground">
                                    <MessageSquare size={24} />
                                </div>
                                <div>
                                    <h2 className="text-2xl font-black text-muted-text">Automação WhatsApp</h2>
                                    <p className="text-xs font-bold text-gray-400 uppercase tracking-widest">Configurações de robô e mensagens padrão</p>
                                </div>
                            </div>

                            <div className="space-y-6">
                                <div className="max-w-xs space-y-2">
                                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest px-1">Palavra-Chave Ativadora</label>
                                    <div className="relative">
                                        <input
                                            type="text"
                                            className="w-full p-5 bg-soft rounded-2xl border-none font-black text-lg uppercase tracking-widest text-primary outline-none focus:ring-2 focus:ring-primary/20"
                                            value={settings?.keyword || ""}
                                            onChange={e => setSettings({ ...settings, keyword: e.target.value })}
                                        />
                                        <Smartphone className="absolute right-5 top-1/2 -translate-y-1/2 text-gray-300" size={20} />
                                    </div>
                                </div>

                                <div className="grid md:grid-cols-2 gap-6 pt-4">
                                    <div className="space-y-2">
                                        <div className="flex justify-between items-center px-1">
                                            <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Regras Padrão</label>
                                            <div className="flex gap-1 items-center bg-soft p-1 rounded-xl border border-white/50">
                                                <button onClick={() => insertFormat('rules_message', '*')} className="p-1.5 hover:bg-white rounded-lg transition-all text-primary" title="Negrito">
                                                    <Bold size={12} />
                                                </button>
                                                <button onClick={() => insertFormat('rules_message', '_')} className="p-1.5 hover:bg-white rounded-lg transition-all text-primary" title="Itálico">
                                                    <Italic size={12} />
                                                </button>
                                                <div className="w-px h-3 bg-gray-200 mx-1" />
                                                {["🛍️", "✨", "🎉", "🐥"].map(emoji => (
                                                    <button key={emoji} onClick={() => insertFormat('rules_message', emoji)} className="p-1 hover:bg-white rounded-lg transition-all text-base">
                                                        {emoji}
                                                    </button>
                                                ))}
                                            </div>
                                        </div>
                                        <textarea
                                            id="rules_message"
                                            className="w-full p-5 bg-soft rounded-[1.5rem] border-none font-medium h-40 outline-none focus:ring-2 focus:ring-primary/20 shadow-inner"
                                            value={settings?.rules_message || ""}
                                            onChange={e => setSettings({ ...settings, rules_message: e.target.value })}
                                            placeholder="Descreva as regras ou funcionamento da sua loja..."
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <div className="flex justify-between items-center px-1">
                                            <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Mensagem Final Padrão</label>
                                            <div className="flex gap-1 items-center bg-soft p-1 rounded-xl border border-white/50">
                                                <button onClick={() => insertFormat('final_message', '*')} className="p-1.5 hover:bg-white rounded-lg transition-all text-primary" title="Negrito">
                                                    <Bold size={12} />
                                                </button>
                                                <button onClick={() => insertFormat('final_message', '_')} className="p-1.5 hover:bg-white rounded-lg transition-all text-primary" title="Itálico">
                                                    <Italic size={12} />
                                                </button>
                                                <div className="w-px h-3 bg-gray-200 mx-1" />
                                                {["📦", "✅", "🙌", "💙"].map(emoji => (
                                                    <button key={emoji} onClick={() => insertFormat('final_message', emoji)} className="p-1 hover:bg-white rounded-lg transition-all text-base">
                                                        {emoji}
                                                    </button>
                                                ))}
                                            </div>
                                        </div>
                                        <textarea
                                            id="final_message"
                                            className="w-full p-5 bg-soft rounded-[1.5rem] border-none font-medium h-40 outline-none focus:ring-2 focus:ring-primary/20 shadow-inner"
                                            value={settings?.final_message || ""}
                                            onChange={e => setSettings({ ...settings, final_message: e.target.value })}
                                            placeholder="Mensagem exibida ao finalizar o pedido..."
                                        />
                                    </div>
                                </div>
                            </div>
                        </section>
                    )}
                </div>
            </main>
        </div>
    );
}
