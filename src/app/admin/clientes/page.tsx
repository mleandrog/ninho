"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { Button } from "@/components/ui/Button";
import { Users, Plus, Search, Edit2, Trash2, X, Loader2, Shield, ChevronDown, Package } from "lucide-react";
import { toast } from "react-hot-toast";
import { clsx } from "clsx";

type Level = { id: string; name: string; label: string; color: string };
type Customer = {
    id: string;
    full_name: string;
    phone: string;
    created_at: string;
    customer_level_id: string | null;
    level?: Level;
    orders_count?: number;
};

export default function AdminClientesPage() {
    const [tab, setTab] = useState<'clientes' | 'niveis'>('clientes');

    // --- Clientes ---
    const [customers, setCustomers] = useState<Customer[]>([]);
    const [levels, setLevels] = useState<Level[]>([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');
    const [filterLevel, setFilterLevel] = useState('');
    const [editingCustomer, setEditingCustomer] = useState<Customer | null>(null);
    const [selectedLevelId, setSelectedLevelId] = useState('');
    const [saving, setSaving] = useState(false);

    // --- Níveis ---
    const [showLevelModal, setShowLevelModal] = useState(false);
    const [editingLevel, setEditingLevel] = useState<Level | null>(null);
    const [levelForm, setLevelForm] = useState({ name: '', label: '', color: '#6B7280' });
    const [savingLevel, setSavingLevel] = useState(false);

    useEffect(() => {
        fetchLevels();
        fetchCustomers();
    }, []);

    const fetchLevels = async () => {
        const { data } = await supabase.from('customer_levels').select('*').order('created_at');
        setLevels(data || []);
    };

    const fetchCustomers = async () => {
        setLoading(true);
        try {
            const { data } = await supabase
                .from('profiles')
                .select('id, full_name, phone, created_at, customer_level_id, customer_levels(id, name, label, color)')
                .order('created_at', { ascending: false });

            const mapped = (data || []).map((p: any) => ({
                ...p,
                level: p.customer_levels ?? null,
            }));
            setCustomers(mapped);
        } finally {
            setLoading(false);
        }
    };

    const handleSaveCustomerLevel = async () => {
        if (!editingCustomer) return;
        setSaving(true);
        try {
            const { error } = await supabase
                .from('profiles')
                .update({ customer_level_id: selectedLevelId || null })
                .eq('id', editingCustomer.id);
            if (error) throw error;
            toast.success('Nível atualizado!');
            setEditingCustomer(null);
            fetchCustomers();
        } catch (e: any) {
            toast.error(e.message);
        } finally {
            setSaving(false);
        }
    };

    // --- Níveis CRUD ---
    const generateName = (label: string) =>
        label.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/\s+/g, '_');

    const handleSaveLevel = async () => {
        setSavingLevel(true);
        try {
            const payload = {
                name: levelForm.name || generateName(levelForm.label),
                label: levelForm.label,
                color: levelForm.color,
            };
            if (editingLevel) {
                const { error } = await supabase.from('customer_levels').update(payload).eq('id', editingLevel.id);
                if (error) throw error;
                toast.success('Nível atualizado!');
            } else {
                const { error } = await supabase.from('customer_levels').insert([payload]);
                if (error) throw error;
                toast.success('Nível criado!');
            }
            setShowLevelModal(false);
            setEditingLevel(null);
            setLevelForm({ name: '', label: '', color: '#6B7280' });
            fetchLevels();
        } catch (e: any) {
            toast.error(e.message);
        } finally {
            setSavingLevel(false);
        }
    };

    const handleDeleteLevel = async (level: Level) => {
        const inUse = customers.some(c => c.customer_level_id === level.id);
        if (inUse) {
            toast.error(`Não é possível excluir "${level.label}" pois há clientes com esse nível.`);
            return;
        }
        if (!confirm(`Excluir nível "${level.label}"?`)) return;
        const { error } = await supabase.from('customer_levels').delete().eq('id', level.id);
        if (error) toast.error(error.message);
        else { toast.success('Nível excluído!'); fetchLevels(); }
    };

    const filtered = customers.filter(c => {
        const matchSearch = !search || (c.full_name + c.phone).toLowerCase().includes(search.toLowerCase());
        const matchLevel = !filterLevel || c.customer_level_id === filterLevel;
        return matchSearch && matchLevel;
    });

    const getLevelForCustomer = (c: Customer) =>
        c.level ?? levels.find(l => l.name === 'normal') ?? null;

    // --- Pedidos do Cliente ---
    const [customerOrders, setCustomerOrders] = useState<any[]>([]);
    const [loadingOrders, setLoadingOrders] = useState(false);
    const [detailTab, setDetailTab] = useState<'info' | 'pedidos'>('info');
    const [showDetailModal, setShowDetailModal] = useState(false);
    const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);

    const fetchCustomerOrders = async (phone: string) => {
        setLoadingOrders(true);
        try {
            const cleanPhone = phone.replace(/\D/g, '');
            const { data } = await supabase
                .from('orders')
                .select('*')
                .eq('customer_phone', cleanPhone)
                .order('created_at', { ascending: false });
            setCustomerOrders(data || []);
        } finally {
            setLoadingOrders(false);
        }
    };

    const handleOpenDetails = (c: Customer) => {
        setSelectedCustomer(c);
        setDetailTab('info');
        setShowDetailModal(true);
        fetchCustomerOrders(c.phone);
    };

    return (
        <div className="animate-in fade-in duration-500">
            <header className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-6 mb-10">
                <div>
                    <h1 className="text-3xl lg:text-4xl font-black text-muted-text lowercase tracking-tighter">Clientes</h1>
                    <p className="text-gray-400 font-bold mt-1">{customers.length} clientes cadastrados</p>
                </div>

                {/* Tabs */}
                <div className="flex bg-white p-1.5 rounded-2xl lg:rounded-[2rem] shadow-premium border border-white gap-1 transition-all w-full lg:w-auto overflow-x-auto">
                    {(['clientes', 'niveis'] as const).map(t => (
                        <button
                            key={t}
                            onClick={() => setTab(t)}
                            className={clsx(
                                "px-6 lg:px-8 py-3 rounded-xl lg:rounded-[1.5rem] flex items-center justify-center gap-2 lg:gap-3 transition-all font-black text-[10px] lg:text-xs uppercase tracking-widest flex-1 lg:flex-none whitespace-nowrap",
                                tab === t ? "bg-primary text-white shadow-lg" : "text-gray-400 hover:text-muted-text hover:bg-soft"
                            )}
                        >
                            {t === 'clientes' ? <Users size={16} /> : <Shield size={16} />}
                            {t === 'clientes' ? "Clientes" : "Níveis"}
                        </button>
                    ))}
                </div>
            </header>

            {/* ======= ABA CLIENTES ======= */}
            {tab === 'clientes' && (
                <div className="animate-in slide-in-from-bottom-2 duration-300">
                    <div className="bg-white p-6 rounded-3xl lg:rounded-[2.5rem] shadow-premium border border-white mb-8">
                        <div className="flex flex-col sm:flex-row gap-4">
                            <div className="relative flex-1">
                                <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                                <input
                                    type="text"
                                    placeholder="Buscar por nome ou telefone..."
                                    value={search}
                                    onChange={e => setSearch(e.target.value)}
                                    className="w-full pl-11 pr-4 py-3 bg-soft rounded-2xl font-bold text-sm text-muted-text border-none focus:ring-2 focus:ring-primary/20 outline-none"
                                />
                            </div>
                            <div className="relative">
                                <ChevronDown size={16} className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
                                <select
                                    value={filterLevel}
                                    onChange={e => setFilterLevel(e.target.value)}
                                    className="w-full sm:w-auto pl-6 pr-10 py-3 rounded-2xl bg-soft font-black text-[10px] uppercase tracking-widest text-gray-500 border-none appearance-none cursor-pointer outline-none"
                                >
                                    <option value="">Todos os níveis</option>
                                    {levels.map(l => (
                                        <option key={l.id} value={l.id}>{l.label}</option>
                                    ))}
                                </select>
                            </div>
                        </div>
                    </div>

                    <div className="bg-white rounded-3xl lg:rounded-[2.5rem] shadow-premium border border-white overflow-hidden">
                        <div className="overflow-x-auto scrollbar-thin scrollbar-thumb-gray-200">
                            <table className="w-full text-left min-w-[800px]">
                                <thead>
                                    <tr className="bg-soft/50">
                                        <th className="px-6 lg:px-8 py-6 text-xs font-black text-gray-400 uppercase tracking-widest">Cliente</th>
                                        <th className="px-6 lg:px-8 py-6 text-xs font-black text-gray-400 uppercase tracking-widest">Telefone</th>
                                        <th className="px-6 lg:px-8 py-6 text-xs font-black text-gray-400 uppercase tracking-widest">Nível</th>
                                        <th className="px-6 lg:px-8 py-6 text-xs font-black text-gray-400 uppercase tracking-widest text-center">Cadastro</th>
                                        <th className="px-6 lg:px-8 py-6 text-xs font-black text-gray-400 uppercase tracking-widest text-center">Ações</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-50">
                                    {loading ? (
                                        <tr><td colSpan={5} className="text-center py-20 text-gray-400 font-bold animate-pulse">Carregando clientes...</td></tr>
                                    ) : filtered.length === 0 ? (
                                        <tr><td colSpan={5} className="text-center py-20 text-gray-400 font-bold">Nenhum cliente encontrado.</td></tr>
                                    ) : filtered.map(c => {
                                        const lvl = getLevelForCustomer(c);
                                        return (
                                            <tr key={c.id} className="hover:bg-soft/30 transition-colors group">
                                                <td className="px-6 lg:px-8 py-6 cursor-pointer" onClick={() => handleOpenDetails(c)}>
                                                    <div className="flex items-center gap-4">
                                                        <div className="w-12 h-12 rounded-2xl flex items-center justify-center text-white font-black text-sm shrink-0 shadow-sm" style={{ backgroundColor: lvl?.color || '#6B7280' }}>
                                                            {(c.full_name || '?')[0]?.toUpperCase()}
                                                        </div>
                                                        <span className="font-black text-muted-text">{c.full_name || 'Sem nome'}</span>
                                                    </div>
                                                </td>
                                                <td className="px-6 lg:px-8 py-6 text-gray-500 font-bold text-sm tracking-tight">{c.phone || '—'}</td>
                                                <td className="px-6 lg:px-8 py-6">
                                                    <span
                                                        className="inline-block px-3 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-widest text-white shadow-sm"
                                                        style={{ backgroundColor: lvl?.color || '#6B7280' }}
                                                    >
                                                        {lvl?.label || 'Normal'}
                                                    </span>
                                                </td>
                                                <td className="px-6 lg:px-8 py-6 text-gray-400 font-bold text-xs text-center">
                                                    {new Date(c.created_at).toLocaleDateString('pt-BR')}
                                                </td>
                                                <td className="px-6 lg:px-8 py-6 text-center">
                                                    <div className="flex items-center justify-center gap-2">
                                                        <button
                                                            onClick={() => handleOpenDetails(c)}
                                                            className="p-3 bg-soft text-gray-500 rounded-xl hover:bg-primary hover:text-white transition-all shadow-sm"
                                                            title="Ver Detalhes"
                                                        >
                                                            <Search size={18} />
                                                        </button>
                                                        <button
                                                            onClick={() => { setEditingCustomer(c); setSelectedLevelId(c.customer_level_id || ''); }}
                                                            className="p-3 bg-soft text-gray-500 rounded-xl hover:bg-primary hover:text-white transition-all shadow-sm"
                                                            title="Alterar Nível"
                                                        >
                                                            <Shield size={18} />
                                                        </button>
                                                    </div>
                                                </td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>
            )}

            {/* ======= ABA NÍVEIS ======= */}
            {tab === 'niveis' && (
                <div className="animate-in slide-in-from-bottom-2 duration-300">
                    <div className="flex justify-between items-center mb-8">
                        <h2 className="text-xl font-black text-muted-text lowercase tracking-tighter">configuração de níveis</h2>
                        <Button
                            onClick={() => { setEditingLevel(null); setLevelForm({ name: '', label: '', color: '#6B7280' }); setShowLevelModal(true); }}
                            className="h-12 px-6 rounded-2xl gap-3 shadow-vibrant font-black text-xs uppercase tracking-widest"
                        >
                            <Plus size={18} /> Novo Nível
                        </Button>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                        {levels.map(lvl => {
                            const count = customers.filter(c => c.customer_level_id === lvl.id).length;
                            return (
                                <div key={lvl.id} className="bg-white rounded-[2rem] p-6 shadow-premium border border-white hover:border-primary/20 transition-all group">
                                    <div className="flex items-center justify-between mb-6">
                                        <div className="flex items-center gap-4">
                                            <div className="w-12 h-12 rounded-2xl shadow-sm" style={{ backgroundColor: lvl.color }} />
                                            <div>
                                                <p className="font-black text-muted-text uppercase tracking-wider">{lvl.label}</p>
                                                <code className="text-[10px] text-gray-400 font-bold bg-soft px-1.5 py-0.5 rounded-lg">{lvl.name}</code>
                                            </div>
                                        </div>
                                        <div className="text-right">
                                            <span className="text-3xl font-black text-primary leading-none">{count}</span>
                                            <p className="text-[10px] text-gray-400 font-black uppercase tracking-widest mt-1">membros</p>
                                        </div>
                                    </div>

                                    <div className="flex gap-3">
                                        <button
                                            onClick={() => { setEditingLevel(lvl); setLevelForm({ name: lvl.name, label: lvl.label, color: lvl.color }); setShowLevelModal(true); }}
                                            className="flex-1 py-3 bg-soft text-gray-500 rounded-xl hover:bg-primary hover:text-white transition-all font-black text-xs uppercase tracking-widest"
                                        >
                                            <Edit2 size={14} className="inline mr-2" /> Editar
                                        </button>
                                        <button
                                            onClick={() => handleDeleteLevel(lvl)}
                                            className="flex-1 py-3 bg-soft text-gray-500 rounded-xl hover:bg-red-500 hover:text-white transition-all font-black text-xs uppercase tracking-widest"
                                        >
                                            <Trash2 size={14} className="inline mr-2" />
                                        </button>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>
            )}

            {/* Modal Detalhes do Cliente */}
            {showDetailModal && selectedCustomer && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-0 sm:p-4 backdrop-blur-sm animate-in fade-in duration-200">
                    <div className="bg-white sm:rounded-[3rem] w-full max-w-2xl h-full sm:h-auto max-h-[90vh] overflow-hidden shadow-2xl flex flex-col relative">
                        {/* Header Modal */}
                        <div className="p-8 lg:p-10 pb-4 flex justify-between items-start">
                            <div className="flex items-center gap-6">
                                <div className="w-20 h-20 rounded-[2rem] flex items-center justify-center text-white font-black text-3xl shadow-lg"
                                    style={{ backgroundColor: getLevelForCustomer(selectedCustomer)?.color || '#6B7280' }}>
                                    {(selectedCustomer.full_name || '?')[0]?.toUpperCase()}
                                </div>
                                <div>
                                    <h2 className="text-3xl font-black text-muted-text lowercase tracking-tighter leading-none">{selectedCustomer.full_name}</h2>
                                    <p className="text-gray-400 font-bold text-sm mt-2">{selectedCustomer.phone}</p>
                                    <div className="mt-2 text-[10px] font-black uppercase tracking-widest text-primary bg-primary/10 px-3 py-1 rounded-full inline-block">
                                        {getLevelForCustomer(selectedCustomer)?.label || 'Normal'}
                                    </div>
                                </div>
                            </div>
                            <button onClick={() => setShowDetailModal(false)} className="p-2 hover:bg-soft rounded-xl transition-colors shrink-0"><X size={24} /></button>
                        </div>

                        {/* Tabs Modal */}
                        <div className="px-8 lg:px-10 flex gap-6 border-b border-gray-100">
                            {(['info', 'pedidos'] as const).map(t => (
                                <button
                                    key={t}
                                    onClick={() => setDetailTab(t)}
                                    className={clsx(
                                        "pb-4 text-[10px] font-black uppercase tracking-widest transition-all relative",
                                        detailTab === t ? "text-primary" : "text-gray-400 hover:text-muted-text"
                                    )}
                                >
                                    {t === 'info' ? 'Informações' : 'Histórico de Pedidos'}
                                    {detailTab === t && <div className="absolute bottom-0 left-0 right-0 h-1 bg-primary rounded-full" />}
                                </button>
                            ))}
                        </div>

                        {/* Content Modal */}
                        <div className="flex-1 overflow-y-auto p-8 lg:p-10 scrollbar-thin scrollbar-thumb-gray-200">
                            {detailTab === 'info' ? (
                                <div className="space-y-8 animate-in fade-in slide-in-from-left-2 duration-300">
                                    <div className="grid grid-cols-2 gap-8">
                                        <div className="space-y-1">
                                            <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Data de Cadastro</p>
                                            <p className="font-bold text-muted-text">{new Date(selectedCustomer.created_at).toLocaleDateString('pt-BR', { day: '2-digit', month: 'long', year: 'numeric' })}</p>
                                        </div>
                                        <div className="space-y-1">
                                            <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Total de Pedidos</p>
                                            <p className="font-bold text-muted-text">{customerOrders.length} pedidos realizados</p>
                                        </div>
                                    </div>

                                    {(selectedCustomer as any).address && (
                                        <div className="space-y-4 pt-4 border-t border-dashed border-gray-100">
                                            <h3 className="text-xs font-black text-muted-text uppercase tracking-widest">Endereço de Entrega</h3>
                                            <div className="bg-soft p-6 rounded-2xl grid grid-cols-2 gap-4">
                                                <div className="col-span-2">
                                                    <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">Rua / Logradouro</p>
                                                    <p className="font-bold text-muted-text">{(selectedCustomer as any).address.street}, {(selectedCustomer as any).address.number}</p>
                                                </div>
                                                <div>
                                                    <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">Bairro</p>
                                                    <p className="font-bold text-muted-text">{(selectedCustomer as any).address.neighborhood}</p>
                                                </div>
                                                <div>
                                                    <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">Cidade / UF</p>
                                                    <p className="font-bold text-muted-text">{(selectedCustomer as any).address.city} - {(selectedCustomer as any).address.state}</p>
                                                </div>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            ) : (
                                <div className="space-y-4 animate-in fade-in slide-in-from-right-2 duration-300">
                                    {loadingOrders ? (
                                        <div className="flex flex-col items-center justify-center py-20 gap-4">
                                            <Loader2 size={32} className="animate-spin text-primary" />
                                            <p className="text-sm font-bold text-gray-400">Buscando histórico...</p>
                                        </div>
                                    ) : customerOrders.length === 0 ? (
                                        <div className="text-center py-20 bg-soft rounded-3xl border border-dashed border-gray-200">
                                            <Package size={40} className="mx-auto text-gray-300 mb-4" />
                                            <p className="text-sm font-bold text-gray-400">Nenhum pedido encontrado para este cliente.</p>
                                        </div>
                                    ) : (
                                        <div className="space-y-3">
                                            {customerOrders.map(order => (
                                                <div key={order.id} className="bg-soft p-5 rounded-2xl border border-transparent hover:border-gray-200 transition-all flex items-center justify-between gap-4">
                                                    <div className="flex items-center gap-4">
                                                        <div className="w-10 h-10 rounded-xl bg-white border border-gray-100 flex items-center justify-center text-primary font-black text-xs">
                                                            #{order.id.toString().slice(-4)}
                                                        </div>
                                                        <div>
                                                            <p className="font-black text-muted-text text-sm">R$ {Number(order.total_amount).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</p>
                                                            <p className="text-[10px] font-bold text-gray-400 uppercase">{new Date(order.created_at).toLocaleDateString('pt-BR')}</p>
                                                        </div>
                                                    </div>
                                                    <div className={clsx(
                                                        "px-3 py-1.5 rounded-lg text-[9px] font-black uppercase tracking-widest shadow-sm",
                                                        order.status === 'approved' ? 'bg-green-100 text-green-600' :
                                                            order.status === 'pending' ? 'bg-yellow-100 text-yellow-600' : 'bg-gray-100 text-gray-500'
                                                    )}>
                                                        {order.status === 'approved' ? 'Aprovado' : order.status === 'pending' ? 'Pendente' : order.status}
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>

                        {/* Footer Modal */}
                        <div className="p-8 lg:p-10 pt-4 bg-gray-50/50 flex justify-end">
                            <Button variant="outline" className="px-8 h-12 rounded-2xl font-black text-xs uppercase tracking-widest shadow-sm" onClick={() => setShowDetailModal(false)}>Fechar</Button>
                        </div>
                    </div>
                </div>
            )}

            {/* Modal Editar Nível do Cliente */}
            {editingCustomer && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-0 sm:p-4 backdrop-blur-sm animate-in fade-in duration-200">
                    <div className="bg-white sm:rounded-[3rem] p-6 lg:p-10 w-full max-w-sm h-full sm:h-auto overflow-y-auto shadow-2xl relative">
                        <div className="flex justify-between items-center mb-8 sticky top-0 bg-white z-10 pb-2">
                            <div>
                                <h2 className="text-2xl font-black text-muted-text">Alterar Nível</h2>
                                <p className="text-gray-400 font-bold text-xs mt-1">{editingCustomer.full_name || 'Cliente'}</p>
                            </div>
                            <button onClick={() => setEditingCustomer(null)} className="p-2 hover:bg-soft rounded-xl transition-colors"><X size={24} /></button>
                        </div>

                        <div className="space-y-3 mb-10">
                            {[{ id: '', label: 'Sem Nível', color: '#6B7280' }, ...levels].map(l => (
                                <button
                                    key={l.id}
                                    onClick={() => setSelectedLevelId(l.id)}
                                    className={clsx(
                                        "w-full flex items-center gap-4 p-4 rounded-2xl border-2 transition-all group",
                                        selectedLevelId === l.id ? 'border-primary bg-primary/5' : 'border-gray-50 hover:border-gray-100'
                                    )}
                                >
                                    <div className="w-8 h-8 rounded-xl shadow-sm shrink-0" style={{ backgroundColor: l.color }} />
                                    <span className={clsx("font-black text-sm uppercase tracking-widest", selectedLevelId === l.id ? "text-primary" : "text-muted-text")}>
                                        {l.label}
                                    </span>
                                    {selectedLevelId === l.id && <div className="ml-auto w-6 h-6 rounded-full bg-primary flex items-center justify-center text-white"><span className="text-xs">✓</span></div>}
                                </button>
                            ))}
                        </div>

                        <div className="flex flex-col sm:flex-row gap-4">
                            <Button variant="outline" className="h-14 rounded-2xl font-black text-xs uppercase tracking-widest" onClick={() => setEditingCustomer(null)} disabled={saving}>Cancelar</Button>
                            <Button className="flex-1 h-14 rounded-2xl shadow-vibrant font-black text-xs uppercase tracking-widest" onClick={handleSaveCustomerLevel} disabled={saving}>
                                {saving ? <Loader2 size={18} className="animate-spin" /> : 'Salvar Nível'}
                            </Button>
                        </div>
                    </div>
                </div>
            )}

            {/* Modal Criar/Editar Nível */}
            {showLevelModal && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-0 sm:p-4 backdrop-blur-sm animate-in fade-in duration-200">
                    <div className="bg-white sm:rounded-[3rem] p-6 lg:p-10 w-full max-w-sm h-full sm:h-auto overflow-y-auto shadow-2xl relative">
                        <div className="flex justify-between items-center mb-8 sticky top-0 bg-white z-10 pb-2">
                            <h2 className="text-2xl font-black text-muted-text">{editingLevel ? 'Editar Nível' : 'Novo Nível'}</h2>
                            <button onClick={() => setShowLevelModal(false)} className="p-2 hover:bg-soft rounded-xl transition-colors"><X size={24} /></button>
                        </div>

                        <div className="space-y-6">
                            <div>
                                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest block mb-2">Nome do Nível</label>
                                <input
                                    type="text"
                                    placeholder="Ex: Ouro, Diamante, VIP..."
                                    value={levelForm.label}
                                    onChange={e => setLevelForm(f => ({ ...f, label: e.target.value, name: generateName(e.target.value) }))}
                                    className="w-full p-4 bg-soft rounded-2xl font-bold text-muted-text border-none focus:ring-2 focus:ring-primary/20 outline-none"
                                />
                            </div>
                            <div>
                                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest block mb-2">Cor do Badge</label>
                                <div className="flex items-center gap-4">
                                    <div className="relative">
                                        <input
                                            type="color"
                                            value={levelForm.color}
                                            onChange={e => setLevelForm(f => ({ ...f, color: e.target.value }))}
                                            className="w-14 h-14 rounded-2xl border-none cursor-pointer bg-soft p-1"
                                        />
                                    </div>
                                    <div className="flex-1">
                                        <div
                                            className="px-4 py-2 rounded-xl text-white font-black text-[10px] uppercase tracking-widest shadow-sm text-center"
                                            style={{ backgroundColor: levelForm.color }}
                                        >
                                            {levelForm.label || 'Preview'}
                                        </div>
                                        <p className="text-[10px] text-gray-400 font-bold mt-1 text-center font-mono uppercase">{levelForm.color}</p>
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div className="flex flex-col sm:flex-row gap-4 mt-10">
                            <Button variant="outline" className="h-14 rounded-2xl font-black text-xs uppercase tracking-widest" onClick={() => setShowLevelModal(false)} disabled={savingLevel}>Cancelar</Button>
                            <Button className="flex-1 h-14 rounded-2xl shadow-vibrant font-black text-xs uppercase tracking-widest" onClick={handleSaveLevel} disabled={savingLevel || !levelForm.label}>
                                {savingLevel ? <Loader2 size={18} className="animate-spin" /> : (editingLevel ? 'Atualizar' : 'Criar Nível')}
                            </Button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
