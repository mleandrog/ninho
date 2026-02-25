"use client";

import { useEffect, useState, use } from "react";
import { supabase } from "@/lib/supabase";
import { Button } from "@/components/ui/Button";
import { ArrowLeft, Play, CheckCircle2, AlertCircle, Clock, Package, Users, Smartphone } from "lucide-react";
import { useRouter } from "next/navigation";
import { toast } from "react-hot-toast";

export default function CampaignDetailsPage({ params }: { params: Promise<{ id: string }> }) {
    const router = useRouter();
    const resolvedParams = use(params);
    const campaignId = resolvedParams.id;

    const [campaign, setCampaign] = useState<any>(null);
    const [products, setProducts] = useState<any[]>([]);
    const [groups, setGroups] = useState<any[]>([]);
    const [leads, setLeads] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [isStopping, setIsStopping] = useState(false);

    useEffect(() => {
        if (campaignId) {
            fetchCampaignDetails();
        }
    }, [campaignId]);

    // Polling contínuo se a campanha estiver rodando
    useEffect(() => {
        let interval: any;
        if (campaign?.status === 'running') {
            interval = setInterval(fetchCampaignDetails, 3000); // Atualiza a cada 3s
        }
        return () => {
            if (interval) clearInterval(interval);
        }
    }, [campaign?.status]);

    const fetchCampaignDetails = async () => {
        try {
            // 1. Buscar Campanha
            const { data: campaignData, error: campaignError } = await supabase
                .from("whatsapp_campaigns")
                .select("*, categories(name)")
                .eq("id", campaignId)
                .single();

            if (campaignError) throw campaignError;
            setCampaign(campaignData);

            // 2. Buscar Grupos Alvo
            if (campaignData.group_ids && campaignData.group_ids.length > 0) {
                const { data: groupsData } = await supabase
                    .from("whatsapp_groups")
                    .select("*")
                    .in("id", campaignData.group_ids);
                setGroups(groupsData || []);
            }

            // 3. Buscar Produtos da Categoria
            if (campaignData.category_id) {
                const { data: productsData } = await supabase
                    .from("products")
                    .select("*")
                    .eq("category_id", campaignData.category_id)
                    .eq("status", "available")
                    .order('id', { ascending: true });
                setProducts(productsData || []);
            }

            // 4. Buscar Interessados (Leads)
            const { data: leadsData } = await supabase
                .from("whatsapp_campaign_leads")
                .select("*")
                .eq("campaign_id", campaignId)
                .order('created_at', { ascending: false });
            setLeads(leadsData || []);

        } catch (error: any) {
            console.error("Erro ao buscar detalhes da campanha:", error);
            toast.error("Erro ao carregar campanha.");
        } finally {
            setLoading(false);
        }
    };

    const handleStopCampaign = async (id: number) => {
        if (!confirm('Tem certeza que deseja interromper esta campanha?')) return;

        try {
            setIsStopping(true);
            const response = await fetch('/api/whatsapp/campaign/stop', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ campaignId: id }),
            });

            if (!response.ok) throw new Error('Falha ao parar campanha');

            toast.success("Campanha interrompida!");
            fetchCampaignDetails();
        } catch (error) {
            console.error("Erro ao parar campanha:", error);
            toast.error("Erro ao interromper.");
        } finally {
            setIsStopping(false);
        }
    };

    const [elapsedSeconds, setElapsedSeconds] = useState(0);

    // Timer de tempo decorrido
    useEffect(() => {
        let interval: any;
        if (campaign?.status === 'running' && campaign?.started_at) {
            const start = new Date(campaign.started_at).getTime();
            interval = setInterval(() => {
                const now = new Date().getTime();
                setElapsedSeconds(Math.floor((now - start) / 1000));
            }, 1000);
        } else if (campaign?.status === 'completed' && campaign?.started_at && campaign?.completed_at) {
            const start = new Date(campaign.started_at).getTime();
            const end = new Date(campaign.completed_at).getTime();
            setElapsedSeconds(Math.floor((end - start) / 1000));
        }
        return () => {
            if (interval) clearInterval(interval);
        }
    }, [campaign?.status, campaign?.started_at, campaign?.completed_at]);

    if (loading) {
        return (
            <div className="flex-1 flex items-center justify-center py-20">
                <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
            </div>
        );
    }

    if (!campaign) {
        return (
            <div className="flex-1 p-12 text-center py-20">
                <h1 className="text-2xl font-black text-muted-text">Campanha não encontrada</h1>
                <Button onClick={() => router.push('/admin/whatsapp')} className="mt-4">Voltar</Button>
            </div>
        );
    }

    const progressPercentage = campaign.total_products > 0
        ? Math.round((campaign.products_sent / campaign.total_products) * 100)
        : 0;

    const remainingProducts = campaign.total_products - campaign.products_sent;
    const estimatedRemainingSeconds = (remainingProducts * campaign.interval_seconds) + (remainingProducts > 0 ? campaign.interval_seconds : 0);

    return (
        <div className="animate-in fade-in duration-500">
            {/* Header */}
            <div className="flex items-center justify-between gap-4 mb-8">
                <div className="flex items-center gap-4">
                    <button
                        onClick={() => router.push('/admin/whatsapp')}
                        className="w-12 h-12 bg-white rounded-full flex items-center justify-center text-gray-500 hover:text-primary transition-colors hover:shadow-md shrink-0"
                    >
                        <ArrowLeft size={20} />
                    </button>
                    <div>
                        <h1 className="text-3xl font-black text-muted-text -tracking-wider">
                            {campaign.name || 'Estatísticas da Campanha'}
                        </h1>
                        <p className="text-gray-400 font-bold uppercase text-[10px] tracking-widest mt-1">
                            {campaign.categories?.name} • Criada em {new Date(campaign.created_at).toLocaleDateString()}
                        </p>
                    </div>
                </div>

                <div className="flex items-center gap-3">
                    {campaign.status === 'running' && (
                        <Button
                            variant="destructive"
                            onClick={() => handleStopCampaign(campaign.id)}
                            isLoading={isStopping}
                            className="px-6 h-10 rounded-full font-black uppercase text-xs tracking-widest hover:scale-105 transition-all shadow-lg hover:shadow-red-500/20"
                        >
                            Parar Campanha
                        </Button>
                    )}
                    <div className={`px-4 py-2 rounded-full text-[10px] font-black uppercase tracking-widest flex items-center gap-2 ${campaign.status === 'running' ? 'bg-blue-100 text-blue-600' :
                        campaign.status === 'completed' ? 'bg-green-100 text-green-600' : 'bg-yellow-100 text-yellow-600'
                        }`}>
                        <div className={`w-2 h-2 rounded-full ${campaign.status === 'running' ? 'bg-blue-500 animate-pulse' :
                            campaign.status === 'completed' ? 'bg-green-500' : 'bg-yellow-500'
                            }`} />
                        {campaign.status === 'running' ? 'Em Andamento' :
                            campaign.status === 'completed' ? 'Concluída' : 'Aguardando'}
                    </div>
                </div>
            </div>

            <div className="grid lg:grid-cols-3 gap-8">
                {/* Coluna Esquerda: Métricas e Progresso */}
                <div className="lg:col-span-2 space-y-8">
                    {/* Progress Card */}
                    <div className="bg-white p-8 md:p-10 rounded-[3rem] shadow-premium border border-white relative overflow-hidden">
                        <h2 className="text-xl font-black text-muted-text mb-6 flex items-center gap-2">
                            <Play size={20} className="text-primary" /> Progresso dos Disparos
                        </h2>

                        <div className="flex justify-between items-end mb-4">
                            <div>
                                <p className="text-5xl font-black text-primary tracking-tighter">
                                    {Math.floor(estimatedRemainingSeconds / 60).toString().padStart(2, '0')}:{(estimatedRemainingSeconds % 60).toString().padStart(2, '0')}
                                </p>
                                <p className="text-sm font-bold text-gray-400 mt-1 uppercase tracking-widest">Tempo para Encerrar</p>
                            </div>
                            <div className="text-right">
                                <p className="text-2xl font-black text-muted-text uppercase tracking-tighter">
                                    {progressPercentage}%
                                </p>
                                <p className="text-sm font-bold text-gray-400 mt-1 uppercase tracking-widest">Concluído</p>
                            </div>
                        </div>

                        {/* Progress Bar */}
                        <div className="w-full h-4 bg-soft rounded-full overflow-hidden">
                            <div
                                className={`h-full rounded-full transition-all duration-1000 ${campaign.status === 'completed' ? 'bg-green-500' : 'bg-primary'
                                    }`}
                                style={{ width: `${progressPercentage}%` }}
                            />
                        </div>

                        <div className="mt-8 grid grid-cols-2 gap-4">
                            {/* Timer Decorrido (Secundário) */}
                            <div className="bg-soft/50 py-4 rounded-2xl border border-dashed border-gray-200 flex items-center gap-4 px-6 justify-center">
                                <div className="text-center">
                                    <p className="text-2xl font-black text-muted-text">
                                        {Math.floor(elapsedSeconds / 60)}
                                    </p>
                                    <p className="text-[8px] font-black text-gray-400 uppercase tracking-widest">Min</p>
                                </div>
                                <div className="text-2xl font-black text-gray-300 mb-2">:</div>
                                <div className="text-center">
                                    <p className="text-2xl font-black text-muted-text">
                                        {(elapsedSeconds % 60).toString().padStart(2, '0')}
                                    </p>
                                    <p className="text-[8px] font-black text-gray-400 uppercase tracking-widest">Seg</p>
                                </div>
                                <div className="ml-2 pl-4 border-l border-gray-200">
                                    <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest leading-tight">Tempo<br />Decorrido</p>
                                </div>
                            </div>

                            {/* Info Auxiliar */}
                            <div className="bg-primary/5 py-4 rounded-2xl border border-primary/10 flex items-center gap-4 px-6 justify-center">
                                <div className="text-center">
                                    <p className="text-2xl font-black text-primary">
                                        {campaign.products_sent} / {campaign.total_products}
                                    </p>
                                    <p className="text-[8px] font-black text-gray-400 uppercase tracking-widest">Produtos</p>
                                </div>
                                <div className="ml-2 pl-4 border-l border-primary/20">
                                    <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest leading-tight">Enviados<br />na Campanha</p>
                                </div>
                            </div>
                        </div>
                        {campaign.status === 'completed' && (
                            <p className="text-xs font-bold text-green-600 mt-6 flex items-center justify-center gap-2 bg-green-50 py-3 rounded-xl">
                                <CheckCircle2 size={16} /> Campanha finalizada com sucesso às {new Date(campaign.completed_at).toLocaleTimeString('pt-BR')}.
                            </p>
                        )}
                    </div>

                    {/* Produtos Card */}
                    <div className="bg-white p-8 md:p-10 rounded-[3rem] shadow-premium border border-white">
                        <div className="flex justify-between items-center mb-6">
                            <h2 className="text-xl font-black text-muted-text flex items-center gap-2">
                                <Package size={20} className="text-primary" /> Produtos da Campanha
                            </h2>
                            <span className="text-sm font-bold text-gray-400 bg-soft px-4 py-2 rounded-full">
                                {campaign.categories?.name}
                            </span>
                        </div>

                        <div className="space-y-4 max-h-[500px] overflow-y-auto pr-2">
                            {products.map((product, index) => {
                                // Considera enviado se o index for menor que products_sent
                                const isSent = index < campaign.products_sent;
                                const isCurrent = index === campaign.products_sent && campaign.status === 'running';

                                return (
                                    <div
                                        key={product.id}
                                        className={`flex items-center gap-4 p-4 rounded-2xl transition-all ${isCurrent ? 'bg-primary/5 border-2 border-primary/20' : 'bg-soft border border-transparent hover:border-gray-200'
                                            }`}
                                    >
                                        <div className="relative w-16 h-16 rounded-xl overflow-hidden bg-white shrink-0 shadow-sm">
                                            {product.image_url ? (
                                                // eslint-disable-next-line @next/next/no-img-element
                                                <img src={product.image_url} alt={product.name} className="w-full h-full object-cover" />
                                            ) : (
                                                <div className="w-full h-full flex items-center justify-center text-gray-300">
                                                    <Package size={24} />
                                                </div>
                                            )}

                                            {/* Badge de status sobre a imagem */}
                                            {isSent && (
                                                <div className="absolute inset-0 bg-green-500/20 backdrop-blur-[2px] flex items-center justify-center">
                                                    <CheckCircle2 size={24} className="text-green-600 drop-shadow-md" />
                                                </div>
                                            )}
                                        </div>

                                        <div className="flex-1 min-w-0">
                                            <h4 className="font-black text-muted-text truncate">{product.name}</h4>
                                            <p className="text-sm font-bold text-gray-500">
                                                R$ {Number(product.price).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                                            </p>
                                        </div>

                                        <div className="shrink-0 text-right">
                                            {isSent ? (
                                                <span className="text-[10px] font-black uppercase text-green-600 bg-green-100 px-3 py-1.5 rounded-lg flex items-center gap-1">
                                                    Enviado
                                                </span>
                                            ) : isCurrent ? (
                                                <span className="text-[10px] font-black uppercase text-blue-600 bg-blue-100 px-3 py-1.5 rounded-lg flex items-center gap-1 animate-pulse">
                                                    Enviando...
                                                </span>
                                            ) : (
                                                <span className="text-[10px] font-black uppercase text-gray-400 bg-gray-100 px-3 py-1.5 rounded-lg flex items-center gap-1">
                                                    <Clock size={12} /> Fila
                                                </span>
                                            )}
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                </div>

                {/* Coluna Direita: Grupos e Configuração */}
                <div className="space-y-8">
                    {/* Status Rápido */}
                    <div className="bg-white p-8 rounded-[3rem] shadow-premium border border-white">
                        <h3 className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-4">Configurações do Disparo</h3>

                        <ul className="space-y-4">
                            <li className="flex justify-between items-center text-sm font-bold">
                                <span className="text-gray-500 flex items-center gap-2"><Clock size={16} /> Intervalo</span>
                                <span className="text-muted-text bg-soft px-3 py-1 rounded-lg">{campaign.interval_seconds}s</span>
                            </li>
                            <li className="flex justify-between items-center text-sm font-bold">
                                <span className="text-gray-500 flex items-center gap-2"><Package size={16} /> Categoria Alvo</span>
                                <span className="text-muted-text truncate max-w-[150px]">{campaign.categories?.name}</span>
                            </li>
                            <li className="flex justify-between items-center text-sm font-bold">
                                <span className="text-gray-500 flex items-center gap-2"><Play size={16} /> Iniciada</span>
                                <span className="text-muted-text">
                                    {campaign.started_at ? new Date(campaign.started_at).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }) : '--'}
                                </span>
                            </li>
                        </ul>
                    </div>

                    {/* Grupos Alvo */}
                    <div className="bg-white p-8 rounded-[3rem] shadow-premium border border-white">
                        <h3 className="text-xl font-black text-muted-text mb-6 flex items-center gap-2">
                            <Users size={20} className="text-primary" /> Grupos Alvo ({groups.length})
                        </h3>

                        <div className="space-y-3">
                            {groups.map(group => (
                                <div key={group.id} className="p-4 bg-soft rounded-2xl border border-transparent hover:border-gray-200 transition-colors flex justify-between items-center">
                                    <span className="font-black text-sm text-muted-text truncate pr-4">{group.name}</span>
                                    {campaign.status === 'completed' ? (
                                        <CheckCircle2 size={16} className="text-green-500 shrink-0" />
                                    ) : campaign.status === 'running' ? (
                                        <div className="w-2 h-2 bg-blue-500 rounded-full animate-ping shrink-0" />
                                    ) : (
                                        <Clock size={16} className="text-gray-400 shrink-0" />
                                    )}
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Interessados / Leads */}
                    <div className="bg-gradient-to-br from-primary/10 to-transparent p-8 rounded-[3rem] border border-primary/20">
                        <div className="flex justify-between items-center mb-6">
                            <div className="flex gap-3 items-center">
                                <AlertCircle size={20} className="text-primary" />
                                <h3 className="font-black text-muted-text uppercase text-xs tracking-widest">Interessados ({leads.length})</h3>
                            </div>
                        </div>

                        <div className="space-y-2 max-h-[500px] overflow-y-auto pr-2">
                            {leads.length === 0 ? (
                                <p className="text-sm font-bold text-gray-500 leading-relaxed text-center py-4">
                                    Nenhum interessado capturado ainda.
                                </p>
                            ) : (
                                <div className="flex flex-col gap-2">
                                    {leads.map(lead => (
                                        <div key={lead.id} className="bg-white p-3 rounded-xl shadow-sm border border-soft flex items-center justify-between gap-4 group hover:border-primary/30 transition-all">
                                            <div className="flex items-center gap-3 min-w-0">
                                                <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-primary shrink-0 font-black text-[10px]">
                                                    {lead.contact_name?.charAt(0).toUpperCase() || 'U'}
                                                </div>
                                                <div className="min-w-0">
                                                    <h4 className="font-black text-xs text-muted-text truncate">{lead.contact_name}</h4>
                                                    <p className="text-[10px] font-bold text-primary truncate">
                                                        {lead.product_name || 'Direta'}
                                                    </p>
                                                </div>
                                            </div>

                                            <div className="flex items-center gap-4 shrink-0">
                                                <span className="text-[10px] font-black text-gray-400 bg-soft px-2 py-1 rounded-md">
                                                    {new Date(lead.created_at).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                                                </span>
                                                <a
                                                    href={`https://wa.me/${lead.phone}`}
                                                    target="_blank"
                                                    rel="noopener noreferrer"
                                                    className="w-8 h-8 flex items-center justify-center bg-green-100 text-green-600 rounded-lg hover:bg-green-600 hover:text-white transition-all shadow-sm"
                                                    title="Chamar no WhatsApp"
                                                >
                                                    <Smartphone size={14} />
                                                </a>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
