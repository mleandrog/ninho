"use client";

import { useState, useEffect } from "react";
import { AdminSidebar } from "@/components/admin/AdminSidebar";
import { supabase } from "@/lib/supabase";
import { Button } from "@/components/ui/Button";
import { Send, Settings as SettingsIcon, Users, Plus, Play, Trash2, QrCode, LogOut, Loader2, Smartphone, ExternalLink } from "lucide-react";
import { toast } from "react-hot-toast";
import { evolutionService } from "@/services/evolution";
import { useRouter } from "next/navigation";

export default function AdminWhatsAppDashboard() {
    const router = useRouter();
    const [activeTab, setActiveTab] = useState<"campaigns" | "groups" | "connection">("campaigns");
    const [categories, setCategories] = useState<any[]>([]);
    const [groups, setGroups] = useState<any[]>([]);
    const [settings, setSettings] = useState<any>(null);
    const [campaigns, setCampaigns] = useState<any[]>([]);

    // Connection states
    const [connectionStatus, setConnectionStatus] = useState<any>(null);
    const [qrCode, setQrCode] = useState<string | null>(null);
    const [connecting, setConnecting] = useState(false);
    const [isStopping, setIsStopping] = useState<number | null>(null);

    // Form states - Campanhas
    const [campaignName, setCampaignName] = useState("");
    const [selectedCategory, setSelectedCategory] = useState("");
    const [selectedGroups, setSelectedGroups] = useState<string[]>([]);
    const [interval, setInterval] = useState(30);
    const [showSettings, setShowSettings] = useState(false);
    const [loading, setLoading] = useState(false);

    // Form states - Grupos
    const [newGroup, setNewGroup] = useState({ name: "", group_jid: "" });
    const [availableWhatsAppGroups, setAvailableWhatsAppGroups] = useState<any[]>([]);
    const [fetchingGroups, setFetchingGroups] = useState(false);
    const [showGroupSelector, setShowGroupSelector] = useState(false);

    useEffect(() => {
        fetchInitialData();
    }, []);

    const handleStopCampaign = async (id: number) => {
        if (!confirm('Deseja realmente interromper esta campanha? Os disparos restantes não serão enviados.')) return;

        setIsStopping(id);
        try {
            const response = await fetch('/api/whatsapp/campaign/stop', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ campaignId: id })
            });

            if (response.ok) {
                toast.success('Campanha interrompida com sucesso!');
                fetchInitialData();
            } else {
                toast.error('Erro ao interromper campanha.');
            }
        } catch (error) {
            console.error('Error stopping campaign:', error);
            toast.error('Erro de conexão.');
        } finally {
            setIsStopping(null);
        }
    };

    const fetchInitialData = async () => {
        setLoading(true);
        try {
            const [categoriesRes, groupsRes, settingsRes, campaignsRes] = await Promise.all([
                supabase.from("categories").select("*"),
                supabase.from("whatsapp_groups").select("*").order("created_at", { ascending: false }),
                supabase.from("whatsapp_settings").select("*").limit(1).single(),
                supabase.from("whatsapp_campaigns").select("*, categories:category_id(name)").order("created_at", { ascending: false }).limit(5)
            ]);

            setCategories(categoriesRes.data || []);
            setGroups(groupsRes.data || []);
            setSettings(settingsRes.data);
            setCampaigns(campaignsRes.data || []);

            if (settingsRes.data) {
                setInterval(settingsRes.data.default_interval_seconds);
            }
        } catch (error) {
            console.error(error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        let intervalId: any;

        if (activeTab === "connection") {
            checkConnection();

            // Inicia monitoramento automático se não estiver conectado
            intervalId = window.setInterval(() => {
                const pollStatus = async () => {
                    try {
                        const data = await evolutionService.getConnectionStatus();
                        if (data?.instance?.state === 'open') {
                            setConnectionStatus(data);
                            setQrCode(null);
                            window.clearInterval(intervalId);
                            toast.success("WhatsApp conectado com sucesso!");
                        }
                    } catch (error) {
                        console.error('Erro no polling de conexão:', error);
                    }
                };
                pollStatus();
            }, 5000); // Verifica a cada 5 segundos
        }

        return () => {
            if (intervalId) window.clearInterval(intervalId);
        };
    }, [activeTab]);

    const checkConnection = async () => {
        setLoading(true);
        try {
            const data = await evolutionService.getConnectionStatus();
            setConnectionStatus(data);

            if (data?.instance?.state !== 'open') {
                connect();
            } else {
                setQrCode(null);
            }
        } catch (error) {
            console.error('Erro ao verificar conexão:', error);
        } finally {
            setLoading(false);
        }
    };

    const connect = async () => {
        if (connecting) return;
        setConnecting(true);
        const toastId = toast.loading("Gerando QR Code...");
        try {
            const data = await evolutionService.connectInstance();
            console.log("Dados recebidos da Evolution:", data);

            if (data?.base64) {
                setQrCode(data.base64);
                toast.success("QR Code gerado!", { id: toastId });
            } else if (data?.code) {
                toast.success("Código de pareamento gerado!", { id: toastId });
            } else if (data?.instance?.state === 'open') {
                toast.success("Já conectado!", { id: toastId });
                setConnectionStatus(data);
                setQrCode(null);
            } else {
                toast.error("Resposta inesperada. Tente novamente.", { id: toastId });
            }
        } catch (error) {
            console.error("Erro ao conectar:", error);
            toast.error("Erro ao gerar QR Code", { id: "connect-toast" });
        } finally {
            setConnecting(false);
        }
    };

    const handleLogout = async () => {
        if (!confirm("Tem certeza que deseja desconectar?")) return;

        setLoading(true);
        try {
            await evolutionService.logoutInstance();
            toast.success("Desconectado com sucesso!");
            setQrCode(null);
            setConnectionStatus(null);
            checkConnection(); // Recarrega para gerar novo QR
        } catch (error) {
            toast.error("Erro ao desconectar");
        } finally {
            setLoading(false);
        }
    };

    const handleCreateCampaign = async () => {
        if (!selectedCategory || selectedGroups.length === 0) {
            return toast.error("Selecione uma categoria e pelo menos um grupo.");
        }

        try {
            const { count } = await supabase
                .from("products")
                .select("*", { count: "exact", head: true })
                .eq("category_id", selectedCategory);

            const { data: campaign, error } = await supabase
                .from("whatsapp_campaigns")
                .insert({
                    name: campaignName || categories.find(c => c.id === selectedCategory)?.name || "Nova Campanha",
                    category_id: selectedCategory,
                    group_ids: selectedGroups,
                    interval_seconds: interval,
                    total_products: count || 0,
                    status: "pending"
                })
                .select()
                .single();

            if (error) throw error;

            toast.success("Campanha criada! Iniciando disparos...");
            await startCampaign(campaign.id);
            fetchInitialData();

            // Redirecionar para detalhes da campanha
            router.push(`/admin/whatsapp/campanhas/${campaign.id}`);
        } catch (error: any) {
            toast.error("Erro ao criar campanha: " + error.message);
        }
    };

    const startCampaign = async (campaignId: string) => {
        try {
            const response = await fetch("/api/whatsapp/campaign/start", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ campaignId })
            });

            if (!response.ok) throw new Error("Erro ao iniciar campanha");
            toast.success("Disparos iniciados com sucesso!");
        } catch (error: any) {
            toast.error(error.message);
        }
    };

    const toggleGroupSelection = (groupId: string) => {
        setSelectedGroups(prev =>
            prev.includes(groupId)
                ? prev.filter(id => id !== groupId)
                : [...prev, groupId]
        );
    };

    const updateSettings = async () => {
        try {
            const { error } = await supabase
                .from("whatsapp_settings")
                .update({
                    keyword: settings.keyword,
                    rules_message: settings.rules_message,
                    final_message: settings.final_message,
                    default_interval_seconds: settings.default_interval_seconds
                })
                .eq("id", settings.id);

            if (error) throw error;
            toast.success("Configurações atualizadas!");
            setShowSettings(false);
        } catch (error) {
            toast.error("Erro ao atualizar configurações.");
        }
    };

    // Funções de Grupos
    const handleAddGroup = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!newGroup.name || !newGroup.group_jid) {
            return toast.error("Preencha todos os campos.");
        }

        try {
            const { error } = await supabase
                .from("whatsapp_groups")
                .insert([newGroup]);

            if (error) throw error;

            toast.success("Grupo cadastrado com sucesso!");
            setNewGroup({ name: "", group_jid: "" });
            fetchInitialData();
        } catch (error: any) {
            toast.error("Erro ao cadastrar grupo: " + error.message);
        }
    };

    const handleDeleteGroup = async (id: string) => {
        if (!confirm("Deseja realmente excluir este grupo?")) return;

        try {
            const { error } = await supabase
                .from("whatsapp_groups")
                .delete()
                .eq("id", id);

            if (error) throw error;
            toast.success("Grupo excluído!");
            fetchInitialData();
        } catch (error) {
            toast.error("Erro ao excluir grupo.");
        }
    };

    const toggleGroupStatus = async (id: string, currentStatus: boolean) => {
        try {
            const { error } = await supabase
                .from("whatsapp_groups")
                .update({ active: !currentStatus })
                .eq("id", id);

            if (error) throw error;
            toast.success("Status atualizado!");
            fetchInitialData();
        } catch (error) {
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
                const message = data?.details || data?.error || "Erro desconhecido";
                toast.error(`Erro: ${message}`);
            }
        } catch (error) {
            toast.error("Erro ao carregar grupos. Verifique se o WhatsApp está conectado.");
        } finally {
            setFetchingGroups(false);
        }
    };

    const handleSelectGroup = (group: any) => {
        setNewGroup({
            name: group.subject,
            group_jid: group.id
        });
        setShowGroupSelector(false);
    };

    return (
        <div className="min-h-screen bg-soft flex">
            <AdminSidebar />

            <main className="flex-1 p-12 overflow-y-auto">
                <header className="flex justify-between items-center mb-12">
                    <div>
                        <h1 className="text-4xl font-black text-muted-text lowercase tracking-tighter">
                            WhatsApp <span className="text-[10px] bg-primary/10 text-primary px-2 py-0.5 rounded-full ml-2 align-middle">v1.2.1-DEBUG</span>
                        </h1>
                        <p className="text-gray-400 font-bold mt-1">Gestão de campanhas, grupos e disparos automáticos</p>
                    </div>
                    <Button
                        variant="outline"
                        className="gap-2 bg-white rounded-2xl h-14"
                        onClick={() => setShowSettings(!showSettings)}
                    >
                        <SettingsIcon size={18} /> Configurações
                    </Button>
                </header>

                {/* Tabs */}
                <div className="flex gap-4 mb-8">
                    <button
                        onClick={() => setActiveTab("campaigns")}
                        className={`px-8 py-4 rounded-2xl font-black text-sm transition-all ${activeTab === "campaigns"
                            ? "bg-primary text-white shadow-vibrant"
                            : "bg-white text-gray-400 hover:text-muted-text"
                            }`}
                    >
                        <Send size={18} className="inline mr-2" />
                        Campanhas
                    </button>
                    <button
                        onClick={() => setActiveTab("groups")}
                        className={`px-8 py-4 rounded-2xl font-black text-sm transition-all ${activeTab === "groups"
                            ? "bg-primary text-white shadow-vibrant"
                            : "bg-white text-gray-400 hover:text-muted-text"
                            }`}
                    >
                        <Users size={18} className="inline mr-2" />
                        Grupos ({groups.length})
                    </button>
                    <button
                        onClick={() => setActiveTab("connection")}
                        className={`px-8 py-4 rounded-2xl font-black text-sm transition-all ${activeTab === "connection"
                            ? "bg-primary text-white shadow-vibrant"
                            : "bg-white text-gray-400 hover:text-muted-text"
                            }`}
                    >
                        <QrCode size={18} className="inline mr-2" />
                        Conexão
                    </button>
                </div>

                {showSettings && settings && (
                    <div className="bg-white p-10 rounded-[3rem] shadow-premium border border-white mb-12 space-y-6">
                        <h2 className="text-2xl font-black text-muted-text">Configurações Globais</h2>

                        <div className="grid md:grid-cols-2 gap-6">
                            <div className="space-y-2">
                                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Palavra-chave</label>
                                <input
                                    type="text"
                                    className="w-full p-4 bg-soft rounded-2xl border-none font-bold"
                                    value={settings.keyword}
                                    onChange={e => setSettings({ ...settings, keyword: e.target.value.toUpperCase() })}
                                />
                            </div>
                            <div className="space-y-2">
                                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Intervalo Padrão (segundos)</label>
                                <input
                                    type="number"
                                    className="w-full p-4 bg-soft rounded-2xl border-none font-bold"
                                    value={settings.default_interval_seconds}
                                    onChange={e => setSettings({ ...settings, default_interval_seconds: parseInt(e.target.value) })}
                                />
                            </div>
                        </div>

                        <div className="space-y-2">
                            <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Mensagem de Regras (Início)</label>
                            <textarea
                                className="w-full p-4 bg-soft rounded-2xl border-none font-bold h-32"
                                value={settings.rules_message}
                                onChange={e => setSettings({ ...settings, rules_message: e.target.value })}
                            />
                        </div>

                        <div className="space-y-2">
                            <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Mensagem de Finalização (Encerramento)</label>
                            <textarea
                                className="w-full p-4 bg-soft rounded-2xl border-none font-bold h-32"
                                value={settings.final_message}
                                onChange={e => setSettings({ ...settings, final_message: e.target.value })}
                                placeholder="Use {categoryName} para incluir o nome da categoria automaticamente."
                            />
                        </div>

                        <Button onClick={updateSettings} className="w-full h-14 rounded-full shadow-vibrant">
                            Salvar Configurações
                        </Button>
                    </div>
                )}

                {/* Conteúdo das Abas */}
                {activeTab === "campaigns" && (
                    <div className="grid lg:grid-cols-3 gap-8">
                        {/* Nova Campanha */}
                        <div className="lg:col-span-2 bg-white p-10 rounded-[3rem] shadow-premium border border-white space-y-8">
                            <h2 className="text-2xl font-black text-muted-text flex items-center gap-3">
                                <Send size={24} className="text-primary" /> Nova Campanha
                            </h2>

                            <div className="space-y-6">
                                <div className="space-y-2">
                                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Nome da Campanha</label>
                                    <input
                                        type="text"
                                        required
                                        placeholder="Ex: Liquidação Infantil"
                                        className="w-full p-4 bg-soft rounded-2xl border-2 border-transparent focus:border-primary/20 font-bold"
                                        value={campaignName}
                                        onChange={e => setCampaignName(e.target.value)}
                                    />
                                </div>

                                <div className="space-y-2">
                                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Categoria de Produtos</label>
                                    <select
                                        className="w-full p-4 bg-soft rounded-2xl border-none font-bold"
                                        value={selectedCategory}
                                        onChange={e => setSelectedCategory(e.target.value)}
                                    >
                                        <option value="">Selecione uma categoria</option>
                                        {categories.map(cat => (
                                            <option key={cat.id} value={cat.id}>{cat.name}</option>
                                        ))}
                                    </select>
                                </div>

                                <div className="space-y-2">
                                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Grupos de Destino</label>
                                    <div className="grid grid-cols-2 gap-3">
                                        {groups.filter(g => g.active).map(group => (
                                            <button
                                                key={group.id}
                                                onClick={() => toggleGroupSelection(group.id)}
                                                className={`p-4 rounded-2xl border-2 transition-all text-left ${selectedGroups.includes(group.id)
                                                    ? "border-primary bg-primary/5"
                                                    : "border-soft hover:border-primary/20"
                                                    }`}
                                            >
                                                <div className="flex items-center gap-2">
                                                    <Users size={16} className={selectedGroups.includes(group.id) ? "text-primary" : "text-gray-400"} />
                                                    <span className="font-black text-sm">{group.name}</span>
                                                </div>
                                            </button>
                                        ))}
                                    </div>
                                </div>

                                <div className="space-y-2">
                                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Intervalo entre Disparos (segundos)</label>
                                    <input
                                        type="number"
                                        className="w-full p-4 bg-soft rounded-2xl border-none font-bold"
                                        value={interval}
                                        onChange={e => setInterval(parseInt(e.target.value))}
                                        min="10"
                                        max="300"
                                    />
                                </div>
                            </div>

                            <Button
                                className="w-full h-16 rounded-full text-lg font-black gap-2 shadow-vibrant"
                                onClick={handleCreateCampaign}
                                disabled={!selectedCategory || selectedGroups.length === 0}
                            >
                                <Play size={20} /> Iniciar Campanha
                            </Button>
                        </div>

                        {/* Histórico */}
                        <div className="bg-white p-10 rounded-[3rem] shadow-premium border border-white space-y-8 h-fit">
                            <div className="flex justify-between items-center">
                                <h2 className="text-2xl font-black text-muted-text">Últimas Campanhas</h2>
                                <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={fetchInitialData}
                                    className="rounded-full text-[10px] font-black uppercase tracking-widest text-primary hover:bg-primary/5"
                                >
                                    Atualizar
                                </Button>
                            </div>

                            <div className="space-y-4 max-h-[600px] overflow-y-auto pr-2">
                                {campaigns.map(campaign => {
                                    const progress = campaign.total_products > 0 ? (campaign.products_sent / campaign.total_products) * 100 : 0;
                                    return (
                                        <button
                                            key={campaign.id}
                                            onClick={() => window.location.href = `/admin/whatsapp/campanhas/${campaign.id}`}
                                            className="w-full text-left p-8 bg-soft rounded-[2.5rem] border-2 border-transparent hover:border-primary/20 hover:bg-white hover:shadow-xl transition-all group relative overflow-hidden"
                                        >
                                            <div className="flex justify-between items-center mb-6">
                                                <div className="flex items-center gap-2">
                                                    <div className={`w-2 h-2 rounded-full ${campaign.status === 'running' ? 'bg-blue-500 animate-pulse' :
                                                        campaign.status === 'completed' ? 'bg-green-500' : 'bg-yellow-500'
                                                        }`} />
                                                    <span className={`text-[10px] font-black uppercase tracking-widest ${campaign.status === 'running' ? 'text-blue-600' :
                                                        campaign.status === 'completed' ? 'text-green-600' : 'text-yellow-600'
                                                        }`}>
                                                        {campaign.status === 'running' ? 'Disparando' :
                                                            campaign.status === 'completed' ? 'Sucesso' : 'Aguardando'}
                                                    </span>
                                                </div>
                                                <div className="flex items-center gap-3">
                                                    {campaign.status === 'running' && (
                                                        <Button
                                                            size="sm"
                                                            variant="destructive"
                                                            onClick={(e) => {
                                                                e.stopPropagation();
                                                                handleStopCampaign(campaign.id);
                                                            }}
                                                            disabled={isStopping === campaign.id}
                                                            className="h-7 px-3 rounded-full text-[9px] font-black uppercase tracking-tighter"
                                                        >
                                                            {isStopping === campaign.id ? 'Parando...' : 'Stop'}
                                                        </Button>
                                                    )}
                                                    <span className="text-[10px] font-bold text-gray-400">
                                                        {new Date(campaign.created_at).toLocaleDateString('pt-BR')}
                                                    </span>
                                                </div>
                                            </div>

                                            <h3 className="text-xl font-black text-muted-text mb-2 group-hover:text-primary transition-colors truncate">
                                                {campaign.name || campaign.categories?.name || 'Campanha Geral'}
                                            </h3>

                                            <div className="space-y-4">
                                                <div className="flex justify-between items-end">
                                                    <div>
                                                        <div className="text-3xl font-black text-muted-text">
                                                            {campaign.products_sent}<span className="text-sm text-gray-400 font-bold ml-1">/{campaign.total_products}</span>
                                                        </div>
                                                        <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest leading-none">Produtos</p>
                                                    </div>
                                                    <div className="text-right">
                                                        <div className="text-lg font-black text-primary">
                                                            {Math.round(progress)}%
                                                        </div>
                                                        <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest leading-none">Progresso</p>
                                                    </div>
                                                </div>

                                                <div className="h-2 w-full bg-white rounded-full overflow-hidden">
                                                    <div
                                                        className={`h-full transition-all duration-1000 ${campaign.status === 'running' ? 'bg-primary animate-shimmer' : 'bg-primary'
                                                            }`}
                                                        style={{ width: `${progress}%` }}
                                                    />
                                                </div>
                                            </div>
                                        </button>
                                    );
                                })}

                                {campaigns.length === 0 && (
                                    <div className="text-center py-12 text-gray-400 font-bold">
                                        Nenhuma campanha registrada ainda.
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                )}

                {
                    activeTab === "groups" && (
                        <div className="grid lg:grid-cols-3 gap-8">
                            {/* Form de Cadastro de Grupo */}
                            <div className="bg-white p-10 rounded-[3rem] shadow-premium border border-white space-y-8 h-fit">
                                <h2 className="text-2xl font-black text-muted-text flex items-center justify-between gap-3">
                                    <div className="flex items-center gap-3">
                                        <Plus size={24} className="text-primary" /> Novo Grupo
                                    </div>
                                    <Button
                                        type="button"
                                        variant="outline"
                                        size="sm"
                                        className="h-10 rounded-xl gap-2 font-bold px-4"
                                        onClick={handleFetchGroups}
                                        disabled={fetchingGroups}
                                    >
                                        {fetchingGroups ? <Loader2 size={16} className="animate-spin" /> : <Users size={16} />}
                                        <span className="hidden sm:inline">Buscar Grupos</span>
                                    </Button>
                                </h2>

                                {showGroupSelector && (
                                    <div className="bg-soft p-4 rounded-2xl max-h-60 overflow-y-auto space-y-2 border-2 border-primary/20 animate-in fade-in slide-in-from-top-2">
                                        <div className="flex justify-between items-center mb-2">
                                            <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Selecione um grupo da API</span>
                                            <button onClick={() => setShowGroupSelector(false)} className="text-xs font-bold text-primary hover:underline">cancelar</button>
                                        </div>
                                        {availableWhatsAppGroups.length === 0 ? (
                                            <div className="text-center py-4 text-xs font-bold text-gray-400">Nenhum grupo encontrado ou carregando...</div>
                                        ) : (
                                            availableWhatsAppGroups.map((group) => (
                                                <button
                                                    key={group.id}
                                                    type="button"
                                                    onClick={() => handleSelectGroup(group)}
                                                    className="w-full text-left p-3 bg-white rounded-xl hover:bg-primary/5 border border-transparent hover:border-primary/20 transition-all group"
                                                >
                                                    <div className="font-black text-sm text-muted-text group-hover:text-primary transition-colors">{group.subject}</div>
                                                    <div className="text-[10px] text-gray-400 font-mono truncate">{group.id}</div>
                                                </button>
                                            ))
                                        )}
                                    </div>
                                )}

                                <form onSubmit={handleAddGroup} className="space-y-6">
                                    <div className="space-y-2">
                                        <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Nome do Grupo</label>
                                        <input
                                            type="text"
                                            placeholder="Ex: Mamães VIP"
                                            className="w-full p-4 bg-soft rounded-2xl border-none font-bold text-sm"
                                            value={newGroup.name}
                                            onChange={e => setNewGroup({ ...newGroup, name: e.target.value })}
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">ID do Grupo (JID)</label>
                                        <input
                                            type="text"
                                            placeholder="123456789@g.us"
                                            className="w-full p-4 bg-soft rounded-2xl border-none font-bold text-sm"
                                            value={newGroup.group_jid}
                                            onChange={e => setNewGroup({ ...newGroup, group_jid: e.target.value })}
                                        />
                                        <p className="text-xs text-gray-400 font-bold italic">
                                            💡 Você pode obter o JID do grupo através da Evolution API
                                        </p>
                                    </div>
                                    <Button type="submit" className="w-full h-16 rounded-full shadow-vibrant font-black text-lg gap-2">
                                        <Plus size={20} /> Adicionar Grupo
                                    </Button>
                                </form>
                            </div>

                            {/* Lista de Grupos */}
                            <div className="lg:col-span-2 space-y-6">
                                {groups.map(group => (
                                    <div key={group.id} className="bg-white p-8 rounded-[2.5rem] shadow-premium border border-white">
                                        <div className="flex justify-between items-start">
                                            <div className="flex items-center gap-4">
                                                <div className="w-16 h-16 bg-soft rounded-2xl flex items-center justify-center text-3xl">
                                                    <Users size={28} className="text-primary" />
                                                </div>
                                                <div>
                                                    <h3 className="text-2xl font-black text-muted-text">{group.name}</h3>
                                                    <p className="text-sm font-bold text-gray-400 mt-1">{group.group_jid}</p>
                                                </div>
                                            </div>

                                            <div className="flex items-center gap-3">
                                                <button
                                                    onClick={() => toggleGroupStatus(group.id, group.active)}
                                                    className={`px-4 py-2 rounded-full text-[10px] font-black uppercase tracking-widest transition-all ${group.active
                                                        ? 'bg-green-100 text-green-600 hover:bg-green-200'
                                                        : 'bg-red-100 text-red-600 hover:bg-red-200'
                                                        }`}
                                                >
                                                    {group.active ? 'Ativo' : 'Inativo'}
                                                </button>
                                                <button
                                                    onClick={() => handleDeleteGroup(group.id)}
                                                    className="w-12 h-12 rounded-xl flex items-center justify-center text-red-400 hover:bg-red-50 transition-all"
                                                >
                                                    <Trash2 size={18} />
                                                </button>
                                            </div>
                                        </div>
                                    </div>
                                ))}

                                {groups.length === 0 && (
                                    <div className="bg-white/50 border-4 border-dashed border-soft rounded-[3rem] p-20 text-center">
                                        <div className="text-6xl mb-4">💬</div>
                                        <h3 className="text-2xl font-black text-muted-text opacity-50">Nenhum grupo cadastrado</h3>
                                        <p className="text-gray-400 font-bold mt-2 lowercase">adicione seu primeiro grupo para começar as campanhas</p>
                                    </div>
                                )}
                            </div>
                        </div>
                    )
                }

                {
                    activeTab === "connection" && (
                        <div className="bg-white p-10 rounded-[3rem] shadow-premium border border-white flex flex-col items-center justify-center min-h-[500px] text-center space-y-8">
                            {loading ? (
                                <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin" />
                            ) : connectionStatus?.instance?.state === 'open' ? (
                                <>
                                    <div className="w-32 h-32 bg-green-100 rounded-full flex items-center justify-center text-green-600 mb-4 animate-bounce-slow">
                                        <Smartphone size={64} />
                                    </div>
                                    <h2 className="text-3xl font-black text-muted-text">WhatsApp Conectado!</h2>
                                    <p className="text-gray-400 font-bold max-w-md">
                                        Sua instância
                                        <span className="text-primary mx-1">{connectionStatus?.instance?.instanceName}</span>
                                        está ativa e pronta para enviar mensagens.
                                    </p>
                                    <div className="flex gap-4">
                                        <Button
                                            variant="outline"
                                            onClick={checkConnection}
                                            className="rounded-full h-12 px-8"
                                        >
                                            Atualizar Status
                                        </Button>
                                        <Button
                                            onClick={handleLogout}
                                            className="rounded-full h-12 px-8 bg-red-100 text-red-600 hover:bg-red-200 shadow-none border-none"
                                        >
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
                                                    <input
                                                        type="text"
                                                        id="webhook-url"
                                                        className="flex-1 p-3 bg-white rounded-xl border-none font-bold text-xs"
                                                        placeholder="https://seu-site.com/api/whatsapp/webhook"
                                                        defaultValue={typeof window !== 'undefined' ? `${window.location.protocol}//${window.location.host}/api/whatsapp/webhook` : ''}
                                                    />
                                                    <Button
                                                        size="sm"
                                                        className="rounded-xl px-4 font-black text-[10px]"
                                                        onClick={async () => {
                                                            const url = (document.getElementById('webhook-url') as HTMLInputElement).value;
                                                            if (!url) return toast.error("Insira uma URL válida");
                                                            const loadingToast = toast.loading("Configurando Webhook...");
                                                            try {
                                                                const res = await evolutionService.registerWebhook(url);
                                                                if (res.status === "SUCCESS" || res.webhook) {
                                                                    toast.success("Webhook configurado com sucesso!", { id: loadingToast });
                                                                } else {
                                                                    toast.error(`Erro: ${res.message || "Falha na configuração"}`, { id: loadingToast });
                                                                }
                                                            } catch (error) {
                                                                toast.error("Erro ao registrar Webhook", { id: loadingToast });
                                                            }
                                                        }}
                                                    >
                                                        Configurar
                                                    </Button>
                                                </div>
                                                <p className="text-[10px] text-gray-400 font-bold italic">
                                                    💡 Use esta opção se a Evolution API estiver em um servidor que consegue acessar este site.
                                                </p>
                                            </div>
                                        </div>
                                    </div>
                                </>
                            ) : (
                                <>
                                    <h2 className="text-3xl font-black text-muted-text">Conectar WhatsApp</h2>
                                    <p className="text-gray-400 font-bold max-w-md">
                                        Abra o WhatsApp no seu celular, vá em <span className="text-muted-text">Aparelhos Conectados &gt; Conectar Aparelho</span> e escaneie o código abaixo.
                                    </p>

                                    {qrCode && connectionStatus?.instance?.state !== 'open' ? (
                                        <div className="p-4 bg-white rounded-3xl shadow-lg border-4 border-soft">
                                            {/* eslint-disable-next-line @next/next/no-img-element */}
                                            <img src={qrCode} alt="QR Code" className="w-64 h-64 object-contain" />
                                        </div>
                                    ) : (
                                        connectionStatus?.instance?.state !== 'open' && (
                                            <div className="w-64 h-64 bg-soft rounded-3xl flex items-center justify-center">
                                                {connecting ? (
                                                    <div className="text-center">
                                                        <Loader2 size={32} className="mx-auto text-primary animate-spin mb-2" />
                                                        <span className="text-xs font-black text-gray-400 uppercase tracking-widest">Gerando QR Code...</span>
                                                    </div>
                                                ) : (
                                                    <Button onClick={connect} variant="outline" className="rounded-full">
                                                        Gerar QR Code
                                                    </Button>
                                                )}
                                            </div>
                                        )
                                    )}
                                </>
                            )}
                        </div>
                    )
                }
            </main>
        </div>
    );
}
