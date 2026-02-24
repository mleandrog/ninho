"use client";

import { useState, useEffect } from "react";
import { AdminSidebar } from "@/components/admin/AdminSidebar";
import { supabase } from "@/lib/supabase";
import { Button } from "@/components/ui/Button";
import {
    Send, Settings as SettingsIcon, Users, Plus, Trash2, QrCode,
    LogOut, Loader2, Smartphone, X, Calendar, Clock, CheckCircle2,
    AlertCircle, Zap, ChevronRight, Play, Square, ShoppingBag, MapPin
} from "lucide-react";
import { toast } from "react-hot-toast";
import { evolutionService } from "@/services/evolution";

// ─── Types ───────────────────────────────────────────────────────────────────
type CampaignStatus = "scheduled" | "running" | "completed" | "stopped" | "pending";

interface Campaign {
    id: number;
    name: string;
    status: CampaignStatus;
    scheduled_at: string | null;
    category_id: string;
    categories?: { name: string };
    total_products: number;
    products_sent: number;
    interval_seconds: number;
    created_at: string;
    group_ids: string[];
}

interface CampaignForm {
    name: string;
    initial_message: string;
    initial_message_interval: number;
    rules_message: string;
    rules_interval: number;
    category_id: string;
    category_interval: number;
    final_message: string;
    scheduled_at: string;
    group_ids: string[];
}

const STATUS_CONFIG: Record<CampaignStatus, { label: string; color: string; dot: string }> = {
    scheduled: { label: "Agendada", color: "text-amber-600 bg-amber-50", dot: "bg-amber-400" },
    pending: { label: "Pendente", color: "text-gray-500 bg-gray-50", dot: "bg-gray-400" },
    running: { label: "Disparando", color: "text-blue-600 bg-blue-50", dot: "bg-blue-500" },
    completed: { label: "Concluída", color: "text-green-600 bg-green-50", dot: "bg-green-500" },
    stopped: { label: "Parada", color: "text-red-600 bg-red-50", dot: "bg-red-400" },
};

