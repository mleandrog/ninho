"use client";

import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import { Button } from "@/components/ui/Button";
import {
    Send, Settings as SettingsIcon, Users, Plus, Trash2, QrCode,
    LogOut, Loader2, Smartphone, X, Calendar, Clock, CheckCircle2,
    AlertCircle, Zap, ChevronRight, Play, Square, ShoppingBag, MapPin,
    Bold, Italic
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
    const [activeTab, setActiveTab] = useState<"campaigns" | "groups" | "connection">("campaigns");
    const [categories, setCategories] = useState<any[]>([]);
    const [groups, setGroups] = useState<any[]>([]);
    const [settings, setSettings] = useState<any>(null);
    const [campaigns, setCampaigns] = useState<Campaign[]>([]);
    const [serverTime, setServerTime] = useState<string | null>(null);
    const [settingsTab, setSettingsTab] = useState<"general" | "payments">("general");
    const [loading, setLoading] = useState(false);
    const [mounted, setMounted] = useState(false);
    const [showSettings, setShowSettings] = useState(false);
    const [webhookUrl, setWebhookUrl] = useState("");

    // Filtros
    const [search, setSearch] = useState("");
    const [filterStatus, setFilterStatus] = useState<CampaignStatus | "">("");
    const [filterDateFrom, setFilterDateFrom] = useState("");
    const [filterDateTo, setFilterDateTo] = useState("");

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

    // Modal de Confirmação customizado (Substitui window.confirm)
    const [confirmDialog, setConfirmDialog] = useState<{ isOpen: boolean, action: 'stop' | 'delete' | null, id: number | string | null, title: string, description: string }>({
        isOpen: false, action: null, id: null, title: '', description: ''
    });

    // Groups tab state
    const [newGroup, setNewGroup] = useState({ name: "", group_jid: "" });
    const [availableWhatsAppGroups, setAvailableWhatsAppGroups] = useState<any[]>([]);
    const [fetchingGroups, setFetchingGroups] = useState(false);
    const [showGroupSelector, setShowGroupSelector] = useState(false);

    // Templates state
    const [ruleTemplates, setRuleTemplates] = useState<any[]>([]);
    const [finalMessageTemplates, setFinalMessageTemplates] = useState<any[]>([]);

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
            // Formata a hora para HH:MM:SS
            const date = new Date(data.serverTime);
            setServerTime(date.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit", second: "2-digit" }));
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
            const [catRes, grpRes, setRes, campRes, rulesRes, finalsRes] = await Promise.all([
                supabase.from("categories").select(`
                    id, 
                    name, 
                    slug, 
                    image_url, 
                    created_at,
                    products:products(count)
                `).eq('products.status', 'available').eq('products.available_in_store', true),
                supabase.from("whatsapp_groups").select("*").order("created_at", { ascending: false }),
                supabase.from("whatsapp_settings").select("*").limit(1).single(),
                supabase
                    .from("whatsapp_campaigns")
                    .select("*, categories:category_id(name)")
                    .order("created_at", { ascending: false }),
                supabase.from("whatsapp_rule_templates").select("*").order("title"),
                supabase.from("whatsapp_final_message_templates").select("*").order("title"),
            ]);
            setCategories(catRes.data || []);
            setGroups(grpRes.data || []);
            setSettings(setRes.data);
            setCampaigns((campRes.data as Campaign[]) || []);
            setRuleTemplates(rulesRes.data || []);
            setFinalMessageTemplates(finalsRes.data || []);
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    const filteredCampaigns = campaigns?.filter(c => {
        const matchesSearch = (c.name || "").toLowerCase().includes(search.toLowerCase());
        const matchesStatus = filterStatus === "" || c.status === filterStatus;

        // Filtro por data (baseado no agendamento)
        let matchesDate = true;
        if (c.scheduled_at) {
            const campDate = c.scheduled_at.split('T')[0];
            if (filterDateFrom && campDate < filterDateFrom) matchesDate = false;
            if (filterDateTo && campDate > filterDateTo) matchesDate = false;
        }

        return matchesSearch && matchesStatus && matchesDate;
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

    const insertFormat = (field: 'rules_message' | 'final_message', format: string) => {
        const textarea = document.getElementById(field) as HTMLTextAreaElement;
        if (!textarea) {
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

    const toggleGroupInForm = (groupId: string) => {
        setForm(prev => ({
            ...prev,
            group_ids: prev.group_ids.includes(groupId)
                ? prev.group_ids.filter(id => id !== groupId)
                : [...prev.group_ids, groupId],
        }));
    };

    const handleStopCampaign = async (id: number) => {
        setConfirmDialog({
            isOpen: true,
            action: 'stop',
            id: id,
            title: 'Interromper Campanha',
            description: 'Tem certeza que deseja interromper esta campanha? As mensagens finais serão enviadas em segundo plano.'
        });
    };

    const confirmStopCampaign = async (id: number) => {
        setConfirmDialog({ ...confirmDialog, isOpen: false });
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
        setConfirmDialog({
            isOpen: true,
            action: 'delete',
            id: id,
            title: 'Excluir Campanha',
            description: 'Tem certeza que deseja excluir esta campanha? Esta ação não pode ser desfeita.'
        });
    };

    const confirmDeleteCampaign = async (id: number) => {
        setConfirmDialog({ ...confirmDialog, isOpen: false });
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
                })
                .eq("id", settings.id);
            if (error) throw error;
            toast.success("Configurações atualizadas!");
            setShowSettings(false);
        } catch {
            toast.error("Erro ao atualizar configurações");
        }
    };

    const insertText = (field: keyof CampaignForm, tag: string) => {
        const value = form[field] as string;
        setForm({ ...form, [field]: tag + value + tag });
    };

    const insertEmoji = (field: keyof CampaignForm, emoji: string) => {
        setForm({ ...form, [field]: (form[field] as string) + emoji });
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

    const executeConfirmDialogAction = () => {
        if (confirmDialog.action === 'stop' && confirmDialog.id) {
            confirmStopCampaign(confirmDialog.id as number);
        } else if (confirmDialog.action === 'delete' && confirmDialog.id) {
            confirmDeleteCampaign(confirmDialog.id as number);
        }
    };

    return (
        <div className="animate-in fade-in duration-500">
            <header className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-6 mb-8 lg:mb-10">
                <div className="flex items-center gap-4 sm:gap-6">
                    <div>
                        <h1 className="text-3xl sm:text-4xl font-black text-muted-text tracking-tighter lowercase flex items-center gap-2 sm:gap-3">
                            <Zap className="text-primary w-6 h-6 sm:w-8 sm:h-8" />
                            WhatsApp
                        </h1>
                        <p className="text-xs sm:text-sm font-bold text-gray-400 mt-1">Gerenciamento de campanhas e grupos</p>
                    </div>

                    {serverTime && (
                        <div className="bg-white px-3 sm:px-5 py-2 sm:py-3 rounded-xl sm:rounded-2xl shadow-premium border border-white flex items-center gap-3 sm:gap-4 group transition-all">
                            <div className="relative">
                                <Clock size={16} className="text-primary animate-pulse sm:w-5 sm:h-5" />
                                <div className="absolute -top-0.5 -right-0.5 w-1.5 h-1.5 bg-green-400 rounded-full border border-white" />
                            </div>
                            <div className="flex flex-col">
                                <span className="text-[8px] sm:text-[10px] font-black text-gray-400 uppercase tracking-widest leading-none mb-0.5 sm:mb-1">Servidor</span>
                                <span className="text-sm sm:text-lg font-mono font-black text-muted-text tabular-nums tracking-wider leading-none">{serverTime}</span>
                            </div>
                        </div>
                    )}
                </div>
                <Button variant="outline" className="h-12 sm:h-14 px-6 sm:px-8 rounded-xl sm:rounded-2xl font-black gap-2 sm:gap-3 shadow-premium bg-white border-white text-xs sm:text-sm w-full sm:w-auto" onClick={() => (window.location.href = '/admin/configuracoes')}>
                    <SettingsIcon size={18} />
                    Configurações
                </Button>
            </header>

            {/* Settings Panel */}
            {showSettings && settings && (
                <div className="bg-white p-5 sm:p-10 rounded-2xl sm:rounded-[3rem] shadow-premium border border-white mb-8 sm:mb-12 space-y-4 sm:space-y-6">
                    <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-4 sm:mb-6">
                        <h2 className="text-xl sm:text-2xl font-black text-muted-text">Configurações Globais</h2>
                        <div className="flex bg-soft p-1 rounded-xl sm:rounded-2xl gap-1 w-full sm:w-auto">
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
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6">
                                    <div className="space-y-1.5 sm:space-y-2">
                                        <label className="text-[9px] sm:text-[10px] font-black text-gray-400 uppercase tracking-widest">Palavra-chave</label>
                                        <input type="text" className="w-full p-3 sm:p-4 bg-soft rounded-xl sm:rounded-2xl border-none font-bold text-sm"
                                            value={settings.keyword}
                                            onChange={e => setSettings({ ...settings, keyword: e.target.value.toUpperCase() })} />
                                    </div>
                                    <div className="space-y-1.5 sm:space-y-2">
                                        <label className="text-[9px] sm:text-[10px] font-black text-gray-400 uppercase tracking-widest border-l-2 border-primary pl-2">Intervalo Padrão (segundos)</label>
                                        <input type="number" className="w-full p-3 sm:p-4 bg-soft rounded-xl sm:rounded-2xl border-none font-bold text-sm"
                                            value={settings.default_interval_seconds}
                                            onChange={e => setSettings({ ...settings, default_interval_seconds: parseInt(e.target.value) })} />
                                    </div>
                                </div>

                                {/* LOGÍSTICA */}
                                <div className="p-4 sm:p-6 bg-soft/50 rounded-2xl sm:rounded-[2rem] border border-white space-y-4">
                                    <h3 className="text-[9px] sm:text-[10px] font-black text-primary uppercase tracking-widest flex items-center gap-2">
                                        <MapPin size={14} /> Logística da Loja
                                    </h3>
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                                            <div className="sm:col-span-2 space-y-1.5 sm:space-y-2">
                                                <label className="text-[9px] sm:text-[10px] font-black text-gray-400 uppercase tracking-widest">Endereço de Origem</label>
                                                <input type="text" className="w-full p-3 sm:p-4 bg-white rounded-xl sm:rounded-2xl border-none font-bold text-[10px] sm:text-xs"
                                                    value={settings.store_address || ""}
                                                    onChange={e => setSettings({ ...settings, store_address: e.target.value })}
                                                    placeholder="Rua Exemplo, 123, Cidade - UF" />
                                            </div>
                                            <div className="space-y-1.5 sm:space-y-2">
                                                <label className="text-[9px] sm:text-[10px] font-black text-gray-400 uppercase tracking-widest">CEP</label>
                                                <input type="text" className="w-full p-3 sm:p-4 bg-white rounded-xl sm:rounded-2xl border-none font-bold text-[10px] sm:text-xs"
                                                    value={settings.store_cep || ""}
                                                    onChange={e => setSettings({ ...settings, store_cep: e.target.value })}
                                                    placeholder="00000-000" />
                                            </div>
                                        </div>
                                        <div className="grid grid-cols-2 gap-3 sm:gap-4">
                                            <div className="space-y-1.5 sm:space-y-2">
                                                <label className="text-[9px] sm:text-[10px] font-black text-gray-400 uppercase tracking-widest">Lat</label>
                                                <input type="number" step="any" className="w-full p-3 sm:p-4 bg-white rounded-xl sm:rounded-2xl border-none font-bold text-[10px] sm:text-xs"
                                                    value={settings.store_lat || ""}
                                                    onChange={e => setSettings({ ...settings, store_lat: parseFloat(e.target.value) })} />
                                            </div>
                                            <div className="space-y-1.5 sm:space-y-2">
                                                <label className="text-[9px] sm:text-[10px] font-black text-gray-400 uppercase tracking-widest">Lng</label>
                                                <input type="number" step="any" className="w-full p-3 sm:p-4 bg-white rounded-xl sm:rounded-2xl border-none font-bold text-[10px] sm:text-xs"
                                                    value={settings.store_lng || ""}
                                                    onChange={e => setSettings({ ...settings, store_lng: parseFloat(e.target.value) })} />
                                            </div>
                                        </div>
                                    </div>
                                    <p className="text-[8px] sm:text-[9px] text-gray-400 font-bold italic">
                                        * Coordenadas para cálculo do frete.
                                    </p>
                                </div>
                                <div className="space-y-2">
                                    <div className="flex justify-between items-center px-1">
                                        <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Regras Padrão</label>
                                        <div className="flex gap-1 items-center bg-white p-1 rounded-xl border border-gray-100 shadow-sm">
                                            <button onClick={() => insertFormat('rules_message', '*')} className="p-1.5 hover:bg-gray-50 rounded-lg transition-all text-primary" title="Negrito">
                                                <Bold size={12} />
                                            </button>
                                            <button onClick={() => insertFormat('rules_message', '_')} className="p-1.5 hover:bg-gray-50 rounded-lg transition-all text-primary" title="Itálico">
                                                <Italic size={12} />
                                            </button>
                                            <div className="w-px h-3 bg-gray-100 mx-1" />
                                            {["🛍️", "✨", "🎉", "🐥"].map(emoji => (
                                                <button key={emoji} onClick={() => insertFormat('rules_message', emoji)} className="p-1 hover:bg-gray-50 rounded-lg transition-all text-base">
                                                    {emoji}
                                                </button>
                                            ))}
                                        </div>
                                    </div>
                                    <textarea
                                        id="rules_message"
                                        className="w-full p-4 bg-soft rounded-2xl border-none font-bold h-28 outline-none focus:ring-2 focus:ring-primary/20"
                                        value={settings?.rules_message || ""}
                                        onChange={e => setSettings({ ...settings, rules_message: e.target.value })} />
                                </div>
                                <div className="space-y-2">
                                    <div className="flex justify-between items-center px-1">
                                        <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Mensagem final padrão</label>
                                        <div className="flex gap-1 items-center bg-white p-1 rounded-xl border border-gray-100 shadow-sm">
                                            <button onClick={() => insertFormat('final_message', '*')} className="p-1.5 hover:bg-gray-50 rounded-lg transition-all text-primary" title="Negrito">
                                                <Bold size={12} />
                                            </button>
                                            <button onClick={() => insertFormat('final_message', '_')} className="p-1.5 hover:bg-gray-50 rounded-lg transition-all text-primary" title="Itálico">
                                                <Italic size={12} />
                                            </button>
                                            <div className="w-px h-3 bg-gray-100 mx-1" />
                                            {["📦", "✅", "🙌", "💙"].map(emoji => (
                                                <button key={emoji} onClick={() => insertFormat('final_message', emoji)} className="p-1 hover:bg-gray-50 rounded-lg transition-all text-base">
                                                    {emoji}
                                                </button>
                                            ))}
                                        </div>
                                    </div>
                                    <textarea
                                        id="final_message"
                                        className="w-full p-4 bg-soft rounded-2xl border-none font-bold h-28 outline-none focus:ring-2 focus:ring-primary/20"
                                        value={settings?.final_message || ""}
                                        onChange={e => setSettings({ ...settings, final_message: e.target.value })}
                                        placeholder={"Use {categoryName} para incluir o nome da categoria."} />
                                </div>
                            </div>
                        )}

                        {/* ABA PAGAMENTOS */}
                        {settingsTab === 'payments' && (
                            <div className="settings-content-payments space-y-6 sm:space-y-8">
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 sm:gap-8">
                                    {/* Prazos */}
                                    <div className="space-y-4 sm:space-y-6">
                                        <h3 className="text-xs sm:text-sm font-black text-muted-text uppercase tracking-widest border-l-4 border-primary pl-3">Prazos de Expiração</h3>
                                        <div className="space-y-3 sm:space-y-4">
                                            <div className="space-y-1.5 sm:space-y-2">
                                                <label className="text-[9px] sm:text-[10px] font-black text-gray-400 uppercase tracking-widest flex justify-between">
                                                    Carrinho <span>(Minutos)</span>
                                                </label>
                                                <input type="number" className="w-full p-3 sm:p-4 bg-soft rounded-xl sm:rounded-2xl border-none font-bold text-sm"
                                                    value={settings?.cart_expiration_minutes || 60}
                                                    onChange={e => setSettings({ ...settings, cart_expiration_minutes: parseInt(e.target.value) })} />
                                            </div>
                                            <div className="space-y-1.5 sm:space-y-2">
                                                <label className="text-[9px] sm:text-[10px] font-black text-gray-400 uppercase tracking-widest flex justify-between">
                                                    Pagamento <span>(Minutos)</span>
                                                </label>
                                                <input type="number" className="w-full p-3 sm:p-4 bg-soft rounded-xl sm:rounded-2xl border-none font-bold text-sm"
                                                    value={settings.payment_expiration_minutes || 60}
                                                    onChange={e => setSettings({ ...settings, payment_expiration_minutes: parseInt(e.target.value) })} />
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
            <div className="flex bg-white p-1 rounded-xl sm:rounded-2xl shadow-premium border border-white gap-1 mb-6 sm:mb-8">
                <button
                    onClick={() => setActiveTab("campaigns")}
                    className={`flex-1 px-2 sm:px-8 py-2.5 sm:py-4 rounded-lg sm:rounded-xl font-black text-[9px] sm:text-sm transition-all flex items-center justify-center gap-1.5 sm:gap-2 ${activeTab === "campaigns" ? "bg-primary text-white shadow-vibrant" : "bg-transparent text-gray-400 hover:text-muted-text"}`}
                >
                    <Send size={14} className="sm:w-[18px] sm:h-[18px]" /> <span className="truncate">Campanhas</span>
                </button>
                <button
                    onClick={() => setActiveTab("groups")}
                    className={`flex-1 px-2 sm:px-8 py-2.5 sm:py-4 rounded-lg sm:rounded-xl font-black text-[9px] sm:text-sm transition-all flex items-center justify-center gap-1.5 sm:gap-2 ${activeTab === "groups" ? "bg-primary text-white shadow-vibrant" : "bg-transparent text-gray-400 hover:text-muted-text"}`}
                >
                    <Users size={14} className="sm:w-[18px] sm:h-[18px]" /> <span className="truncate">Grupos ({groups.length})</span>
                </button>
                <button
                    onClick={() => setActiveTab("connection")}
                    className={`flex-1 px-2 sm:px-8 py-2.5 sm:py-4 rounded-lg sm:rounded-xl font-black text-[9px] sm:text-sm transition-all flex items-center justify-center gap-1.5 sm:gap-2 ${activeTab === "connection" ? "bg-primary text-white shadow-vibrant" : "bg-transparent text-gray-400 hover:text-muted-text"}`}
                >
                    <QrCode size={14} className="sm:w-[18px] sm:h-[18px]" /> <span className="truncate">Conexão</span>
                </button>
            </div>

            {/* ── CAMPAIGNS TAB ── */}
            {activeTab === "campaigns" && (
                <div className="space-y-6">
                    {/* Top bar */}
                    <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 sm:gap-6">
                        <div className="flex-1 w-full sm:w-auto">
                            <h2 className="text-xl sm:text-2xl font-black text-muted-text">Campanhas Programadas</h2>
                            <p className="text-[10px] sm:text-sm font-bold text-gray-400 mt-0.5">Disparadas automaticamente no horário configurado</p>

                            {/* Filtros integrados no top bar */}
                            <div className="mt-4 sm:mt-6 flex flex-col sm:flex-row flex-wrap gap-3">
                                <div className="relative w-full sm:flex-1 sm:min-w-[200px]">
                                    <div className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400">
                                        <Send size={14} className="rotate-[-45deg]" />
                                    </div>
                                    <input
                                        type="text"
                                        placeholder="Buscar campanha..."
                                        className="w-full pl-10 pr-4 py-2.5 sm:py-3 bg-white rounded-xl sm:rounded-2xl border-none font-bold text-xs sm:text-sm outline-none shadow-premium focus:ring-2 focus:ring-primary/20 transition-all placeholder:text-gray-300"
                                        value={search}
                                        onChange={e => setSearch(e.target.value)}
                                    />
                                </div>
                                <div className="flex gap-2 w-full sm:w-auto">
                                    <select
                                        className="flex-1 sm:flex-none pl-4 sm:pl-6 pr-8 sm:pr-10 py-2.5 sm:py-3 bg-white rounded-xl sm:rounded-2xl border-none font-black text-[9px] sm:text-[10px] uppercase tracking-widest outline-none shadow-premium appearance-none cursor-pointer focus:ring-2 focus:ring-primary/20"
                                        value={filterStatus}
                                        onChange={e => setFilterStatus(e.target.value as any)}
                                    >
                                        <option value="">Status</option>
                                        {Object.entries(STATUS_CONFIG).map(([key, cfg]) => (
                                            <option key={key} value={key}>{cfg.label}</option>
                                        ))}
                                    </select>
                                    <div className="flex-1 sm:flex-none flex gap-2 items-center bg-white px-3 sm:px-4 py-2 rounded-xl sm:rounded-2xl shadow-premium border border-white overflow-hidden">
                                        <input
                                            type="date"
                                            className="w-full bg-transparent border-none font-bold text-[10px] sm:text-xs outline-none focus:ring-0 p-0"
                                            value={filterDateFrom}
                                            onChange={e => setFilterDateFrom(e.target.value)}
                                        />
                                        <span className="text-gray-300 font-black text-[8px] sm:text-[10px]">/</span>
                                        <input
                                            type="date"
                                            className="w-full bg-transparent border-none font-bold text-[10px] sm:text-xs outline-none focus:ring-0 p-0"
                                            value={filterDateTo}
                                            onChange={e => setFilterDateTo(e.target.value)}
                                        />
                                    </div>
                                </div>
                            </div>
                        </div>
                        <Button
                            className="h-12 sm:h-14 px-6 sm:px-8 rounded-xl sm:rounded-full shadow-vibrant gap-2 font-black w-full sm:w-auto text-xs sm:text-sm"
                            onClick={openModal}
                        >
                            <Plus size={18} /> Criar Campanha
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
                                        className={`bg-white p-3 sm:p-6 rounded-xl sm:rounded-[2rem] shadow-premium border-2 transition-all group/row ${campaign.status === "running" ? "border-primary shadow-vibrant ring-4 ring-primary/5" : "border-white"}`}
                                    >
                                        <div className="flex items-center gap-3 sm:gap-5">
                                            {/* Status dot */}
                                            <div className={`w-2.5 h-2.5 sm:w-3 sm:h-3 rounded-full flex-shrink-0 ${st.dot} ${campaign.status === "running" ? "animate-ping" : ""}`} />

                                            {/* Name + category */}
                                            <div className="flex-1 min-w-0">
                                                <h3 className="text-sm sm:text-base font-black text-muted-text truncate">{campaign.name}</h3>
                                                <p className="text-[10px] sm:text-xs font-bold text-gray-400">{campaign.categories?.name || "Categoria"}</p>
                                            </div>

                                            {/* Info Desktop / Semi-Desktop */}
                                            <div className="hidden md:flex items-center gap-6 flex-shrink-0">
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
                                                    <span className="text-sm font-black text-gray-400 w-8">{progress}%</span>
                                                </div>

                                                {/* Products count */}
                                                <div className="text-xs font-bold text-gray-400 whitespace-nowrap">
                                                    {campaign.products_sent}/{campaign.total_products} produtos
                                                </div>
                                            </div>

                                            {/* Mini Info Mobile */}
                                            <div className="flex md:hidden flex-col items-end gap-0.5 mr-1">
                                                <span className={`text-[8px] font-black uppercase tracking-[0.05em] px-2 py-0.5 rounded-md ${st.color}`}>
                                                    {st.label}
                                                </span>
                                                <span className="text-[9px] font-bold text-gray-300">
                                                    {campaign.products_sent}/{campaign.total_products}
                                                </span>
                                            </div>

                                            {/* Actions */}
                                            <div className="flex items-center gap-1 sm:gap-2 flex-shrink-0">
                                                {campaign.status === "running" && (
                                                    <button
                                                        onClick={() => handleStopCampaign(campaign.id)}
                                                        disabled={isStopping === campaign.id}
                                                        className="flex items-center gap-1 px-2 sm:px-3 py-1.5 sm:py-2 rounded-lg sm:rounded-xl bg-red-50 text-red-500 hover:bg-red-100 text-[10px] font-black uppercase transition-all"
                                                    >
                                                        {isStopping === campaign.id ? <Loader2 size={12} className="animate-spin" /> : <Square size={12} />}
                                                        <span className="hidden sm:inline">Parar</span>
                                                    </button>
                                                )}
                                                <button
                                                    onClick={() => handleDeleteCampaign(campaign.id)}
                                                    className="w-8 h-8 sm:w-9 sm:h-9 rounded-lg sm:rounded-xl flex items-center justify-center text-gray-300 hover:text-red-400 hover:bg-red-50 transition-all"
                                                >
                                                    <Trash2 size={14} className="sm:w-4 sm:h-4" />
                                                </button>
                                                <button
                                                    onClick={() => {
                                                        if (typeof window !== "undefined") {
                                                            window.location.href = `/admin/whatsapp/campanhas/${campaign.id}`;
                                                        }
                                                    }}
                                                    className="w-8 h-8 sm:w-9 sm:h-9 rounded-lg sm:rounded-xl flex items-center justify-center text-gray-300 hover:text-primary hover:bg-primary/5 transition-all"
                                                >
                                                    <ChevronRight size={16} className="sm:w-[18px] sm:h-[18px]" />
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
                    <div className="bg-white p-6 sm:p-10 rounded-2xl sm:rounded-[3rem] shadow-premium border border-white space-y-6 sm:space-y-8 h-fit">
                        <h2 className="text-xl sm:text-2xl font-black text-muted-text flex items-center justify-between gap-3">
                            <div className="flex items-center gap-2 sm:gap-3"><Plus size={20} className="text-primary sm:w-6 sm:h-6" /> Novo Grupo</div>
                            <Button type="button" variant="outline" size="sm" className="h-9 sm:h-10 rounded-lg sm:rounded-xl gap-2 font-bold px-3 sm:px-4 text-[10px] sm:text-xs"
                                onClick={handleFetchGroups} disabled={fetchingGroups}>
                                {fetchingGroups ? <Loader2 size={14} className="animate-spin" /> : <Users size={14} className="sm:w-4 sm:h-4" />}
                                <span>API</span>
                            </Button>
                        </h2>
                        {showGroupSelector && (
                            <div className="bg-soft p-3 sm:p-4 rounded-xl sm:rounded-2xl max-h-60 overflow-y-auto space-y-2 border-2 border-primary/20">
                                <div className="flex justify-between items-center mb-2">
                                    <span className="text-[8px] sm:text-[10px] font-black text-gray-400 uppercase tracking-widest">Grupos da API</span>
                                    <button onClick={() => setShowGroupSelector(false)} className="text-[10px] font-bold text-primary hover:underline">fechar</button>
                                </div>
                                {availableWhatsAppGroups.map(g => (
                                    <button key={g.id} type="button"
                                        onClick={() => { setNewGroup({ name: g.subject, group_jid: g.id }); setShowGroupSelector(false); }}
                                        className="w-full text-left p-2.5 sm:p-3 bg-white rounded-lg sm:rounded-xl hover:bg-primary/5 border border-transparent hover:border-primary/20 transition-all">
                                        <div className="font-black text-xs sm:text-sm text-muted-text truncate">{g.subject}</div>
                                        <div className="text-[8px] sm:text-[10px] text-gray-400 font-mono truncate">{g.id}</div>
                                    </button>
                                ))}
                            </div>
                        )}
                        <form onSubmit={handleAddGroup} className="space-y-4 sm:space-y-6">
                            <div className="space-y-1.5 sm:space-y-2">
                                <label className="text-[8px] sm:text-[10px] font-black text-gray-400 uppercase tracking-widest">Nome do Grupo</label>
                                <input type="text" placeholder="Ex: Mamães VIP"
                                    className="w-full p-3 sm:p-4 bg-soft rounded-xl sm:rounded-2xl border-none font-bold text-xs sm:text-sm"
                                    value={newGroup.name}
                                    onChange={e => setNewGroup({ ...newGroup, name: e.target.value })} />
                            </div>
                            <div className="space-y-1.5 sm:space-y-2">
                                <label className="text-[8px] sm:text-[10px] font-black text-gray-400 uppercase tracking-widest">ID do Grupo (JID)</label>
                                <input type="text" placeholder="123456789@g.us"
                                    className="w-full p-3 sm:p-4 bg-soft rounded-xl sm:rounded-2xl border-none font-bold text-xs sm:text-sm"
                                    value={newGroup.group_jid}
                                    onChange={e => setNewGroup({ ...newGroup, group_jid: e.target.value })} />
                            </div>
                            <Button type="submit" className="w-full h-14 sm:h-16 rounded-xl sm:rounded-full shadow-vibrant font-black text-sm sm:text-lg gap-2">
                                <Plus size={18} /> Adicionar
                            </Button>
                        </form>
                    </div>
                    <div className="lg:col-span-2 space-y-6">
                        {groups.map(group => (
                            <div key={group.id} className="bg-white p-4 sm:p-8 rounded-xl sm:rounded-[2.5rem] shadow-premium border border-white flex justify-between items-center">
                                <div className="flex items-center gap-3 sm:gap-4 min-w-0">
                                    <div className="w-10 h-10 sm:w-14 sm:h-14 bg-soft rounded-lg sm:rounded-2xl flex items-center justify-center flex-shrink-0">
                                        <Users size={18} className="text-primary sm:w-6 sm:h-6" />
                                    </div>
                                    <div className="min-w-0">
                                        <h3 className="text-sm sm:text-xl font-black text-muted-text truncate">{group.name}</h3>
                                        <p className="text-[9px] sm:text-xs font-bold text-gray-400 mt-0.5 font-mono truncate">{group.group_jid}</p>
                                    </div>
                                </div>
                                <div className="flex items-center gap-2 sm:gap-3 flex-shrink-0">
                                    <button onClick={() => toggleGroupStatus(group.id, group.active)}
                                        className={`px-3 sm:px-4 py-1.5 sm:py-2 rounded-full text-[8px] sm:text-[10px] font-black uppercase tracking-widest transition-all ${group.active ? "bg-green-100 text-green-600 hover:bg-green-200" : "bg-red-100 text-red-600 hover:bg-red-200"}`}>
                                        {group.active ? "Ativo" : "Inativo"}
                                    </button>
                                    <button onClick={() => handleDeleteGroup(group.id)}
                                        className="w-8 h-8 sm:w-10 sm:h-10 rounded-lg sm:rounded-xl flex items-center justify-center text-red-300 hover:bg-red-50 hover:text-red-500 transition-all">
                                        <Trash2 size={14} className="sm:w-4 sm:h-4" />
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
                <div className="bg-white p-6 sm:p-10 rounded-2xl sm:rounded-[3rem] shadow-premium border border-white flex flex-col items-center justify-center min-h-[400px] sm:min-h-[500px] text-center space-y-6 sm:space-y-8">
                    {loading ? (
                        <div className="w-10 h-10 sm:w-12 sm:h-12 border-4 border-primary border-t-transparent rounded-full animate-spin" />
                    ) : (connectionStatus?.instance?.state === "open" || connectionStatus?.instance?.connectionStatus === "connected") ? (
                        <>
                            <div className="w-24 h-24 sm:w-32 sm:h-32 bg-green-100 rounded-full flex items-center justify-center text-green-600">
                                <Smartphone size={48} className="sm:w-16 sm:h-16" />
                            </div>
                            <div className="space-y-2">
                                <h2 className="text-2xl sm:text-3xl font-black text-muted-text">WhatsApp Conectado!</h2>
                                <p className="text-gray-400 font-bold max-w-md text-xs sm:text-base">
                                    Instância <span className="text-primary">{connectionStatus?.instance?.instanceName}</span> está ativa e pronta para uso.
                                </p>
                            </div>
                            <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 w-full sm:w-auto">
                                <Button variant="outline" onClick={checkConnection} className="rounded-xl sm:rounded-full h-12 px-8 text-xs sm:text-sm font-black w-full sm:w-auto">Atualizar Status</Button>
                                <Button onClick={handleLogout} className="rounded-xl sm:rounded-full h-12 px-8 bg-red-100 text-red-600 hover:bg-red-200 shadow-none border-none text-xs sm:text-sm font-black w-full sm:w-auto">
                                    <LogOut size={16} className="mr-2" /> Desconectar
                                </Button>
                            </div>
                            <div className="w-full max-w-md pt-6 sm:pt-8 border-t border-gray-100">
                                <div className="bg-soft p-5 sm:p-6 rounded-xl sm:rounded-[2rem] text-left space-y-4">
                                    <div className="flex items-center gap-2 mb-2">
                                        <SettingsIcon size={18} className="text-primary sm:w-5 sm:h-5" />
                                        <h3 className="font-black text-muted-text uppercase text-[10px] tracking-widest leading-none">Configurações Avançadas</h3>
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-[9px] font-black text-gray-400 uppercase tracking-widest">URL do Webhook</label>
                                        <div className="flex flex-col sm:flex-row gap-2">
                                            <input type="text" id="webhook-url" className="flex-1 p-3 bg-white rounded-lg sm:rounded-xl border-none font-bold text-xs"
                                                placeholder="https://seu-site.com/api/whatsapp/webhook"
                                                value={webhookUrl} onChange={e => setWebhookUrl(e.target.value)} />
                                            <Button size="sm" className="rounded-lg sm:rounded-xl px-4 font-black text-[9px] h-10 sm:h-auto"
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
                            <div className="space-y-2">
                                <h2 className="text-2xl sm:text-3xl font-black text-muted-text">Conectar WhatsApp</h2>
                                <p className="text-gray-400 font-bold max-w-md text-xs sm:text-base px-4">
                                    Abra o WhatsApp, vá em <span className="text-muted-text">Aparelhos Conectados</span> e escaneie o código abaixo.
                                </p>
                            </div>
                            {qrCode ? (
                                <div className="p-3 sm:p-4 bg-white rounded-2xl sm:rounded-3xl shadow-lg border-2 sm:border-4 border-soft">
                                    {/* eslint-disable-next-line @next/next/no-img-element */}
                                    <img src={qrCode} alt="QR Code" className="w-48 h-48 sm:w-64 sm:h-64 object-contain" />
                                </div>
                            ) : (
                                <div className="w-48 h-48 sm:w-64 sm:h-64 bg-soft rounded-2xl sm:rounded-3xl flex items-center justify-center">
                                    {connecting ? (
                                        <div className="text-center">
                                            <Loader2 size={24} className="mx-auto text-primary animate-spin mb-2 sm:w-8 sm:h-8" />
                                            <span className="text-[8px] sm:text-[10px] font-black text-gray-400 uppercase tracking-widest">Gerando...</span>
                                        </div>
                                    ) : (
                                        <Button onClick={connect} variant="outline" className="rounded-full font-black text-xs h-12 shadow-premium bg-white border-white">Gerar QR Code</Button>
                                    )}
                                </div>
                            )}
                            <Button variant="ghost" onClick={checkConnection} className="text-[10px] font-black text-gray-400 uppercase tracking-widest hover:bg-transparent">
                                Atualizar Status
                            </Button>
                        </>
                    )}
                </div>
            )}

            {/* ── MODAL CRIAR CAMPANHA ── */}
            {showModal && (
                <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4"
                    style={{ background: "rgba(0,0,0,0.45)", backdropFilter: "blur(6px)" }}>
                    <div className="bg-white rounded-t-3xl sm:rounded-[3rem] shadow-2xl w-full max-w-2xl max-h-[95vh] sm:max-h-[92vh] overflow-y-auto">
                        {/* Modal Header */}
                        <div className="flex justify-between items-center p-5 sm:p-10 pb-4 sm:pb-6 sticky top-0 bg-white rounded-t-3xl sm:rounded-t-[3rem] z-10 border-b border-soft">
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

                        <div className="p-5 sm:p-10 space-y-6 sm:space-y-8">
                            {/* Nome */}
                            <div className="space-y-1.5 sm:space-y-2">
                                <label className="text-[9px] sm:text-[10px] font-black text-gray-400 uppercase tracking-widest">Nome da Campanha</label>
                                <input type="text" placeholder="Ex: Liquidação Inverno 2026"
                                    className="w-full p-3.5 sm:p-4 bg-soft rounded-xl sm:rounded-2xl border-2 border-transparent focus:border-primary/30 font-bold outline-none transition-all text-sm"
                                    value={form.name}
                                    onChange={e => setForm({ ...form, name: e.target.value })} />
                            </div>

                            {/* Data e hora */}
                            <div className="space-y-1.5 sm:space-y-2">
                                <label className="text-[9px] sm:text-[10px] font-black text-gray-400 uppercase tracking-widest flex flex-col sm:flex-row sm:items-center justify-between gap-1">
                                    <div className="flex items-center gap-1.5"><Calendar size={12} /> Data e Hora do Disparo</div>
                                    {serverTime && (
                                        <span className="text-primary normal-case text-[8px] sm:text-xs">
                                            Servidor: {serverTime}
                                        </span>
                                    )}
                                </label>
                                <input type="datetime-local"
                                    className="w-full p-3.5 sm:p-4 bg-soft rounded-xl sm:rounded-2xl border-2 border-transparent focus:border-primary/30 font-bold outline-none transition-all text-sm"
                                    value={form.scheduled_at}
                                    onChange={e => setForm({ ...form, scheduled_at: e.target.value })} />
                            </div>

                            <hr className="border-soft" />

                            {/* Mensagem Inicial */}
                            <div className="space-y-3 sm:space-y-4">
                                <div className="flex justify-between items-center group/tools">
                                    <div className="flex items-center gap-2">
                                        <div className="w-5 h-5 sm:w-6 sm:h-6 rounded-full bg-primary text-white flex items-center justify-center text-[10px] sm:text-xs font-black">1</div>
                                        <label className="text-[9px] sm:text-[10px] font-black text-gray-400 uppercase tracking-widest">Mensagem Inicial</label>
                                    </div>
                                    <div className="flex items-center gap-0.5 sm:gap-1 opacity-100 sm:opacity-0 sm:group-hover/tools:opacity-100 transition-opacity bg-soft p-1 rounded-lg sm:rounded-xl scale-90 sm:scale-100 origin-right">
                                        <button type="button" onClick={() => insertText('initial_message', '*')} className="w-6 h-6 sm:w-7 sm:h-7 flex items-center justify-center text-[9px] sm:text-[10px] font-black hover:bg-white rounded-md sm:rounded-lg transition-colors" title="Negrito">B</button>
                                        <button type="button" onClick={() => insertText('initial_message', '_')} className="w-6 h-6 sm:w-7 sm:h-7 flex items-center justify-center text-[9px] sm:text-[10px] italic font-serif hover:bg-white rounded-md sm:rounded-lg transition-colors" title="Itálico">I</button>
                                        <div className="w-px h-3 sm:h-4 bg-gray-200 mx-0.5 sm:mx-1" />
                                        <button type="button" onClick={() => insertEmoji('initial_message', '🛍️')} className="w-6 h-6 sm:w-7 sm:h-7 flex items-center justify-center text-xs hover:bg-white rounded-md sm:rounded-lg transition-colors">🛍️</button>
                                        <button type="button" onClick={() => insertEmoji('initial_message', '✨')} className="w-6 h-6 sm:w-7 sm:h-7 flex items-center justify-center text-xs hover:bg-white rounded-md sm:rounded-lg transition-colors">✨</button>
                                        <button type="button" onClick={() => insertEmoji('initial_message', '🎉')} className="w-6 h-6 sm:w-7 sm:h-7 flex items-center justify-center text-xs hover:bg-white rounded-md sm:rounded-lg transition-colors">🎉</button>
                                    </div>
                                </div>
                                <textarea placeholder="Olá! Bem-vindo(a) ao nosso catálogo especial! 🎉"
                                    className="w-full p-4 bg-soft rounded-xl sm:rounded-2xl border-2 border-transparent focus:border-primary/30 font-medium h-24 outline-none resize-none transition-all text-xs sm:text-sm whitespace-pre-wrap"
                                    value={form.initial_message}
                                    onChange={e => setForm({ ...form, initial_message: e.target.value })} />
                                <div className="flex items-center gap-2 sm:gap-3 flex-wrap">
                                    <Clock size={14} className="text-gray-400 flex-shrink-0" />
                                    <label className="text-[10px] sm:text-xs font-black text-gray-400">Aguardar</label>
                                    <input type="number" min={5} max={300}
                                        className="w-16 sm:w-24 p-2 bg-soft rounded-lg sm:rounded-xl border-none font-black text-center text-xs sm:text-sm outline-none"
                                        value={form.initial_message_interval}
                                        onChange={e => setForm({ ...form, initial_message_interval: parseInt(e.target.value) })} />
                                    <label className="text-[10px] sm:text-xs font-black text-gray-400">s antes de continuar</label>
                                </div>
                            </div>

                            <hr className="border-soft" />

                            {/* Mensagem de Regras */}
                            <div className="space-y-4">
                                <div className="flex justify-between items-center group/tools">
                                    <div className="flex items-center gap-2">
                                        <div className="w-6 h-6 rounded-full bg-primary text-white flex items-center justify-center text-xs font-black">2</div>
                                        <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Mensagem de Regras</label>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <select
                                            className="p-1.5 bg-soft rounded-lg text-[9px] font-black uppercase tracking-widest border border-gray-100 outline-none focus:ring-2 focus:ring-primary/20"
                                            onChange={(e) => {
                                                const template = ruleTemplates.find(t => t.id === e.target.value);
                                                if (template) setForm({ ...form, rules_message: template.content });
                                            }}
                                            value=""
                                        >
                                            <option value="">Aplicar Template</option>
                                            {ruleTemplates.map(t => (
                                                <option key={t.id} value={t.id}>{t.title}</option>
                                            ))}
                                        </select>
                                        <div className="flex items-center gap-1 opacity-0 group-hover/tools:opacity-100 transition-opacity bg-soft p-1 rounded-xl">
                                            <button type="button" onClick={() => insertText('rules_message', '*')} className="w-7 h-7 flex items-center justify-center text-[10px] font-black hover:bg-white rounded-lg transition-colors" title="Negrito">B</button>
                                            <button type="button" onClick={() => insertText('rules_message', '_')} className="w-7 h-7 flex items-center justify-center text-[10px] italic font-serif hover:bg-white rounded-lg transition-colors" title="Itálico">I</button>
                                            <div className="w-px h-4 bg-gray-200 mx-1" />
                                            <button type="button" onClick={() => insertEmoji('rules_message', '📋')} className="w-7 h-7 flex items-center justify-center text-xs hover:bg-white rounded-lg transition-colors">📋</button>
                                            <button type="button" onClick={() => insertEmoji('rules_message', '📦')} className="w-7 h-7 flex items-center justify-center text-xs hover:bg-white rounded-lg transition-colors">📦</button>
                                            <button type="button" onClick={() => insertEmoji('rules_message', '✅')} className="w-7 h-7 flex items-center justify-center text-xs hover:bg-white rounded-lg transition-colors">✅</button>
                                        </div>
                                    </div>
                                </div>
                                <textarea placeholder="📋 Nossas regras: Para comprar, envie o código do produto..."
                                    className="w-full p-4 bg-soft rounded-2xl border-2 border-transparent focus:border-primary/30 font-medium h-24 outline-none resize-none transition-all text-sm whitespace-pre-wrap"
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
                            <div className="space-y-3 sm:space-y-4">
                                <div className="flex items-center gap-2">
                                    <div className="w-5 h-5 sm:w-6 sm:h-6 rounded-full bg-primary text-white flex items-center justify-center text-[10px] sm:text-xs font-black">3</div>
                                    <label className="text-[9px] sm:text-[10px] font-black text-gray-400 uppercase tracking-widest">Categoria de Produtos</label>
                                </div>
                                <select className="w-full p-3 sm:p-4 bg-soft rounded-xl sm:rounded-2xl border-2 border-transparent focus:border-primary/30 font-bold outline-none transition-all text-xs sm:text-sm"
                                    value={form.category_id}
                                    onChange={e => setForm({ ...form, category_id: e.target.value })}>
                                    <option value="">Selecione uma categoria</option>
                                    {categories.map(cat => {
                                        const count = cat.products?.[0]?.count || 0;
                                        return (
                                            <option key={cat.id} value={cat.id}>
                                                {cat.name} {count > 0 ? `(${count})` : '(Sem estoque)'}
                                            </option>
                                        )
                                    })}
                                </select>
                                <div className="flex items-center gap-2 sm:gap-3 flex-wrap">
                                    <Clock size={14} className="text-gray-400 flex-shrink-0" />
                                    <label className="text-[10px] sm:text-xs font-black text-gray-400">Intervalo entre produtos</label>
                                    <input type="number" min={10} max={300}
                                        className="w-16 sm:w-24 p-2 bg-soft rounded-lg sm:rounded-xl border-none font-black text-center text-xs sm:text-sm outline-none"
                                        value={form.category_interval}
                                        onChange={e => setForm({ ...form, category_interval: parseInt(e.target.value) })} />
                                    <label className="text-[10px] sm:text-xs font-black text-gray-400">segundos</label>
                                </div>
                            </div>

                            <hr className="border-soft" />

                            {/* Mensagem Final */}
                            <div className="space-y-4">
                                <div className="flex justify-between items-center group/tools">
                                    <div className="flex items-center gap-2">
                                        <div className="w-6 h-6 rounded-full bg-soft text-gray-400 flex items-center justify-center text-[10px] font-black">4</div>
                                        <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Mensagem Final</label>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <select
                                            className="p-1.5 bg-soft rounded-lg text-[9px] font-black uppercase tracking-widest border border-gray-100 outline-none focus:ring-2 focus:ring-primary/20"
                                            onChange={(e) => {
                                                const template = finalMessageTemplates.find(t => t.id === e.target.value);
                                                if (template) setForm({ ...form, final_message: template.content });
                                            }}
                                            value=""
                                        >
                                            <option value="">Aplicar Template</option>
                                            {finalMessageTemplates.map(t => (
                                                <option key={t.id} value={t.id}>{t.title}</option>
                                            ))}
                                        </select>
                                        <div className="flex items-center gap-1 opacity-0 group-hover/tools:opacity-100 transition-opacity bg-soft p-1 rounded-xl">
                                            <button type="button" onClick={() => insertText('final_message', '*')} className="w-7 h-7 flex items-center justify-center text-[10px] font-black hover:bg-white rounded-lg transition-colors" title="Negrito">B</button>
                                            <button type="button" onClick={() => insertText('final_message', '_')} className="w-7 h-7 flex items-center justify-center text-[10px] italic font-serif hover:bg-white rounded-lg transition-colors" title="Itálico">I</button>
                                            <div className="w-px h-4 bg-gray-200 mx-1" />
                                            <button type="button" onClick={() => insertEmoji('final_message', '🛒')} className="w-7 h-7 flex items-center justify-center text-xs hover:bg-white rounded-lg transition-colors">🛒</button>
                                            <button type="button" onClick={() => insertEmoji('final_message', '👋')} className="w-7 h-7 flex items-center justify-center text-xs hover:bg-white rounded-lg transition-colors">👋</button>
                                            <button type="button" onClick={() => insertEmoji('final_message', '💙')} className="w-7 h-7 flex items-center justify-center text-xs hover:bg-white rounded-lg transition-colors">💙</button>
                                        </div>
                                    </div>
                                </div>
                                <textarea placeholder="É isso! Esses são todos os produtos disponíveis. Para comprar, responda com o código! 🛒"
                                    className="w-full p-4 bg-soft/40 rounded-2xl border border-soft hover:border-primary/10 focus:border-primary/30 font-medium h-24 outline-none resize-none transition-all text-sm whitespace-pre-wrap"
                                    value={form.final_message}
                                    onChange={e => setForm({ ...form, final_message: e.target.value })} />
                            </div>

                            <hr className="border-soft" />

                            {/* Grupos */}
                            <div className="space-y-3 sm:space-y-4">
                                <label className="text-[9px] sm:text-[10px] font-black text-gray-400 uppercase tracking-widest">Grupos de Destino</label>
                                {groups.filter(g => g.active).length === 0 ? (
                                    <div className="p-4 sm:p-6 bg-soft rounded-xl sm:rounded-2xl text-center text-[10px] sm:text-sm font-bold text-gray-400">
                                        Nenhum grupo ativo.
                                    </div>
                                ) : (
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 sm:gap-3">
                                        {groups.filter(g => g.active).map(group => (
                                            <button key={group.id} type="button"
                                                onClick={() => toggleGroupInForm(group.id)}
                                                className={`p-3 sm:p-4 rounded-xl sm:rounded-2xl border-2 transition-all text-left ${form.group_ids.includes(group.id)
                                                    ? "border-primary bg-primary/5"
                                                    : "border-soft hover:border-primary/20 bg-soft"}`}>
                                                <div className="flex items-center gap-2">
                                                    <div className={`w-3.5 h-3.5 sm:w-4 sm:h-4 rounded-full border-2 flex items-center justify-center flex-shrink-0 transition-all ${form.group_ids.includes(group.id) ? "border-primary bg-primary" : "border-gray-300"}`}>
                                                        {form.group_ids.includes(group.id) && <CheckCircle2 size={10} className="text-white" />}
                                                    </div>
                                                    <span className="font-black text-xs sm:text-sm text-muted-text truncate">{group.name}</span>
                                                </div>
                                            </button>
                                        ))}
                                    </div>
                                )}
                            </div>

                            {/* Actions */}
                            <div className="flex flex-col sm:flex-row gap-2 sm:gap-4 pt-4 sm:pt-2">
                                <Button variant="outline" className="h-14 rounded-xl sm:rounded-full font-black order-2 sm:order-1"
                                    onClick={() => setShowModal(false)} disabled={saving}>
                                    Cancelar
                                </Button>
                                <Button className="flex-1 h-14 rounded-xl sm:rounded-full shadow-vibrant font-black gap-2 order-1 sm:order-2"
                                    onClick={handleCreateCampaign} disabled={saving}>
                                    {saving ? <Loader2 size={18} className="animate-spin" /> : <Calendar size={18} />}
                                    {saving ? "Agendando..." : "Agendar Campanha"}
                                </Button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* ── MODAL DE CONFIRMAÇÃO CUSTOMIZADO ── */}
            {confirmDialog.isOpen && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-in fade-in">
                    <div className="bg-white rounded-3xl shadow-2xl w-full max-w-sm overflow-hidden animate-in zoom-in-95 duration-200">
                        <div className="p-6">
                            <h3 className="text-xl font-black text-muted-text mb-2">{confirmDialog.title}</h3>
                            <p className="text-sm font-bold text-gray-400 mb-6">{confirmDialog.description}</p>

                            <div className="flex gap-3">
                                <Button
                                    variant="outline"
                                    className="flex-1 rounded-xl h-12 font-black border-gray-200 text-gray-500 hover:bg-gray-50 hover:text-gray-700"
                                    onClick={() => setConfirmDialog({ ...confirmDialog, isOpen: false })}
                                >
                                    Cancelar
                                </Button>
                                <Button
                                    className={`flex-1 rounded-xl h-12 font-black ${confirmDialog.action === 'delete' ? 'bg-red-500 hover:bg-red-600' : 'bg-amber-500 hover:bg-amber-600'} text-white border-none`}
                                    onClick={executeConfirmDialogAction}
                                >
                                    Confirmar
                                </Button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
