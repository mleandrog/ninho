"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import {
    Settings, Save, Info, MapPin, CreditCard,
    MessageSquare, Loader2, Smartphone, Plus, Trash2,
    Shield, Bold, Italic, ShoppingBag, LayoutTemplate, Phone, Mail,
    Instagram, Facebook
} from "lucide-react";
import { toast } from "react-hot-toast";

type TabType = "geral" | "pagamentos" | "whatsapp" | "sacolas" | "landing" | "produtos";

export default function AdminSettingsPage() {
    const [activeTab, setActiveTab] = useState<TabType>("geral");
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [settings, setSettings] = useState<any>(null);
    const [initialSettings, setInitialSettings] = useState<any>(null);

    const [productTypes, setProductTypes] = useState<any[]>([]);
    const [newProductType, setNewProductType] = useState("");
    const [isAddingType, setIsAddingType] = useState(false);

    // Message Templates
    const [ruleTemplates, setRuleTemplates] = useState<any[]>([]);
    const [finalMessageTemplates, setFinalMessageTemplates] = useState<any[]>([]);
    const [loadingTemplates, setLoadingTemplates] = useState(false);
    const [newTemplate, setNewTemplate] = useState({ title: "", content: "", type: "rule" as "rule" | "final" });

    useEffect(() => {
        fetchSettings();
        fetchProductTypes();
        fetchTemplates();
    }, []);

    const fetchTemplates = async () => {
        setLoadingTemplates(true);
        try {
            const [rulesRes, finalsRes] = await Promise.all([
                supabase.from("whatsapp_rule_templates").select("*").order("title"),
                supabase.from("whatsapp_final_message_templates").select("*").order("title")
            ]);
            setRuleTemplates(rulesRes.data || []);
            setFinalMessageTemplates(finalsRes.data || []);
        } catch (error) {
            console.error("Erro ao buscar templates:", error);
        } finally {
            setLoadingTemplates(false);
        }
    };

    const handleAddTemplate = async () => {
        if (!newTemplate.title || !newTemplate.content) {
            return toast.error("Preencha o título e o conteúdo do template.");
        }

        const table = newTemplate.type === "rule" ? "whatsapp_rule_templates" : "whatsapp_final_message_templates";

        try {
            const { error } = await supabase.from(table).insert([{
                title: newTemplate.title,
                content: newTemplate.content
            }]);

            if (error) throw error;

            toast.success("Template adicionado!");
            setNewTemplate({ title: "", content: "", type: newTemplate.type });
            fetchTemplates();
        } catch (error: any) {
            toast.error("Erro ao adicionar template: " + error.message);
        }
    };

    const handleDeleteTemplate = async (id: string, type: "rule" | "final") => {
        if (!confirm("Excluir este template?")) return;
        const table = type === "rule" ? "whatsapp_rule_templates" : "whatsapp_final_message_templates";

        try {
            const { error } = await supabase.from(table).delete().eq("id", id);
            if (error) throw error;
            toast.success("Template removido!");
            fetchTemplates();
        } catch (error: any) {
            toast.error("Erro ao remover template: " + error.message);
        }
    };

    const fetchProductTypes = async () => {
        const { data } = await supabase.from("product_types").select("*").order("name");
        setProductTypes(data || []);
    };

    const handleAddProductType = async () => {
        if (!newProductType.trim()) return;
        setIsAddingType(true);
        try {
            const { error } = await supabase.from("product_types").insert([{ name: newProductType }]);
            if (error) throw error;
            setNewProductType("");
            fetchProductTypes();
            toast.success("Tipo de produto adicionado!");
        } catch (error: any) {
            toast.error("Erro ao adicionar: " + error.message);
        } finally {
            setIsAddingType(false);
        }
    };

    const handleDeleteProductType = async (id: string) => {
        if (!confirm("Excluir este tipo de produto?")) return;
        try {
            const { error } = await supabase.from("product_types").delete().eq("id", id);
            if (error) throw error;
            fetchProductTypes();
            toast.success("Tipo removido!");
        } catch (error: any) {
            toast.error("Erro ao remover: " + error.message);
        }
    };

    const fetchSettings = async () => {
        try {
            const { data, error } = await supabase
                .from("whatsapp_settings")
                .select("*")
                .limit(1);

            if (error) throw error;

            if (data && data.length > 0) {
                setSettings(data[0]);
                setInitialSettings(data[0]);
            } else {
                // Inicializa com valores padrão se não houver registro
                const defaultSettings = {
                    store_name: "Ninho Lar",
                    whatsapp_number: "",
                    keyword: "ninho",
                    rules_message: `🛍️ *REGRAS DO GRUPO*
                    
✨ 1. Os produtos são postados diariamente.
🎉 2. Para comprar, responda "EU QUERO" ou envie a palavra-chave.
🐥 3. Reservas duram 24h.`,
                    final_message: `✅ *Obrigado pela preferência!*
                    
Seu pedido da categoria {categoryName} foi registrado. Em breve entraremos em contato para finalizar o pagamento e entrega! 💙`,
                    default_interval_seconds: 30,
                    cart_expiration_minutes: 60,
                    payment_expiration_minutes: 1440,
                    asaas_pix_enabled: true,
                    asaas_card_enabled: false,
                    store_number: "",
                    store_complement: ""
                };
                setSettings(defaultSettings);
                setInitialSettings(defaultSettings);
            }
        } catch (error: any) {
            toast.error("Erro ao carregar configurações: " + error.message);
        } finally {
            setLoading(false);
        }
    };

    const handleSave = async () => {
        setSaving(true);
        try {
            const configData = {
                store_name: settings.store_name,
                whatsapp_number: settings.whatsapp_number,
                keyword: settings.keyword,
                rules_message: settings.rules_message,
                final_message: settings.final_message,
                default_interval_seconds: settings.default_interval_seconds,
                cart_expiration_minutes: settings.cart_expiration_minutes,
                payment_expiration_minutes: settings.payment_expiration_minutes,
                asaas_card_enabled: settings.asaas_card_enabled,
                store_address: settings.store_address,
                store_cep: settings.store_cep,
                bag_max_days: Number(settings.bag_max_days) || 30,
                bag_reminder_days: settings.bag_reminder_days || "15, 10, 7, 3",
                hero_title: settings.hero_title,
                hero_subtitle: settings.hero_subtitle,
                hero_badge_text: settings.hero_badge_text,
                promo_bar_text: settings.promo_bar_text,
                footer_phone: settings.footer_phone,
                footer_email: settings.footer_email,
                footer_about: settings.footer_about,
                store_number: settings.store_number,
                store_complement: settings.store_complement,
            };

            const { data, error } = settings.id
                ? await supabase.from("whatsapp_settings").update(configData).eq("id", settings.id).select().single()
                : await supabase.from("whatsapp_settings").insert([configData]).select().single();

            if (error) throw error;
            if (data) {
                setSettings(data);
                setInitialSettings(data);
            }

            toast.success("Configurações salvas!");
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

    const handleCepChange = async (value: string) => {
        const cleanCep = value.replace(/\D/g, "");
        setSettings({ ...settings, store_cep: value });

        if (cleanCep.length === 8) {
            try {
                const res = await fetch(`https://viacep.com.br/ws/${cleanCep}/json/`);
                const data = await res.json();
                if (!data.erro) {
                    const fullAddress = `${data.logradouro}, ${data.bairro}, ${data.localidade} - ${data.uf}`;
                    setSettings((prev: any) => ({
                        ...prev,
                        store_address: fullAddress,
                        store_cep: value
                    }));
                    toast.success("Endereço preenchido!");

                    // Buscar coordenadas silenciosamente
                    const searchAddress = `${data.logradouro}, ${data.localidade} - ${data.uf}`;
                    fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(searchAddress)}&limit=1`)
                        .then(r => r.json())
                        .then(coordsData => {
                            if (coordsData && coordsData.length > 0) {
                                setSettings((prev: any) => ({
                                    ...prev,
                                    store_lat: String(coordsData[0].lat),
                                    store_lng: String(coordsData[0].lon)
                                }));
                            }
                        }).catch(console.error);
                }
            } catch (e) {
                console.error("Erro ao buscar CEP:", e);
            }
        }
    };

    const hasChanges = initialSettings && settings && JSON.stringify(initialSettings) !== JSON.stringify(settings);

    if (loading) {
        return (
            <div className="flex flex-col justify-center items-center py-20 gap-4">
                <Loader2 className="w-12 h-12 text-primary animate-spin" />
                <span className="text-xs font-black text-gray-400 uppercase tracking-widest">Carregando configurações...</span>
            </div>
        );
    }

    if (!settings) {
        return (
            <div className="flex flex-col justify-center items-center py-20 gap-4">
                <Settings className="w-12 h-12 text-gray-300" />
                <span className="text-xs font-black text-gray-400 uppercase tracking-widest">Não foi possível carregar as configurações.</span>
                <Button onClick={fetchSettings} variant="outline" className="h-12 px-6 rounded-xl">Tentar Novamente</Button>
            </div>
        );
    }

    return (
        <div className="animate-in fade-in duration-500">
            <header className="mb-8 sm:mb-12 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                    <h1 className="text-3xl sm:text-4xl font-black text-muted-text flex items-center gap-3 sm:gap-4 lowercase tracking-tighter">
                        <Settings size={32} className="text-primary sm:w-9 sm:h-9" />
                        Ajustes
                    </h1>
                    <p className="text-[10px] sm:text-sm font-bold text-gray-400 mt-1">Gerencie as preferências da sua loja</p>
                </div>

                <Button
                    className={`w-full sm:w-auto h-12 sm:h-14 px-8 rounded-xl sm:rounded-2xl font-black gap-3 transition-all ${!hasChanges ? "bg-gray-200 text-gray-400 shadow-none cursor-not-allowed hover:bg-gray-200" : "shadow-vibrant"
                        }`}
                    onClick={handleSave}
                    isLoading={saving}
                    disabled={!hasChanges || saving}
                >
                    <Save size={18} />
                    {saving ? "Salvando..." : "Salvar"}
                </Button>
            </header>

            {/* Navegação por Abas */}
            <div className="flex bg-white p-1 rounded-xl sm:rounded-[2rem] shadow-premium border border-white gap-1 mb-6 sm:mb-8 overflow-x-auto no-scrollbar">
                {(["geral", "pagamentos", "whatsapp", "sacolas", "landing", "produtos"] as TabType[]).map((tab) => (
                    <button
                        key={tab}
                        onClick={() => setActiveTab(tab)}
                        className={`flex-none sm:flex-1 px-4 sm:px-8 py-2.5 sm:py-4 rounded-lg sm:rounded-2xl font-black text-[10px] sm:text-sm transition-all uppercase tracking-widest whitespace-nowrap ${activeTab === tab
                            ? "bg-primary text-white shadow-vibrant"
                            : "text-gray-400 hover:text-muted-text hover:bg-soft"
                            }`}
                    >
                        {tab === 'landing' ? 'Landing' : tab === 'produtos' ? 'Produtos' : tab === 'geral' ? 'Geral' : tab}
                    </button>
                ))}
            </div>

            <div className="max-w-4xl">
                {/* ABA GERAL */}
                {activeTab === "geral" && (
                    <section className="bg-white p-6 sm:p-10 rounded-2xl sm:rounded-[3rem] shadow-premium border border-white space-y-6 sm:space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
                        <div className="flex items-center gap-3 sm:gap-4 mb-2">
                            <div className="p-2.5 sm:p-3 bg-secondary/10 rounded-xl sm:rounded-2xl text-secondary">
                                <Info size={20} className="sm:w-6 sm:h-6" />
                            </div>
                            <div>
                                <h2 className="text-xl sm:text-2xl font-black text-muted-text">Informações da Loja</h2>
                                <p className="text-[9px] sm:text-xs font-bold text-gray-400 uppercase tracking-widest">Contatos básicos e identificação</p>
                            </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6">
                            <div className="space-y-1.5 sm:space-y-2">
                                <label className="text-[9px] sm:text-[10px] font-black text-gray-400 uppercase tracking-widest px-1">Nome da Loja</label>
                                <input
                                    type="text"
                                    className="w-full p-4 sm:p-5 bg-soft rounded-xl sm:rounded-2xl border-none font-bold text-xs sm:text-sm outline-none focus:ring-2 focus:ring-primary/20"
                                    value={settings.store_name || ""}
                                    onChange={e => setSettings({ ...settings, store_name: e.target.value })}
                                    placeholder="Ex: Ninho Lar"
                                />
                            </div>
                            <div className="space-y-1.5 sm:space-y-2">
                                <label className="text-[9px] sm:text-[10px] font-black text-gray-400 uppercase tracking-widest px-1">WhatsApp atendimento</label>
                                <input
                                    type="text"
                                    className="w-full p-4 sm:p-5 bg-soft rounded-xl sm:rounded-2xl border-none font-bold text-xs sm:text-sm outline-none focus:ring-2 focus:ring-primary/20"
                                    value={settings.whatsapp_number || ""}
                                    onChange={e => setSettings({ ...settings, whatsapp_number: e.target.value })}
                                    placeholder="Ex: 5511999999999"
                                />
                            </div>
                        </div>

                        <div className="pt-4 sm:pt-6 border-t border-gray-100">
                            <div className="flex items-center gap-3 sm:gap-4 mb-4 sm:mb-6">
                                <div className="p-2.5 sm:p-3 bg-primary/10 rounded-xl sm:rounded-2xl text-primary">
                                    <MapPin size={20} className="sm:w-6 sm:h-6" />
                                </div>
                                <div>
                                    <h3 className="text-xl font-black text-muted-text">Endereço</h3>
                                    <p className="text-[9px] sm:text-xs font-bold text-gray-400 uppercase tracking-widest">Origem para frete</p>
                                </div>
                            </div>

                            <div className="space-y-6">
                                <div className="max-w-xs space-y-2">
                                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest px-1">CEP Oficial da Loja</label>
                                    <input
                                        type="text"
                                        className="w-full p-5 bg-soft rounded-2xl border-none font-bold text-sm outline-none focus:ring-2 focus:ring-primary/20 transition-all font-mono"
                                        placeholder="00000-000"
                                        value={settings.store_cep || ""}
                                        onChange={e => handleCepChange(e.target.value)}
                                    />
                                </div>

                                {settings.store_address && (
                                    <div className="space-y-6 animate-in fade-in slide-in-from-top-2 duration-500">
                                        <div className="space-y-2">
                                            <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest px-1">Endereço (Rua, Bairro, Cidade)</label>
                                            <input
                                                type="text"
                                                className="w-full p-5 bg-soft rounded-2xl border-none font-bold text-sm outline-none focus:ring-2 focus:ring-primary/20"
                                                placeholder="Endereço encontrado..."
                                                value={settings.store_address || ""}
                                                onChange={e => setSettings({ ...settings, store_address: e.target.value })}
                                            />
                                        </div>

                                        <div className="grid md:grid-cols-2 gap-6">
                                            <div className="space-y-2">
                                                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest px-1 flex justify-between items-center">
                                                    Número
                                                    {!settings.store_number && <span className="text-[8px] text-red-400 font-black animate-pulse">Obrigatório p/ Frete</span>}
                                                </label>
                                                <input
                                                    type="text"
                                                    className={`w-full p-5 rounded-2xl border-none font-bold text-sm outline-none transition-all ${!settings.store_number ? "bg-red-50 ring-2 ring-red-100 placeholder:text-red-200" : "bg-soft focus:ring-2 focus:ring-primary/20"}`}
                                                    value={settings.store_number || ""}
                                                    onChange={e => setSettings({ ...settings, store_number: e.target.value })}
                                                    placeholder="Digite o número"
                                                />
                                            </div>
                                            <div className="space-y-2">
                                                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest px-1">Complemento</label>
                                                <input
                                                    type="text"
                                                    className="w-full p-5 bg-soft rounded-2xl border-none font-bold text-sm outline-none focus:ring-2 focus:ring-primary/20"
                                                    value={settings.store_complement || ""}
                                                    onChange={e => setSettings({ ...settings, store_complement: e.target.value })}
                                                    placeholder="Ex: Sala 2 / Próximo ao..."
                                                />
                                            </div>
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>
                    </section>
                )}

                {/* ABA PAGAMENTOS */}
                {activeTab === "pagamentos" && (
                    <section className="bg-white p-6 sm:p-10 rounded-2xl sm:rounded-[3rem] shadow-premium border border-white space-y-6 sm:space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
                        <div className="flex items-center gap-4 mb-2">
                            <div className="p-2.5 sm:p-3 bg-secondary/10 rounded-xl sm:rounded-2xl text-secondary">
                                <CreditCard size={20} className="sm:w-6 sm:h-6" />
                            </div>
                            <div>
                                <h2 className="text-xl sm:text-2xl font-black text-muted-text">Pagamentos</h2>
                                <p className="text-[9px] sm:text-xs font-bold text-gray-400 uppercase tracking-widest">Prazos e gateway</p>
                            </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 sm:gap-8">
                            <div className="space-y-3 sm:space-y-4">
                                <h3 className="text-[9px] sm:text-xs font-black text-gray-400 uppercase tracking-widest">Habilitar</h3>
                                <div className="space-y-2 sm:space-y-3">
                                    <div className="flex items-center justify-between p-3 sm:p-4 bg-soft rounded-xl sm:rounded-2xl hover:bg-gray-100 transition-colors cursor-pointer"
                                        onClick={() => setSettings({ ...settings, asaas_pix_enabled: !settings.asaas_pix_enabled })}>
                                        <span className="font-bold text-muted-text text-xs sm:text-sm">PIX Automático</span>
                                        <div className={`w-10 h-5 sm:w-12 sm:h-6 rounded-full relative transition-all ${settings.asaas_pix_enabled ? "bg-primary" : "bg-gray-300"}`}>
                                            <div className={`absolute top-0.5 sm:top-1 w-4 h-4 bg-white rounded-full transition-all ${settings.asaas_pix_enabled ? "right-0.5 sm:right-1" : "left-0.5 sm:left-1"}`} />
                                        </div>
                                    </div>
                                    <div className="flex items-center justify-between p-3 sm:p-4 bg-soft rounded-xl sm:rounded-2xl hover:bg-gray-100 transition-colors cursor-pointer"
                                        onClick={() => setSettings({ ...settings, asaas_card_enabled: !settings.asaas_card_enabled })}>
                                        <span className="font-bold text-muted-text text-xs sm:text-sm">Cartão / Link</span>
                                        <div className={`w-10 h-5 sm:w-12 sm:h-6 rounded-full relative transition-all ${settings.asaas_card_enabled ? "bg-primary" : "bg-gray-300"}`}>
                                            <div className={`absolute top-0.5 sm:top-1 w-4 h-4 bg-white rounded-full transition-all ${settings.asaas_card_enabled ? "right-0.5 sm:right-1" : "left-0.5 sm:left-1"}`} />
                                        </div>
                                    </div>
                                </div>
                            </div>

                            <div className="space-y-3 sm:space-y-4">
                                <h3 className="text-[9px] sm:text-xs font-black text-gray-400 uppercase tracking-widest">Expiração (min)</h3>
                                <div className="space-y-3 sm:space-y-4">
                                    <div className="space-y-1.5 sm:space-y-2">
                                        <label className="text-[9px] sm:text-[10px] font-black text-gray-400 uppercase tracking-widest">Carrinho</label>
                                        <input type="number" className="w-full p-4 sm:p-5 bg-soft rounded-xl sm:rounded-2xl border-none font-bold text-xs sm:text-sm"
                                            value={settings?.cart_expiration_minutes || 0}
                                            onChange={e => setSettings({ ...settings, cart_expiration_minutes: parseInt(e.target.value) })} />
                                    </div>
                                    <div className="space-y-1.5 sm:space-y-2">
                                        <label className="text-[9px] sm:text-[10px] font-black text-gray-400 uppercase tracking-widest">Pagamento</label>
                                        <input type="number" className="w-full p-4 sm:p-5 bg-soft rounded-xl sm:rounded-2xl border-none font-bold text-xs sm:text-sm"
                                            value={settings?.payment_expiration_minutes || 0}
                                            onChange={e => setSettings({ ...settings, payment_expiration_minutes: parseInt(e.target.value) })} />
                                    </div>
                                </div>
                            </div>

                            <div className="space-y-3 sm:space-y-4">
                                <h3 className="text-[9px] sm:text-xs font-black text-gray-400 uppercase tracking-widest">Regras de Frete</h3>
                                <div className="space-y-3 sm:space-y-4">
                                    <div className="space-y-1.5 sm:space-y-2">
                                        <label className="text-[9px] sm:text-[10px] font-black text-gray-400 uppercase tracking-widest">Frete Grátis acima de (R$)</label>
                                        <input type="number" className="w-full p-4 sm:p-5 bg-soft rounded-xl sm:rounded-2xl border-none font-bold text-xs sm:text-sm"
                                            value={settings?.free_shipping_min_order || 0}
                                            onChange={e => setSettings({ ...settings, free_shipping_min_order: parseFloat(e.target.value) })} />
                                        <p className="text-[9px] text-gray-400 font-bold px-1">Valor 0 desativa a regra.</p>
                                    </div>
                                    <div className="space-y-1.5 sm:space-y-2">
                                        <label className="text-[9px] sm:text-[10px] font-black text-gray-400 uppercase tracking-widest">Taxa do Entregador (R$)</label>
                                        <input type="number" className="w-full p-4 sm:p-5 bg-soft rounded-xl sm:rounded-2xl border-none font-bold text-xs sm:text-sm"
                                            value={settings?.delivery_man_fee || 0}
                                            onChange={e => setSettings({ ...settings, delivery_man_fee: parseFloat(e.target.value) })} />
                                        <p className="text-[9px] text-gray-400 font-bold px-1">Quanto o entregador recebe em fretes grátis.</p>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </section>
                )}

                {/* ABA WHATSAPP */}
                {activeTab === "whatsapp" && (
                    <section className="bg-white p-6 sm:p-10 rounded-2xl sm:rounded-[3rem] shadow-premium border border-white space-y-6 sm:space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
                        <div className="flex items-center gap-3 sm:gap-4 mb-2">
                            <div className="p-2.5 sm:p-3 bg-accent/10 rounded-xl sm:rounded-2xl text-accent-foreground">
                                <MessageSquare size={20} className="sm:w-6 sm:h-6" />
                            </div>
                            <div>
                                <h2 className="text-xl sm:text-2xl font-black text-muted-text">Automação</h2>
                                <p className="text-[9px] sm:text-xs font-bold text-gray-400 uppercase tracking-widest">Robô e mensagens padrão</p>
                            </div>
                        </div>

                        <div className="space-y-6">
                            <div className="max-w-xs space-y-1.5 sm:space-y-2">
                                <label className="text-[9px] sm:text-[10px] font-black text-gray-400 uppercase tracking-widest px-1">Palavra-Chave</label>
                                <div className="relative">
                                    <input
                                        type="text"
                                        className="w-full p-4 sm:p-5 bg-soft rounded-xl sm:rounded-2xl border-none font-black text-base sm:text-lg uppercase tracking-widest text-primary outline-none focus:ring-2 focus:ring-primary/20"
                                        value={settings?.keyword || ""}
                                        onChange={e => setSettings({ ...settings, keyword: e.target.value })}
                                    />
                                    <Smartphone className="absolute right-4 sm:right-5 top-1/2 -translate-y-1/2 text-gray-300 w-4 h-4 sm:w-5 sm:h-5" size={20} />
                                </div>
                            </div>

                            <div className="grid md:grid-cols-2 gap-6 pt-4">
                                <div className="space-y-2">
                                    <div className="flex justify-between items-center px-1">
                                        <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Regras Padrão (Fixa)</label>
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
                                        <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Mensagem Final Padrão (Fixa)</label>
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

                            {/* Gerenciamento de Templates */}
                            <div className="pt-8 border-t border-gray-100">
                                <div className="flex items-center gap-3 mb-6">
                                    <div className="p-2 bg-primary/10 rounded-xl text-primary">
                                        <LayoutTemplate size={20} />
                                    </div>
                                    <h3 className="text-xl font-black text-muted-text">Modelos de Mensagem (Templates)</h3>
                                </div>

                                <div className="bg-soft/50 p-6 rounded-[2rem] border border-white space-y-6">
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        <div className="space-y-2">
                                            <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest px-1">Novo Template</label>
                                            <input
                                                type="text"
                                                placeholder="Título do template (ex: Regras Promocionais)"
                                                className="w-full p-4 bg-white rounded-xl border-none font-bold text-xs"
                                                value={newTemplate.title}
                                                onChange={e => setNewTemplate({ ...newTemplate, title: e.target.value })}
                                            />
                                        </div>
                                        <div className="space-y-2">
                                            <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest px-1">Tipo</label>
                                            <select
                                                className="w-full p-4 bg-white rounded-xl border-none font-bold text-xs"
                                                value={newTemplate.type}
                                                onChange={e => setNewTemplate({ ...newTemplate, type: e.target.value as any })}
                                            >
                                                <option value="rule">Regra</option>
                                                <option value="final">Mensagem Final</option>
                                            </select>
                                        </div>
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest px-1">Conteúdo</label>
                                        <textarea
                                            placeholder="Conteúdo da mensagem..."
                                            className="w-full p-4 bg-white rounded-xl border-none font-medium text-xs h-24"
                                            value={newTemplate.content}
                                            onChange={e => setNewTemplate({ ...newTemplate, content: e.target.value })}
                                        />
                                    </div>
                                    <Button onClick={handleAddTemplate} className="w-full h-12 rounded-xl font-black gap-2">
                                        <Plus size={18} /> Cadastrar Template
                                    </Button>

                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8 pt-4">
                                        {/* Listagem de Regras */}
                                        <div className="space-y-4">
                                            <h4 className="text-[10px] font-black text-primary uppercase tracking-widest px-1">Regras Cadastradas</h4>
                                            <div className="space-y-3">
                                                {ruleTemplates.length === 0 && <p className="text-[10px] text-gray-400 font-bold italic px-1">Nenhum template de regra.</p>}
                                                {ruleTemplates.map(t => (
                                                    <div key={t.id} className="bg-white p-4 rounded-xl border border-white/50 flex justify-between items-start group">
                                                        <div>
                                                            <p className="font-black text-xs text-muted-text">{t.title}</p>
                                                            <p className="text-[10px] text-gray-400 line-clamp-2 mt-1">{t.content}</p>
                                                        </div>
                                                        <button onClick={() => handleDeleteTemplate(t.id, 'rule')} className="p-2 text-red-300 hover:text-red-500 hover:bg-red-50 rounded-lg">
                                                            <Trash2 size={14} />
                                                        </button>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>

                                        {/* Listagem de Mensagens Finais */}
                                        <div className="space-y-4">
                                            <h4 className="text-[10px] font-black text-primary uppercase tracking-widest px-1">Mensagens Finais</h4>
                                            <div className="space-y-3">
                                                {finalMessageTemplates.length === 0 && <p className="text-[10px] text-gray-400 font-bold italic px-1">Nenhum template de mensagem final.</p>}
                                                {finalMessageTemplates.map(t => (
                                                    <div key={t.id} className="bg-white p-4 rounded-xl border border-white/50 flex justify-between items-start group">
                                                        <div>
                                                            <p className="font-black text-xs text-muted-text">{t.title}</p>
                                                            <p className="text-[10px] text-gray-400 line-clamp-2 mt-1">{t.content}</p>
                                                        </div>
                                                        <button onClick={() => handleDeleteTemplate(t.id, 'final')} className="p-2 text-red-300 hover:text-red-500 hover:bg-red-50 rounded-lg">
                                                            <Trash2 size={14} />
                                                        </button>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </section>
                )}

                {/* ABA SACOLAS */}
                {activeTab === "sacolas" && (
                    <section className="bg-white p-6 sm:p-10 rounded-2xl sm:rounded-[3rem] shadow-premium border border-white space-y-6 sm:space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
                        <div className="flex items-center gap-3 sm:gap-4 mb-2">
                            <div className="p-2.5 sm:p-3 bg-primary/10 rounded-xl sm:rounded-2xl text-primary">
                                <ShoppingBag size={20} className="sm:w-6 sm:h-6" />
                            </div>
                            <div>
                                <h2 className="text-xl sm:text-2xl font-black text-muted-text">Sacolas</h2>
                                <p className="text-[9px] sm:text-xs font-bold text-gray-400 uppercase tracking-widest">Prazos e Lembretes</p>
                            </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 sm:gap-8">
                            <div className="space-y-3 sm:space-y-4">
                                <h3 className="text-[9px] sm:text-xs font-black text-gray-400 uppercase tracking-widest">Validade</h3>
                                <div className="space-y-3 sm:space-y-4">
                                    <div className="space-y-1.5 sm:space-y-2">
                                        <label className="text-[9px] sm:text-[10px] font-black text-gray-400 uppercase tracking-widest">Prazo Máximo (Dias)</label>
                                        <input type="number" className="w-full p-4 sm:p-5 bg-soft rounded-xl sm:rounded-2xl border-none font-bold text-xs sm:text-sm outline-none focus:ring-2 focus:ring-primary/20"
                                            value={settings?.bag_max_days || 30}
                                            onChange={e => setSettings({ ...settings, bag_max_days: parseInt(e.target.value) })}
                                            min={1}
                                        />
                                        <p className="text-[9px] text-gray-400 font-bold px-1 leading-tight">Itens voltam ao estoque após este prazo.</p>
                                    </div>
                                </div>
                            </div>

                            <div className="space-y-3 sm:space-y-4">
                                <h3 className="text-[9px] sm:text-xs font-black text-gray-400 uppercase tracking-widest">Lembretes</h3>
                                <div className="space-y-3 sm:space-y-4">
                                    <div className="space-y-1.5 sm:space-y-2">
                                        <label className="text-[9px] sm:text-[10px] font-black text-gray-400 uppercase tracking-widest">Dias para Avisar</label>
                                        <input type="text" className="w-full p-4 sm:p-5 bg-soft rounded-xl sm:rounded-2xl border-none font-bold text-xs sm:text-sm outline-none focus:ring-2 focus:ring-primary/20"
                                            value={settings?.bag_reminder_days || "15, 10, 7, 3"}
                                            onChange={e => setSettings({ ...settings, bag_reminder_days: e.target.value })}
                                        />
                                        <p className="text-[9px] text-gray-400 font-bold px-1 leading-tight">Ex: "15, 10, 7, 3" para avisar nesses dias.</p>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </section>
                )}
                {/* ABA LANDING PAGE */}
                {activeTab === "landing" && (
                    <section className="bg-white p-6 sm:p-10 rounded-2xl sm:rounded-[3rem] shadow-premium border border-white space-y-6 sm:space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
                        <div className="flex items-center gap-3 sm:gap-4 mb-2">
                            <div className="p-2.5 sm:p-3 bg-primary/10 rounded-xl sm:rounded-2xl text-primary">
                                <LayoutTemplate size={20} className="sm:w-6 sm:h-6" />
                            </div>
                            <div>
                                <h2 className="text-xl sm:text-2xl font-black text-muted-text">Interface</h2>
                                <p className="text-[9px] sm:text-xs font-bold text-gray-400 uppercase tracking-widest">Textos da página inicial</p>
                            </div>
                        </div>

                        <div className="p-4 bg-amber-50 rounded-2xl border border-amber-100 flex gap-3">
                            <Info size={16} className="text-amber-500 shrink-0 mt-0.5" />
                            <p className="text-xs font-bold text-amber-700 leading-relaxed">
                                As alterações aqui refletem diretamente na página inicial (<strong>ninhoelar.com.br</strong>). Salve e recarregue a página para ver as mudanças.
                            </p>
                        </div>

                        {/* Seção Hero */}
                        <div className="space-y-6">
                            <h3 className="text-xs font-black text-gray-400 uppercase tracking-widest border-b border-gray-100 pb-3">🎯 Seção Hero (Banner Principal)</h3>
                            <div className="space-y-2">
                                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest px-1">Badge (ex: Coleção Primavera 2026)</label>
                                <input
                                    type="text"
                                    className="w-full p-5 bg-soft rounded-2xl border-none font-bold text-sm outline-none focus:ring-2 focus:ring-primary/20"
                                    value={settings?.hero_badge_text || ''}
                                    onChange={e => setSettings({ ...settings, hero_badge_text: e.target.value })}
                                    placeholder="Ex: Coleção Verão 2026"
                                />
                            </div>
                            <div className="space-y-2">
                                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest px-1">Título Principal (linhas separadas por | )</label>
                                <input
                                    type="text"
                                    className="w-full p-5 bg-soft rounded-2xl border-none font-bold text-sm outline-none focus:ring-2 focus:ring-primary/20"
                                    value={settings?.hero_title || ''}
                                    onChange={e => setSettings({ ...settings, hero_title: e.target.value })}
                                    placeholder="Ex: VIVA A FESTA!"
                                />
                            </div>
                            <div className="space-y-2">
                                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest px-1">Subtítulo</label>
                                <textarea
                                    className="w-full p-5 bg-soft rounded-2xl border-none font-medium text-sm h-24 outline-none focus:ring-2 focus:ring-primary/20"
                                    value={settings?.hero_subtitle || ''}
                                    onChange={e => setSettings({ ...settings, hero_subtitle: e.target.value })}
                                    placeholder="Ex: Roupas que contam histórias..."
                                />
                            </div>
                            <div className="space-y-2">
                                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest px-1">Barra de Promoção (topo da página)</label>
                                <input
                                    type="text"
                                    className="w-full p-5 bg-soft rounded-2xl border-none font-bold text-sm outline-none focus:ring-2 focus:ring-primary/20"
                                    value={settings?.promo_bar_text || ''}
                                    onChange={e => setSettings({ ...settings, promo_bar_text: e.target.value })}
                                    placeholder="Ex: ✨ Frete Grátis acima de R$ 300"
                                />
                            </div>
                        </div>

                        {/* Redes Sociais */}
                        <div className="space-y-6">
                            <h3 className="text-xs font-black text-gray-400 uppercase tracking-widest border-b border-gray-100 pb-3">🌐 Redes Sociais</h3>
                            <div className="grid md:grid-cols-3 gap-6">
                                <div className="space-y-2">
                                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest px-1 flex items-center gap-2">
                                        <Instagram size={12} /> Instagram (URL)
                                    </label>
                                    <input
                                        type="text"
                                        className="w-full p-5 bg-soft rounded-2xl border-none font-bold text-sm outline-none focus:ring-2 focus:ring-primary/20"
                                        value={settings?.instagram_url || ''}
                                        onChange={e => setSettings({ ...settings, instagram_url: e.target.value })}
                                        placeholder="https://instagram.com/seuperfil"
                                    />
                                </div>
                                <div className="space-y-2">
                                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest px-1 flex items-center gap-2">
                                        <Phone size={12} /> WhatsApp (URL)
                                    </label>
                                    <input
                                        type="text"
                                        className="w-full p-5 bg-soft rounded-2xl border-none font-bold text-sm outline-none focus:ring-2 focus:ring-primary/20"
                                        value={settings?.whatsapp_url || ''}
                                        onChange={e => setSettings({ ...settings, whatsapp_url: e.target.value })}
                                        placeholder="https://wa.me/55..."
                                    />
                                </div>
                                <div className="space-y-2">
                                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest px-1 flex items-center gap-2">
                                        <Facebook size={12} /> Facebook (URL)
                                    </label>
                                    <input
                                        type="text"
                                        className="w-full p-5 bg-soft rounded-2xl border-none font-bold text-sm outline-none focus:ring-2 focus:ring-primary/20"
                                        value={settings?.facebook_url || ''}
                                        onChange={e => setSettings({ ...settings, facebook_url: e.target.value })}
                                        placeholder="https://facebook.com/suapagina"
                                    />
                                </div>
                            </div>
                        </div>

                        {/* Seção Footer */}
                        <div className="space-y-6">
                            <h3 className="text-xs font-black text-gray-400 uppercase tracking-widest border-b border-gray-100 pb-3">🔻 Rodapé (Footer)</h3>
                            <div className="grid md:grid-cols-2 gap-6">
                                <div className="space-y-2">
                                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest px-1 flex items-center gap-2">
                                        <Phone size={12} /> WhatsApp de Contato
                                    </label>
                                    <input
                                        type="text"
                                        className="w-full p-5 bg-soft rounded-2xl border-none font-bold text-sm outline-none focus:ring-2 focus:ring-primary/20"
                                        value={settings?.footer_phone || ''}
                                        onChange={e => setSettings({ ...settings, footer_phone: e.target.value })}
                                        placeholder="Ex: (11) 99999-9999"
                                    />
                                </div>
                                <div className="space-y-2">
                                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest px-1 flex items-center gap-2">
                                        <Mail size={12} /> E-mail de Suporte
                                    </label>
                                    <input
                                        type="text"
                                        className="w-full p-5 bg-soft rounded-2xl border-none font-bold text-sm outline-none focus:ring-2 focus:ring-primary/20"
                                        value={settings?.footer_email || ''}
                                        onChange={e => setSettings({ ...settings, footer_email: e.target.value })}
                                        placeholder="Ex: ola@ninholar.com.br"
                                    />
                                </div>
                            </div>
                            <div className="space-y-2">
                                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest px-1">Texto "Sobre a Loja"</label>
                                <textarea
                                    className="w-full p-5 bg-soft rounded-2xl border-none font-medium text-sm h-24 outline-none focus:ring-2 focus:ring-primary/20"
                                    value={settings?.footer_about || ''}
                                    onChange={e => setSettings({ ...settings, footer_about: e.target.value })}
                                    placeholder="Ex: Vestindo a infância com cores e conforto..."
                                />
                            </div>
                        </div>
                    </section>
                )}

                {/* ABA PRODUTOS (TIPOS) */}
                {activeTab === "produtos" && (
                    <section className="bg-white p-6 sm:p-10 rounded-2xl sm:rounded-[3rem] shadow-premium border border-white space-y-6 sm:space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
                        <div className="flex items-center gap-3 sm:gap-4 mb-2">
                            <div className="p-2.5 sm:p-3 bg-primary/10 rounded-xl sm:rounded-2xl text-primary">
                                <ShoppingBag size={20} className="sm:w-6 sm:h-6" />
                            </div>
                            <div>
                                <h2 className="text-xl sm:text-2xl font-black text-muted-text">Produtos</h2>
                                <p className="text-[9px] sm:text-xs font-bold text-gray-400 uppercase tracking-widest">Classificações (Novo, Usado...)</p>
                            </div>
                        </div>

                        <div className="space-y-6">
                            <div className="flex gap-3">
                                <input
                                    type="text"
                                    className="flex-1 p-5 bg-soft rounded-2xl border-none font-bold text-sm outline-none focus:ring-2 focus:ring-primary/20"
                                    placeholder="Ex: Novo, Usado, Moda Circular..."
                                    value={newProductType}
                                    onChange={e => setNewProductType(e.target.value)}
                                    onKeyDown={e => e.key === 'Enter' && handleAddProductType()}
                                />
                                <Button
                                    className="h-16 px-8 rounded-2xl font-black gap-2"
                                    onClick={handleAddProductType}
                                    isLoading={isAddingType}
                                >
                                    <Plus size={20} />
                                    Adicionar
                                </Button>
                            </div>

                            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                                {productTypes.map((type) => (
                                    <div key={type.id} className="flex items-center justify-between p-5 bg-soft rounded-2xl border border-white/50 group">
                                        <span className="font-bold text-muted-text uppercase tracking-widest text-xs">{type.name}</span>
                                        <button
                                            onClick={() => handleDeleteProductType(type.id)}
                                            className="p-2 text-red-300 hover:text-red-500 hover:bg-red-50 rounded-xl transition-all"
                                        >
                                            <Trash2 size={16} />
                                        </button>
                                    </div>
                                ))}
                            </div>

                            {productTypes.length === 0 && (
                                <div className="text-center py-12 bg-soft/30 rounded-[2rem] border-2 border-dashed border-white/50">
                                    <p className="text-gray-400 font-bold uppercase tracking-widest text-xs">Nenhum tipo cadastrado</p>
                                </div>
                            )}
                        </div>
                    </section>
                )}
            </div>
        </div>
    );
}