// ─── Main Component ───────────────────────────────────────────────────────────
export default function AdminWhatsAppDashboard() {
    const [activeTab, setActiveTab] = useState<"campaigns" | "groups" | "connection" | "bags">("campaigns");
    const [categories, setCategories] = useState<any[]>([]);
    const [groups, setGroups] = useState<any[]>([]);
    const [settings, setSettings] = useState<any>(null);
    const [campaigns, setCampaigns] = useState<Campaign[]>([]);
    const [bags, setBags] = useState<any[]>([]);
    const [serverTime, setServerTime] = useState<string | null>(null);
    const [settingsTab, setSettingsTab] = useState<"general" | "payments">("general");
    const [loading, setLoading] = useState(false);
    const [mounted, setMounted] = useState(false);
    const [showSettings, setShowSettings] = useState(false);
    const [webhookUrl, setWebhookUrl] = useState("");

    // Filtros
    const [search, setSearch] = useState("");
    const [filterStatus, setFilterStatus] = useState<CampaignStatus | "">("");

    // Modal state
    const [showModal, setShowModal] = useState(false);
    const [saving, setSaving] = useState(false);
    const [form, setForm] = useState<CampaignForm>({
        name: "",
        initial_message: "",
        initial_message_interval: 10,
        rules_message: "",
        rules_interval: 10,
        category_id: "",
        category_interval: 30,
        final_message: "",
        scheduled_at: "",
        group_ids: [],
    });

    // Connection states
    const [connectionStatus, setConnectionStatus] = useState<any>(null);
    const [qrCode, setQrCode] = useState<string | null>(null);
    const [connecting, setConnecting] = useState(false);
    const [isStopping, setIsStopping] = useState<number | null>(null);

    // Groups tab state
    const [newGroup, setNewGroup] = useState({ name: "", group_jid: "" });
    const [availableWhatsAppGroups, setAvailableWhatsAppGroups] = useState<any[]>([]);
    const [fetchingGroups, setFetchingGroups] = useState(false);
    const [showGroupSelector, setShowGroupSelector] = useState(false);

    useEffect(() => {
        setMounted(true);
        fetchInitialData();
        fetchServerTime();
        const timeInterval = setInterval(fetchServerTime, 60000); // Atualiza hora a cada minuto

        if (typeof window !== "undefined") {
            setWebhookUrl(`${window.location.protocol}//${window.location.host}/api/whatsapp/webhook`);
        }

        return () => clearInterval(timeInterval);
    }, []);

    const fetchServerTime = async () => {
        try {
            const res = await fetch('/api/utils/time');
            const data = await res.json();
            setServerTime(data.serverTime);
        } catch (e) { console.error("Erro ao buscar hora do servidor", e); }
    };

    useEffect(() => {
        let intervalId: any;
        if (activeTab === "connection" && mounted) {
            checkConnection();
            intervalId = setInterval(async () => {
                try {
                    const data = await evolutionService.getConnectionStatus();
                    if (data?.instance?.state === "open") {
                        setConnectionStatus(data);
                        setQrCode(null);
                        clearInterval(intervalId);
                        toast.success("WhatsApp conectado com sucesso!");
                    }
                } catch { /* silent */ }
            }, 5000);
        }
        return () => { if (intervalId) clearInterval(intervalId); };
    }, [activeTab, mounted]);

    // ─── Data fetching ────────────────────────────────────────────────────────
    useEffect(() => {
        let interval: any;
        if (activeTab === "campaigns") {
            interval = setInterval(fetchInitialData, 5000); // Polling cada 5s
        }
        return () => { if (interval) clearInterval(interval); };
    }, [activeTab]);

    // ─── Data fetching ────────────────────────────────────────────────────────
    const fetchInitialData = async () => {
        // Removemos o setLoading(true) do polling para não ficar piscando
        try {
            const [catRes, grpRes, setRes, campRes, bagRes] = await Promise.all([
                supabase.from("categories").select("*"),
                supabase.from("whatsapp_groups").select("*").order("created_at", { ascending: false }),
                supabase.from("whatsapp_settings").select("*").limit(1).single(),
                supabase
                    .from("whatsapp_campaigns")
                    .select("*, categories:category_id(name)")
                    .order("created_at", { ascending: false }),
                supabase
                    .from("priority_queue")
                    .select("*, products(name, price, image_url)")
                    .in("status", ["waiting", "notified"])
                    .order("created_at", { ascending: false }),
            ]);
            setCategories(catRes.data || []);
            setGroups(grpRes.data || []);
            setSettings(setRes.data);
            setCampaigns((campRes.data as Campaign[]) || []);

            // Agrupar sacolas por cliente
            if (bagRes.data) {
                const grouped = bagRes.data.reduce((acc: any, item: any) => {
                    const phone = item.customer_phone;
                    if (!acc[phone]) acc[phone] = {
                        phone,
                        name: item.customer_name,
                        items: [],
                        total: 0,
                        last_update: item.created_at
                    };
                    acc[phone].items.push(item);
                    acc[phone].total += Number(item.products?.price || 0);
                    return acc;
                }, {});
                setBags(Object.values(grouped));
            }
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    const filteredCampaigns = campaigns?.filter(c => {
        const matchesSearch = (c.name || "").toLowerCase().includes(search.toLowerCase());
        const matchesStatus = filterStatus === "" || c.status === filterStatus;
        return matchesSearch && matchesStatus;
    }) || [];

    // ─── Campaign actions ─────────────────────────────────────────────────────
    const openModal = () => {
        const now = new Date();
        now.setMinutes(now.getMinutes() + 30);
        const localISO = now.toISOString().slice(0, 16);
        setForm({
            name: "",
            initial_message: settings?.initial_message || "",
            initial_message_interval: 10,
            rules_message: settings?.rules_message || "",
            rules_interval: 10,
            category_id: "",
            category_interval: settings?.default_interval_seconds || 30,
            final_message: settings?.final_message || "",
            scheduled_at: localISO,
            group_ids: [],
        });
        setShowModal(true);
    };

    const handleCreateCampaign = async () => {
        if (!form.name.trim()) return toast.error("Informe o nome da campanha.");
        if (!form.category_id) return toast.error("Selecione uma categoria.");
        if (form.group_ids.length === 0) return toast.error("Selecione ao menos um grupo.");
        if (!form.scheduled_at) return toast.error("Defina a data e hora de disparo.");

        setSaving(true);
        try {
            const { count } = await supabase
                .from("products")
                .select("*", { count: "exact", head: true })
                .eq("category_id", form.category_id);

            const { error } = await supabase.from("whatsapp_campaigns").insert({
                name: form.name,
                category_id: form.category_id,
                group_ids: form.group_ids,
                interval_seconds: form.category_interval,
                total_products: count || 0,
                status: "scheduled",
                scheduled_at: new Date(form.scheduled_at).toISOString(),
                initial_message: form.initial_message,
                initial_message_interval: form.initial_message_interval,
                rules_message: form.rules_message,
                rules_interval: form.rules_interval,
                final_message: form.final_message,
            });
            if (error) throw error;

            toast.success("Campanha agendada com sucesso! 🎉");
            setShowModal(false);
            fetchInitialData();
        } catch (err: any) {
            toast.error("Erro ao criar campanha: " + err.message);
        } finally {
            setSaving(false);
        }
    };

    const toggleGroupInForm = (groupId: string) => {
        setForm(prev => ({
            ...prev,
            group_ids: prev.group_ids.includes(groupId)
                ? prev.group_ids.filter(id => id !== groupId)
                : [...prev.group_ids, groupId],
        }));
    };

    const handleStopCampaign = async (id: number) => {
        if (!confirm("Deseja interromper esta campanha?")) return;
        setIsStopping(id);
        try {
            const response = await fetch("/api/whatsapp/campaign/stop", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ campaignId: id }),
            });
            if (response.ok) {
                toast.success("Campanha interrompida!");
                fetchInitialData();
            } else {
                toast.error("Erro ao interromper campanha.");
            }
        } catch {
            toast.error("Erro de conexão.");
        } finally {
            setIsStopping(null);
        }
    };

    const handleDeleteCampaign = async (id: number) => {
        if (!confirm("Deseja excluir esta campanha?")) return;
        try {
            await supabase.from("whatsapp_campaigns").delete().eq("id", id);
            toast.success("Campanha excluída.");
            fetchInitialData();
        } catch {
            toast.error("Erro ao excluir campanha.");
        }
    };

    // ─── Settings ─────────────────────────────────────────────────────────────
    const updateSettings = async () => {
        try {
            const { error } = await supabase
                .from("whatsapp_settings")
                .update({
                    keyword: settings.keyword,
                    rules_message: settings.rules_message,
                    final_message: settings.final_message,
                    default_interval_seconds: settings.default_interval_seconds,
                    cart_expiration_minutes: settings.cart_expiration_minutes,
                    payment_expiration_minutes: settings.payment_expiration_minutes,
                    asaas_pix_enabled: settings.asaas_pix_enabled,
                    asaas_card_enabled: settings.asaas_card_enabled,
                    store_lat: settings.store_lat,
                    store_lng: settings.store_lng,
                    store_address: settings.store_address,
                    store_cep: settings.store_cep,
                })
                .eq("id", settings.id);
            if (error) throw error;
            toast.success("Configurações atualizadas!");
            setShowSettings(false);
        } catch {
            toast.error("Erro ao atualizar configurações.");
        }
    };

    // ─── Groups ───────────────────────────────────────────────────────────────
    const handleAddGroup = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!newGroup.name || !newGroup.group_jid) return toast.error("Preencha todos os campos.");
        try {
            const { error } = await supabase.from("whatsapp_groups").insert([newGroup]);
            if (error) throw error;
            toast.success("Grupo cadastrado!");
            setNewGroup({ name: "", group_jid: "" });
            fetchInitialData();
        } catch (err: any) {
            toast.error("Erro: " + err.message);
        }
    };

    const handleDeleteGroup = async (id: string) => {
        if (!confirm("Deseja excluir este grupo?")) return;
        try {
            await supabase.from("whatsapp_groups").delete().eq("id", id);
            toast.success("Grupo excluído!");
            fetchInitialData();
        } catch {
            toast.error("Erro ao excluir grupo.");
        }
    };

    const toggleGroupStatus = async (id: string, current: boolean) => {
        try {
            await supabase.from("whatsapp_groups").update({ active: !current }).eq("id", id);
            toast.success("Status atualizado!");
            fetchInitialData();
        } catch {
            toast.error("Erro ao atualizar status.");
        }
    };

    const handleFetchGroups = async () => {
        setFetchingGroups(true);
        try {
            const data = await evolutionService.fetchAllGroups();
            if (Array.isArray(data)) {
                setAvailableWhatsAppGroups(data);
                setShowGroupSelector(true);
            } else {
                toast.error(`Erro: ${data?.details || data?.error || "Erro desconhecido"}`);
            }
        } catch {
            toast.error("Verifique se o WhatsApp está conectado.");
        } finally {
            setFetchingGroups(false);
        }
    };

    // ─── Connection ───────────────────────────────────────────────────────────
    const checkConnection = async () => {
        setLoading(true);
        try {
            const data = await evolutionService.getConnectionStatus();
            setConnectionStatus(data);
            if (data?.instance?.state !== "open") connect();
            else setQrCode(null);
        } catch { /* silent */ } finally { setLoading(false); }
    };

    const connect = async () => {
        if (connecting) return;
        setConnecting(true);
        const toastId = toast.loading("Gerando QR Code...");
        try {
            const data = await evolutionService.connectInstance();
            if (data?.base64) { setQrCode(data.base64); toast.success("QR Code gerado!", { id: toastId }); }
            else if (data?.instance?.state === "open") { toast.success("Já conectado!", { id: toastId }); setConnectionStatus(data); setQrCode(null); }
            else toast.error("Resposta inesperada.", { id: toastId });
        } catch { toast.error("Erro ao gerar QR Code", { id: toastId }); }
        finally { setConnecting(false); }
    };

    const handleLogout = async () => {
        if (!confirm("Desconectar o WhatsApp?")) return;
        setLoading(true);
        try {
            await evolutionService.logoutInstance();
            toast.success("Desconectado!");
            setQrCode(null); setConnectionStatus(null);
            checkConnection();
        } catch { toast.error("Erro ao desconectar."); }
        finally { setLoading(false); }
    };

    if (!mounted) {
        return <div className="min-h-screen bg-soft flex items-center justify-center">
            <Loader2 className="animate-spin text-primary" size={32} />
        </div>;
    }

    // ─── Render ───────────────────────────────────────────────────────────────
    return (
        <div className="min-h-screen bg-soft flex">
            <AdminSidebar />

            <main className="flex-1 p-12 overflow-y-auto">
                {/* Header */}
                <header className="flex justify-between items-center mb-10">
                    <div>
                        <h1 className="text-4xl font-black text-muted-text tracking-tighter lowercase flex items-center gap-3">
                            <Zap className="text-primary" size={32} />
                            WhatsApp
                        </h1>
                        <div className="flex items-center gap-4 mt-1">
                            <p className="text-gray-400 font-bold">Gerenciamento de campanhas e grupos</p>
                            {serverTime && (
                                <div className="flex items-center gap-2 px-3 py-1 bg-white rounded-full border border-soft shadow-sm">
                                    <Clock size={12} className="text-primary" />
                                    <span className="text-[10px] font-black text-muted-text uppercase tracking-widest">
                                        Server: {new Date(serverTime).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                                    </span>
                                </div>
                            )}
                        </div>
                    </div>
                    <Button
                        variant="outline"
                        className="gap-2 bg-white rounded-2xl h-14"
                        onClick={() => setShowSettings(!showSettings)}
                    >
                        <SettingsIcon size={18} /> Configurações
                    </Button>
                </header>

                {/* Settings Panel */}
                {showSettings && settings && (
                    <div className="bg-white p-10 rounded-[3rem] shadow-premium border border-white mb-12 space-y-6">
                        <div className="flex justify-between items-center mb-6">
                            <h2 className="text-2xl font-black text-muted-text">Configurações Globais</h2>
                            <div className="flex bg-soft p-1.5 rounded-2xl gap-1">
                                <button
                                    onClick={() => setSettingsTab('general')}
                                    className={`px-4 py-2 rounded-xl text-xs font-black uppercase tracking-widest transition-all ${settingsTab !== 'payments' ? 'bg-primary text-white shadow-sm' : 'text-gray-400 opacity-60'}`}
                                >
                                    Geral
                                </button>
                                <button
                                    onClick={() => setSettingsTab('payments')}
                                    className={`px-4 py-2 rounded-xl text-xs font-black uppercase tracking-widest transition-all ${settingsTab === 'payments' ? 'bg-primary text-white shadow-sm' : 'text-gray-400 opacity-60'}`}
                                >
                                    Pagamentos
                                </button>
                            </div>
                        </div>

                        <div id="settings-container">
                            {/* ABA GERAL */}
                            {settingsTab === 'general' && (
                                <div className="settings-content-general space-y-6">
                                    <div className="grid md:grid-cols-2 gap-6">
                                        <div className="space-y-2">
                                            <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Palavra-chave</label>
                                            <input type="text" className="w-full p-4 bg-soft rounded-2xl border-none font-bold"
                                                value={settings.keyword}
                                                onChange={e => setSettings({ ...settings, keyword: e.target.value.toUpperCase() })} />
                                        </div>
                                        <div className="space-y-2">
                                            <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest border-l-2 border-primary pl-2">Intervalo Padrão (segundos)</label>
                                            <input type="number" className="w-full p-4 bg-soft rounded-2xl border-none font-bold"
                                                value={settings.default_interval_seconds}
                                                onChange={e => setSettings({ ...settings, default_interval_seconds: parseInt(e.target.value) })} />
                                        </div>
                                    </div>

                                    {/* LOGÍSTICA */}
                                    <div className="p-6 bg-soft/50 rounded-[2rem] border border-white space-y-4">
                                        <h3 className="text-[10px] font-black text-primary uppercase tracking-widest flex items-center gap-2">
                                            <MapPin size={14} /> Logística da Loja
                                        </h3>
                                        <div className="grid md:grid-cols-2 gap-4">
                                            <div className="grid md:grid-cols-3 gap-4">
                                                <div className="md:col-span-2 space-y-2">
                                                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Endereço de Origem</label>
                                                    <input type="text" className="w-full p-4 bg-white rounded-2xl border-none font-bold text-xs"
                                                        value={settings.store_address || ""}
                                                        onChange={e => setSettings({ ...settings, store_address: e.target.value })}
                                                        placeholder="Rua Exemplo, 123, Cidade - UF" />
                                                </div>
                                                <div className="space-y-2">
                                                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">CEP</label>
                                                    <input type="text" className="w-full p-4 bg-white rounded-2xl border-none font-bold text-xs"
                                                        value={settings.store_cep || ""}
                                                        onChange={e => setSettings({ ...settings, store_cep: e.target.value })}
                                                        placeholder="00000-000" />
                                                </div>
                                            </div>
                                            <div className="grid grid-cols-2 gap-4">
                                                <div className="space-y-2">
                                                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Latitude</label>
                                                    <input type="number" step="any" className="w-full p-4 bg-white rounded-2xl border-none font-bold text-xs"
                                                        value={settings.store_lat || ""}
                                                        onChange={e => setSettings({ ...settings, store_lat: parseFloat(e.target.value) })} />
                                                </div>
                                                <div className="space-y-2">
                                                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Longitude</label>
                                                    <input type="number" step="any" className="w-full p-4 bg-white rounded-2xl border-none font-bold text-xs"
                                                        value={settings.store_lng || ""}
                                                        onChange={e => setSettings({ ...settings, store_lng: parseFloat(e.target.value) })} />
                                                </div>
                                            </div>
                                        </div>
                                        <p className="text-[9px] text-gray-400 font-bold italic">
                                            * Essas coordenadas são usadas como ponto de partida para calcular a distância e o preço do frete.
                                        </p>
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Mensagem de Regras padrão</label>
                                        <textarea className="w-full p-4 bg-soft rounded-2xl border-none font-bold h-28 outline-none focus:ring-2 focus:ring-primary/20"
                                            value={settings.rules_message}
                                            onChange={e => setSettings({ ...settings, rules_message: e.target.value })} />
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Mensagem final padrão</label>
                                        <textarea className="w-full p-4 bg-soft rounded-2xl border-none font-bold h-28 outline-none focus:ring-2 focus:ring-primary/20"
                                            value={settings.final_message}
                                            onChange={e => setSettings({ ...settings, final_message: e.target.value })}
                                            placeholder={"Use {categoryName} para incluir o nome da categoria."} />
                                    </div>
                                </div>
                            )}

                            {/* ABA PAGAMENTOS */}
                            {settingsTab === 'payments' && (
                                <div className="settings-content-payments space-y-8">
                                    <div className="grid md:grid-cols-2 gap-8">
                                        {/* Prazos */}
                                        <div className="space-y-6">
                                            <h3 className="text-sm font-black text-muted-text uppercase tracking-widest border-l-4 border-primary pl-3">Prazos de Expiração</h3>
                                            <div className="space-y-4">
                                                <div className="space-y-2">
                                                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest flex justify-between">
                                                        Link do Carrinho <span>(Minutos)</span>
                                                    </label>
                                                    <input type="number" className="w-full p-4 bg-soft rounded-2xl border-none font-bold"
                                                        value={settings.cart_expiration_minutes || 60}
                                                        onChange={e => setSettings({ ...settings, cart_expiration_minutes: parseInt(e.target.value) })} />
                                                    <p className="text-[9px] text-gray-400 font-medium">Tempo que o cliente tem para revisar o carrinho e confirmar.</p>
                                                </div>
                                                <div className="space-y-2">
                                                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest flex justify-between">
                                                        Link de Pagamento <span>(Minutos)</span>
                                                    </label>
                                                    <input type="number" className="w-full p-4 bg-soft rounded-2xl border-none font-bold"
                                                        value={settings.payment_expiration_minutes || 60}
                                                        onChange={e => setSettings({ ...settings, payment_expiration_minutes: parseInt(e.target.value) })} />
                                                    <p className="text-[9px] text-gray-400 font-medium">Validade do QR Code PIX ou Link de Cartão gerado no Asaas.</p>
                                                </div>
                                            </div>
                                        </div>

                                        {/* Métodos de Pagamento */}
                                        <div className="space-y-6">
                                            <h3 className="text-sm font-black text-muted-text uppercase tracking-widest border-l-4 border-green-400 pl-3">Métodos Habilitados</h3>
                                            <div className="space-y-3">
                                                <label className="flex items-center justify-between p-4 bg-soft rounded-2xl cursor-pointer hover:bg-gray-100 transition-all">
                                                    <div className="flex items-center gap-3">
                                                        <div className="w-10 h-10 bg-white rounded-xl flex items-center justify-center text-green-500 shadow-sm">
                                                            <Zap size={20} />
                                                        </div>
                                                        <div>
                                                            <p className="font-black text-muted-text text-sm">PIX (Asaas)</p>
                                                            <p className="text-[10px] text-gray-400 font-bold uppercase">Liberação Imediata</p>
                                                        </div>
                                                    </div>
                                                    <input type="checkbox" className="w-6 h-6 rounded-lg border-none bg-white text-primary focus:ring-0"
                                                        checked={settings.asaas_pix_enabled !== false}
                                                        onChange={e => setSettings({ ...settings, asaas_pix_enabled: e.target.checked })} />
                                                </label>

                                                <label className="flex items-center justify-between p-4 bg-soft rounded-2xl cursor-pointer hover:bg-gray-100 transition-all">
                                                    <div className="flex items-center gap-3">
                                                        <div className="w-10 h-10 bg-white rounded-xl flex items-center justify-center text-blue-500 shadow-sm">
                                                            <Smartphone size={20} />
                                                        </div>
                                                        <div>
                                                            <p className="font-black text-muted-text text-sm">Cartão / Boleto / Outros</p>
                                                            <p className="text-[10px] text-gray-400 font-bold uppercase">Checkout Externo Asaas</p>
                                                        </div>
                                                    </div>
                                                    <input type="checkbox" className="w-6 h-6 rounded-lg border-none bg-white text-primary focus:ring-0"
                                                        checked={settings.asaas_card_enabled !== false}
                                                        onChange={e => setSettings({ ...settings, asaas_card_enabled: e.target.checked })} />
                                                </label>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>

                        <div className="flex gap-4 pt-4 border-t border-soft">
                            <Button variant="outline" onClick={() => setShowSettings(false)} className="flex-1 h-14 rounded-full font-black uppercase text-xs tracking-widest">Cancelar</Button>
                            <Button onClick={updateSettings} className="flex-[2] h-14 rounded-full shadow-vibrant font-black uppercase text-xs tracking-widest">Salvar Alterações</Button>
                        </div>
                    </div>
                )}

                {/* Tabs */}
                <div className="flex gap-4 mb-8">
                    <button onClick={() => setActiveTab("campaigns")} className={`px-8 py-4 rounded-2xl font-black text-sm transition-all flex items-center gap-2 ${activeTab === "campaigns" ? "bg-primary text-white shadow-vibrant" : "bg-white text-gray-400 hover:text-muted-text"}`}>
                        <Send size={18} /> Campanhas
                    </button>
                    <button onClick={() => setActiveTab("bags")} className={`px-8 py-4 rounded-2xl font-black text-sm transition-all flex items-center gap-2 ${activeTab === "bags" ? "bg-primary text-white shadow-vibrant" : "bg-white text-gray-400 hover:text-muted-text"}`}>
                        <ShoppingBag size={18} /> Sacolas
                    </button>
                    <button onClick={() => setActiveTab("groups")} className={`px-8 py-4 rounded-2xl font-black text-sm transition-all flex items-center gap-2 ${activeTab === "groups" ? "bg-primary text-white shadow-vibrant" : "bg-white text-gray-400 hover:text-muted-text"}`}>
                        <Users size={18} /> Grupos ({groups.length})
                    </button>
                    <button onClick={() => setActiveTab("connection")} className={`px-8 py-4 rounded-2xl font-black text-sm transition-all flex items-center gap-2 ${activeTab === "connection" ? "bg-primary text-white shadow-vibrant" : "bg-white text-gray-400 hover:text-muted-text"}`}>
                        <QrCode size={18} /> Conexão
                    </button>
                </div>

                {/* Bags Tab content */}
                {activeTab === "bags" && (
                    <div className="space-y-6">
                        <div className="flex justify-between items-center bg-white p-6 rounded-[2rem] shadow-sm border border-white">
                            <div>
                                <h2 className="text-xl font-black text-muted-text lowercase tracking-tighter">Sacolas de Clientes</h2>
                                <p className="text-xs font-bold text-gray-400">Total de {bags.length} sacolas ativas com itens reservados.</p>
                            </div>
                        </div>

                        {bags.length === 0 ? (
                            <div className="bg-white p-20 rounded-[3rem] text-center shadow-premium border border-white">
                                <ShoppingBag className="w-16 h-16 text-soft mx-auto mb-6 opacity-20" />
                                <h3 className="text-xl font-black text-gray-300 lowercase tracking-tighter">Nenhuma sacola aberta no momento</h3>
                            </div>
                        ) : (
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                                {bags.map((bag: any) => (
                                    <div key={bag.phone} className="bg-white rounded-[2.5rem] shadow-premium border border-white overflow-hidden flex flex-col hover:border-primary/20 transition-all">
                                        <div className="p-6 border-b border-soft flex-1">
                                            <div className="flex items-center gap-4 mb-4">
                                                <div className="w-12 h-12 bg-primary/10 rounded-2xl flex items-center justify-center text-primary font-black uppercase shadow-sm">
                                                    {bag.name?.charAt(0) || 'U'}
                                                </div>
                                                <div className="min-w-0">
                                                    <h3 className="font-black text-muted-text truncate text-sm">{bag.name || 'Usuário'}</h3>
                                                    <p className="text-[10px] font-black text-primary uppercase tracking-widest">{bag.phone}</p>
                                                </div>
                                            </div>

                                            <div className="space-y-3 mt-4">
                                                {bag.items.map((item: any, idx: number) => (
                                                    <div key={idx} className="flex items-center gap-3 bg-soft p-2 rounded-xl">
                                                        <div className="w-8 h-8 rounded-lg overflow-hidden bg-white shrink-0 shadow-sm">
                                                            <img src={item.products?.image_url} alt="" className="w-full h-full object-cover" />
                                                        </div>
                                                        <div className="min-w-0 flex-1">
                                                            <p className="text-[10px] font-black text-muted-text truncate">{item.products?.name}</p>
                                                            <p className="text-[9px] font-bold text-primary">R$ {Number(item.products?.price || 0).toFixed(2).replace('.', ',')}</p>
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>

                                        <div className="p-6 bg-primary/[0.02] flex justify-between items-center">
                                            <div>
                                                <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest">Total da Sacola</p>
                                                <p className="text-lg font-black text-primary">R$ {bag.total.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</p>
                                            </div>
                                            <div className="text-right">
                                                <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest">Itens</p>
                                                <p className="text-xs font-black text-muted-text">{bag.items.length}</p>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                )}
                {/* ── CAMPAIGNS TAB ── */}
                {activeTab === "campaigns" && (
                    <div className="space-y-6">
                        {/* Top bar */}
                        <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
                            <div className="flex-1">
                                <h2 className="text-2xl font-black text-muted-text">Campanhas Programadas</h2>
                                <p className="text-sm font-bold text-gray-400 mt-0.5">As campanhas são disparadas automaticamente no horário configurado</p>

                                {/* Filtros integrados no top bar */}
                                <div className="mt-6 flex flex-wrap gap-3">
                                    <div className="relative flex-1 min-w-[200px]">
                                        <div className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400">
                                            <Send size={16} className="rotate-[-45deg]" />
                                        </div>
                                        <input
                                            type="text"
                                            placeholder="Buscar campanha..."
                                            className="w-full pl-10 pr-4 py-3 bg-white rounded-2xl border-none font-bold text-sm outline-none shadow-premium focus:ring-2 focus:ring-primary/20 transition-all placeholder:text-gray-300"
                                            value={search}
                                            onChange={e => setSearch(e.target.value)}
                                        />
                                    </div>
                                    <select
                                        className="pl-6 pr-10 py-3 bg-white rounded-2xl border-none font-black text-[10px] uppercase tracking-widest outline-none shadow-premium appearance-none cursor-pointer focus:ring-2 focus:ring-primary/20"
                                        value={filterStatus}
                                        onChange={e => setFilterStatus(e.target.value as any)}
                                    >
                                        <option value="">Todos os Status</option>
                                        {Object.entries(STATUS_CONFIG).map(([key, cfg]) => (
                                            <option key={key} value={key}>{cfg.label}</option>
                                        ))}
                                    </select>
                                </div>
                            </div>
                            <Button
                                className="h-14 px-8 rounded-full shadow-vibrant gap-2 font-black flex-shrink-0"
                                onClick={openModal}
                            >
                                <Plus size={20} /> Criar Campanha
                            </Button>
                        </div>

                        {/* Campaign list */}
                        {loading ? (
                            <div className="bg-white p-20 rounded-[2.5rem] flex justify-center shadow-premium">
                                <div className="w-10 h-10 border-4 border-primary border-t-transparent rounded-full animate-spin" />
                            </div>
                        ) : filteredCampaigns.length === 0 ? (
                            <div className="bg-white/60 border-4 border-dashed border-soft rounded-[3rem] p-24 text-center">
                                <div className="text-6xl mb-4">🔍</div>
                                <h3 className="text-2xl font-black text-muted-text opacity-50">Nenhuma campanha encontrada</h3>
                                <p className="text-gray-400 font-bold mt-2">Tente ajustar seus filtros de busca</p>
                            </div>
                        ) : (
                            <div className="space-y-4">
                                {filteredCampaigns.map(campaign => {
                                    const st = STATUS_CONFIG[campaign.status] || STATUS_CONFIG.pending;
                                    const progress = campaign.total_products > 0
                                        ? Math.round((campaign.products_sent / campaign.total_products) * 100)
                                        : 0;
                                    return (
                                        <div key={campaign.id}
                                            className={`bg-white p-6 rounded-[2rem] shadow-premium border-2 transition-all ${campaign.status === "running" ? "border-primary shadow-vibrant ring-4 ring-primary/5" : "border-white"}`}
                                        >
                                            <div className="flex items-center gap-5">
                                                {/* Status dot */}
                                                <div className={`w-3 h-3 rounded-full flex-shrink-0 ${st.dot} ${campaign.status === "running" ? "animate-ping" : ""}`} />

                                                {/* Name + category */}
                                                <div className="flex-1 min-w-0">
                                                    <h3 className="font-black text-muted-text truncate">{campaign.name}</h3>
                                                    <p className="text-xs font-bold text-gray-400">{campaign.categories?.name || "Categoria"}</p>
                                                </div>

                                                {/* Status badge */}
                                                <span className={`text-[10px] font-black uppercase tracking-widest px-3 py-1 rounded-full ${st.color}`}>
                                                    {st.label}
                                                </span>

                                                {/* Scheduled date */}
                                                {campaign.scheduled_at && (
                                                    <div className="flex items-center gap-1.5 text-xs font-bold text-gray-400">
                                                        <Calendar size={13} />
                                                        {new Date(campaign.scheduled_at).toLocaleString("pt-BR", {
                                                            day: "2-digit", month: "2-digit", year: "numeric",
                                                            hour: "2-digit", minute: "2-digit"
                                                        })}
                                                    </div>
                                                )}

                                                {/* Progress */}
                                                <div className="flex items-center gap-2">
                                                    <div className="w-20 h-1.5 bg-soft rounded-full overflow-hidden">
                                                        <div className={`h-full rounded-full ${campaign.status === "running" ? "bg-primary animate-pulse" : "bg-primary"}`}
                                                            style={{ width: `${progress}%` }} />
                                                    </div>
                                                    <span className="text-xs font-black text-gray-400 w-8">{progress}%</span>
                                                </div>

                                                {/* Products count */}
                                                <div className="text-xs font-bold text-gray-400 whitespace-nowrap">
                                                    {campaign.products_sent}/{campaign.total_products} produtos
                                                </div>

                                                {/* Actions */}
                                                <div className="flex items-center gap-2 flex-shrink-0">
                                                    {campaign.status === "running" && (
                                                        <button
                                                            onClick={() => handleStopCampaign(campaign.id)}
                                                            disabled={isStopping === campaign.id}
                                                            className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-red-50 text-red-500 hover:bg-red-100 text-xs font-black uppercase transition-all"
                                                        >
                                                            {isStopping === campaign.id ? <Loader2 size={14} className="animate-spin" /> : <Square size={14} />}
                                                            Parar
                                                        </button>
                                                    )}
                                                    <button
                                                        onClick={() => handleDeleteCampaign(campaign.id)}
                                                        className="w-9 h-9 rounded-xl flex items-center justify-center text-gray-300 hover:text-red-400 hover:bg-red-50 transition-all"
                                                    >
                                                        <Trash2 size={16} />
                                                    </button>
                                                    <button
                                                        onClick={() => {
                                                            if (typeof window !== "undefined") {
                                                                window.location.href = `/admin/whatsapp/campanhas/${campaign.id}`;
                                                            }
                                                        }}
                                                        className="w-9 h-9 rounded-xl flex items-center justify-center text-gray-300 hover:text-primary hover:bg-primary/5 transition-all"
                                                    >
                                                        <ChevronRight size={18} />
                                                    </button>
                                                </div>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        )}
                    </div>
                )}

                {/* ── GROUPS TAB ── */}
                {activeTab === "groups" && (
                    <div className="grid lg:grid-cols-3 gap-8">
                        <div className="bg-white p-10 rounded-[3rem] shadow-premium border border-white space-y-8 h-fit">
                            <h2 className="text-2xl font-black text-muted-text flex items-center justify-between gap-3">
                                <div className="flex items-center gap-3"><Plus size={24} className="text-primary" /> Novo Grupo</div>
                                <Button type="button" variant="outline" size="sm" className="h-10 rounded-xl gap-2 font-bold px-4"
                                    onClick={handleFetchGroups} disabled={fetchingGroups}>
                                    {fetchingGroups ? <Loader2 size={16} className="animate-spin" /> : <Users size={16} />}
                                    <span className="hidden sm:inline">Buscar</span>
                                </Button>
                            </h2>
                            {showGroupSelector && (
                                <div className="bg-soft p-4 rounded-2xl max-h-60 overflow-y-auto space-y-2 border-2 border-primary/20">
                                    <div className="flex justify-between items-center mb-2">
                                        <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Grupos da API</span>
                                        <button onClick={() => setShowGroupSelector(false)} className="text-xs font-bold text-primary hover:underline">fechar</button>
                                    </div>
                                    {availableWhatsAppGroups.map(g => (
                                        <button key={g.id} type="button"
                                            onClick={() => { setNewGroup({ name: g.subject, group_jid: g.id }); setShowGroupSelector(false); }}
                                            className="w-full text-left p-3 bg-white rounded-xl hover:bg-primary/5 border border-transparent hover:border-primary/20 transition-all">
                                            <div className="font-black text-sm text-muted-text">{g.subject}</div>
                                            <div className="text-[10px] text-gray-400 font-mono truncate">{g.id}</div>
                                        </button>
                                    ))}
                                </div>
                            )}
                            <form onSubmit={handleAddGroup} className="space-y-6">
                                <div className="space-y-2">
                                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Nome do Grupo</label>
                                    <input type="text" placeholder="Ex: Mamães VIP"
                                        className="w-full p-4 bg-soft rounded-2xl border-none font-bold text-sm"
                                        value={newGroup.name}
                                        onChange={e => setNewGroup({ ...newGroup, name: e.target.value })} />
                                </div>
                                <div className="space-y-2">
                                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">ID do Grupo (JID)</label>
                                    <input type="text" placeholder="123456789@g.us"
                                        className="w-full p-4 bg-soft rounded-2xl border-none font-bold text-sm"
                                        value={newGroup.group_jid}
                                        onChange={e => setNewGroup({ ...newGroup, group_jid: e.target.value })} />
                                </div>
                                <Button type="submit" className="w-full h-16 rounded-full shadow-vibrant font-black text-lg gap-2">
                                    <Plus size={20} /> Adicionar Grupo
                                </Button>
                            </form>
                        </div>
                        <div className="lg:col-span-2 space-y-6">
                            {groups.map(group => (
                                <div key={group.id} className="bg-white p-8 rounded-[2.5rem] shadow-premium border border-white flex justify-between items-center">
                                    <div className="flex items-center gap-4">
                                        <div className="w-14 h-14 bg-soft rounded-2xl flex items-center justify-center">
                                            <Users size={24} className="text-primary" />
                                        </div>
                                        <div>
                                            <h3 className="text-xl font-black text-muted-text">{group.name}</h3>
                                            <p className="text-xs font-bold text-gray-400 mt-0.5 font-mono">{group.group_jid}</p>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-3">
                                        <button onClick={() => toggleGroupStatus(group.id, group.active)}
                                            className={`px-4 py-2 rounded-full text-[10px] font-black uppercase tracking-widest transition-all ${group.active ? "bg-green-100 text-green-600 hover:bg-green-200" : "bg-red-100 text-red-600 hover:bg-red-200"}`}>
                                            {group.active ? "Ativo" : "Inativo"}
                                        </button>
                                        <button onClick={() => handleDeleteGroup(group.id)}
                                            className="w-10 h-10 rounded-xl flex items-center justify-center text-red-300 hover:bg-red-50 hover:text-red-500 transition-all">
                                            <Trash2 size={16} />
                                        </button>
                                    </div>
                                </div>
                            ))}
                            {groups.length === 0 && (
                                <div className="bg-white/50 border-4 border-dashed border-soft rounded-[3rem] p-20 text-center">
                                    <div className="text-6xl mb-4">💬</div>
                                    <h3 className="text-2xl font-black text-muted-text opacity-50">Nenhum grupo cadastrado</h3>
                                    <p className="text-gray-400 font-bold mt-2">Adicione seu primeiro grupo para começar as campanhas</p>
                                </div>
                            )}
                        </div>
                    </div>
                )}

                {/* ── CONNECTION TAB ── */}
                {activeTab === "connection" && (
                    <div className="bg-white p-10 rounded-[3rem] shadow-premium border border-white flex flex-col items-center justify-center min-h-[500px] text-center space-y-8">
                        {loading ? (
                            <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin" />
                        ) : connectionStatus?.instance?.state === "open" ? (
                            <>
                                <div className="w-32 h-32 bg-green-100 rounded-full flex items-center justify-center text-green-600">
                                    <Smartphone size={64} />
                                </div>
                                <h2 className="text-3xl font-black text-muted-text">WhatsApp Conectado!</h2>
                                <p className="text-gray-400 font-bold max-w-md">
                                    Instância <span className="text-primary">{connectionStatus?.instance?.instanceName}</span> está ativa.
                                </p>
                                <div className="flex gap-4">
                                    <Button variant="outline" onClick={checkConnection} className="rounded-full h-12 px-8">Atualizar Status</Button>
                                    <Button onClick={handleLogout} className="rounded-full h-12 px-8 bg-red-100 text-red-600 hover:bg-red-200 shadow-none border-none">
                                        <LogOut size={18} className="mr-2" /> Desconectar
                                    </Button>
                                </div>
                                <div className="w-full max-w-md pt-8 border-t border-gray-100">
                                    <div className="bg-soft p-6 rounded-[2rem] text-left space-y-4">
                                        <div className="flex items-center gap-2 mb-2">
                                            <SettingsIcon size={20} className="text-primary" />
                                            <h3 className="font-black text-muted-text uppercase text-xs tracking-widest">Configurações Avançadas</h3>
                                        </div>
                                        <div className="space-y-2">
                                            <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">URL do Webhook</label>
                                            <div className="flex gap-2">
                                                <input type="text" id="webhook-url" className="flex-1 p-3 bg-white rounded-xl border-none font-bold text-xs"
                                                    placeholder="https://seu-site.com/api/whatsapp/webhook"
                                                    value={webhookUrl} onChange={e => setWebhookUrl(e.target.value)} />
                                                <Button size="sm" className="rounded-xl px-4 font-black text-[10px]"
                                                    onClick={async (e) => {
                                                        const target = e.currentTarget.parentElement;
                                                        const input = target?.querySelector('input') as HTMLInputElement;
                                                        const url = input?.value;
                                                        if (!url) return toast.error("Insira uma URL válida");
                                                        const tid = toast.loading("Configurando Webhook...");
                                                        try {
                                                            const res = await evolutionService.registerWebhook(url);
                                                            if (res.status === "SUCCESS" || res.webhook) toast.success("Webhook configurado!", { id: tid });
                                                            else toast.error(`Erro: ${res.message || "Falha"}`, { id: tid });
                                                        } catch { toast.error("Erro ao registrar Webhook", { id: tid }); }
                                                    }}>
                                                    Configurar
                                                </Button>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </>
                        ) : (
                            <>
                                <h2 className="text-3xl font-black text-muted-text">Conectar WhatsApp</h2>
                                <p className="text-gray-400 font-bold max-w-md">
                                    Abra o WhatsApp, vá em <span className="text-muted-text">Aparelhos Conectados &gt; Conectar Aparelho</span> e escaneie o código abaixo.
                                </p>
                                {qrCode ? (
                                    <div className="p-4 bg-white rounded-3xl shadow-lg border-4 border-soft">
                                        {/* eslint-disable-next-line @next/next/no-img-element */}
                                        <img src={qrCode} alt="QR Code" className="w-64 h-64 object-contain" />
                                    </div>
                                ) : (
                                    <div className="w-64 h-64 bg-soft rounded-3xl flex items-center justify-center">
                                        {connecting ? (
                                            <div className="text-center">
                                                <Loader2 size={32} className="mx-auto text-primary animate-spin mb-2" />
                                                <span className="text-xs font-black text-gray-400 uppercase tracking-widest">Gerando QR Code...</span>
                                            </div>
                                        ) : (
                                            <Button onClick={connect} variant="outline" className="rounded-full">Gerar QR Code</Button>
                                        )}
                                    </div>
                                )}
                            </>
                        )}
                    </div>
                )}

                {/* ── MODAL CRIAR CAMPANHA ── */}
                {showModal && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center p-4"
                        style={{ background: "rgba(0,0,0,0.45)", backdropFilter: "blur(6px)" }}>
                        <div className="bg-white rounded-[3rem] shadow-2xl w-full max-w-2xl max-h-[92vh] overflow-y-auto">
                            {/* Modal Header */}
                            <div className="flex justify-between items-center p-10 pb-6 sticky top-0 bg-white rounded-t-[3rem] z-10 border-b border-soft">
                                <div className="flex items-center gap-3">
                                    <div className="w-10 h-10 bg-primary/10 rounded-2xl flex items-center justify-center">
                                        <Zap size={20} className="text-primary" />
                                    </div>
                                    <div>
                                        <h2 className="text-2xl font-black text-muted-text">Nova Campanha</h2>
                                        <p className="text-xs font-bold text-gray-400">Configure e agende o disparo</p>
                                    </div>
                                </div>
                                <button onClick={() => setShowModal(false)}
                                    className="w-10 h-10 rounded-2xl bg-soft flex items-center justify-center text-gray-400 hover:text-muted-text hover:bg-gray-100 transition-all">
                                    <X size={18} />
                                </button>
                            </div>

                            <div className="p-10 space-y-8">
                                {/* Nome */}
                                <div className="space-y-2">
                                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Nome da Campanha</label>
                                    <input type="text" placeholder="Ex: Liquidação Inverno 2026"
                                        className="w-full p-4 bg-soft rounded-2xl border-2 border-transparent focus:border-primary/30 font-bold outline-none transition-all"
                                        value={form.name}
                                        onChange={e => setForm({ ...form, name: e.target.value })} />
                                </div>

                                {/* Data e hora */}
                                <div className="space-y-2">
                                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest flex items-center justify-between gap-1.5">
                                        <div className="flex items-center gap-1.5"><Calendar size={12} /> Data e Hora do Disparo</div>
                                        {serverTime && (
                                            <span className="text-primary normal-case">
                                                Horário do servidor: {new Date(serverTime).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                                            </span>
                                        )}
                                    </label>
                                    <input type="datetime-local"
                                        className="w-full p-4 bg-soft rounded-2xl border-2 border-transparent focus:border-primary/30 font-bold outline-none transition-all"
                                        value={form.scheduled_at}
                                        onChange={e => setForm({ ...form, scheduled_at: e.target.value })} />
                                </div>

                                <hr className="border-soft" />

                                {/* Mensagem Inicial */}
                                <div className="space-y-4">
                                    <div className="flex items-center gap-2">
                                        <div className="w-6 h-6 rounded-full bg-primary text-white flex items-center justify-center text-xs font-black">1</div>
                                        <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Mensagem Inicial</label>
                                    </div>
                                    <textarea placeholder="Olá! Bem-vindo(a) ao nosso catálogo especial! 🎉"
                                        className="w-full p-4 bg-soft rounded-2xl border-2 border-transparent focus:border-primary/30 font-bold h-24 outline-none resize-none transition-all"
                                        value={form.initial_message}
                                        onChange={e => setForm({ ...form, initial_message: e.target.value })} />
                                    <div className="flex items-center gap-3">
                                        <Clock size={14} className="text-gray-400 flex-shrink-0" />
                                        <label className="text-xs font-black text-gray-400">Aguardar</label>
                                        <input type="number" min={5} max={300}
                                            className="w-24 p-2 bg-soft rounded-xl border-none font-black text-center text-sm outline-none"
                                            value={form.initial_message_interval}
                                            onChange={e => setForm({ ...form, initial_message_interval: parseInt(e.target.value) })} />
                                        <label className="text-xs font-black text-gray-400">segundos antes de continuar</label>
                                    </div>
                                </div>

                                <hr className="border-soft" />

                                {/* Mensagem de Regras */}
                                <div className="space-y-4">
                                    <div className="flex items-center gap-2">
                                        <div className="w-6 h-6 rounded-full bg-primary text-white flex items-center justify-center text-xs font-black">2</div>
                                        <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Mensagem de Regras</label>
                                    </div>
                                    <textarea placeholder="📋 Nossas regras: Para comprar, envie o código do produto..."
                                        className="w-full p-4 bg-soft rounded-2xl border-2 border-transparent focus:border-primary/30 font-bold h-24 outline-none resize-none transition-all"
                                        value={form.rules_message}
                                        onChange={e => setForm({ ...form, rules_message: e.target.value })} />
                                    <div className="flex items-center gap-3">
                                        <Clock size={14} className="text-gray-400 flex-shrink-0" />
                                        <label className="text-xs font-black text-gray-400">Aguardar</label>
                                        <input type="number" min={5} max={300}
                                            className="w-24 p-2 bg-soft rounded-xl border-none font-black text-center text-sm outline-none"
                                            value={form.rules_interval}
                                            onChange={e => setForm({ ...form, rules_interval: parseInt(e.target.value) })} />
                                        <label className="text-xs font-black text-gray-400">segundos antes de continuar</label>
                                    </div>
                                </div>

                                <hr className="border-soft" />

                                {/* Categoria */}
                                <div className="space-y-4">
                                    <div className="flex items-center gap-2">
                                        <div className="w-6 h-6 rounded-full bg-primary text-white flex items-center justify-center text-xs font-black">3</div>
                                        <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Categoria de Produtos</label>
                                    </div>
                                    <select className="w-full p-4 bg-soft rounded-2xl border-2 border-transparent focus:border-primary/30 font-bold outline-none transition-all"
                                        value={form.category_id}
                                        onChange={e => setForm({ ...form, category_id: e.target.value })}>
                                        <option value="">Selecione uma categoria</option>
                                        {categories.map(cat => (
                                            <option key={cat.id} value={cat.id}>{cat.name}</option>
                                        ))}
                                    </select>
                                    <div className="flex items-center gap-3">
                                        <Clock size={14} className="text-gray-400 flex-shrink-0" />
                                        <label className="text-xs font-black text-gray-400">Intervalo entre produtos</label>
                                        <input type="number" min={10} max={300}
                                            className="w-24 p-2 bg-soft rounded-xl border-none font-black text-center text-sm outline-none"
                                            value={form.category_interval}
                                            onChange={e => setForm({ ...form, category_interval: parseInt(e.target.value) })} />
                                        <label className="text-xs font-black text-gray-400">segundos</label>
                                    </div>
                                </div>

                                <hr className="border-soft" />

                                {/* Mensagem Final */}
                                <div className="space-y-4">
                                    <div className="flex items-center gap-2">
                                        <div className="w-6 h-6 rounded-full bg-primary text-white flex items-center justify-center text-xs font-black">4</div>
                                        <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Mensagem Final</label>
                                    </div>
                                    <textarea placeholder="É isso! Esses são todos os produtos disponíveis. Para comprar, responda com o código! 🛒"
                                        className="w-full p-4 bg-soft rounded-2xl border-2 border-transparent focus:border-primary/30 font-bold h-24 outline-none resize-none transition-all"
                                        value={form.final_message}
                                        onChange={e => setForm({ ...form, final_message: e.target.value })} />
                                </div>

                                <hr className="border-soft" />

                                {/* Grupos */}
                                <div className="space-y-4">
                                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Grupos de Destino</label>
                                    {groups.filter(g => g.active).length === 0 ? (
                                        <div className="p-6 bg-soft rounded-2xl text-center text-sm font-bold text-gray-400">
                                            Nenhum grupo ativo. Cadastre grupos na aba "Grupos".
                                        </div>
                                    ) : (
                                        <div className="grid grid-cols-2 gap-3">
                                            {groups.filter(g => g.active).map(group => (
                                                <button key={group.id} type="button"
                                                    onClick={() => toggleGroupInForm(group.id)}
                                                    className={`p-4 rounded-2xl border-2 transition-all text-left ${form.group_ids.includes(group.id)
                                                        ? "border-primary bg-primary/5"
                                                        : "border-soft hover:border-primary/20 bg-soft"}`}>
                                                    <div className="flex items-center gap-2">
                                                        <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center transition-all ${form.group_ids.includes(group.id) ? "border-primary bg-primary" : "border-gray-300"}`}>
                                                            {form.group_ids.includes(group.id) && <CheckCircle2 size={10} className="text-white" />}
                                                        </div>
                                                        <span className="font-black text-sm text-muted-text">{group.name}</span>
                                                    </div>
                                                </button>
                                            ))}
                                        </div>
                                    )}
                                </div>

                                {/* Actions */}
                                <div className="flex gap-4 pt-2">
                                    <Button variant="outline" className="flex-1 h-14 rounded-full font-black"
                                        onClick={() => setShowModal(false)} disabled={saving}>
                                        Cancelar
                                    </Button>
                                    <Button className="flex-1 h-14 rounded-full shadow-vibrant font-black gap-2"
                                        onClick={handleCreateCampaign} disabled={saving}>
                                        {saving ? <Loader2 size={18} className="animate-spin" /> : <Calendar size={18} />}
                                        {saving ? "Agendando..." : "Agendar Campanha"}
                                    </Button>
                                </div>
                            </div>
                        </div>
                    </div>
                )}
            </main>
        </div>
    );
}
