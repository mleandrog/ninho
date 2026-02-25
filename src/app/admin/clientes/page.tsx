"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { AdminSidebar } from "@/components/admin/AdminSidebar";
import { Button } from "@/components/ui/Button";
import { Users, Plus, Search, Edit2, Trash2, X, Loader2, Shield, ChevronDown } from "lucide-react";
import { toast } from "react-hot-toast";

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

    return (
        <div className="min-h-screen bg-soft flex">
            <AdminSidebar />
            <main className="flex-1 p-12 overflow-y-auto">
                <header className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 mb-10">
                    <div>
                        <h1 className="text-4xl font-black text-muted-text lowercase tracking-tighter">Clientes</h1>
                        <p className="text-gray-400 font-bold mt-1">{customers.length} clientes cadastrados</p>
                    </div>
                </header>

                {/* Tabs */}
                <div className="flex gap-2 mb-8">
                    {(['clientes', 'niveis'] as const).map(t => (
                        <button
                            key={t}
                            onClick={() => setTab(t)}
                            className={`px-6 py-3 rounded-2xl font-black text-sm uppercase tracking-widest transition-all ${tab === t ? 'bg-primary text-white shadow-vibrant' : 'bg-white text-gray-400 hover:text-muted-text'}`}
                        >
                            {t === 'clientes' ? <><Users size={16} className="inline mr-2" />Clientes</> : <><Shield size={16} className="inline mr-2" />Níveis</>}
                        </button>
                    ))}
                </div>

                {/* ======= ABA CLIENTES ======= */}
                {tab === 'clientes' && (
                    <div className="bg-white rounded-[2.5rem] shadow-premium border border-white overflow-hidden">
                        <div className="p-6 border-b border-gray-50 flex flex-col md:flex-row gap-4">
                            <div className="relative flex-1">
                                <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                                <input
                                    type="text"
                                    placeholder="Buscar por nome ou telefone..."
                                    value={search}
                                    onChange={e => setSearch(e.target.value)}
                                    className="w-full pl-11 pr-4 py-3 bg-soft rounded-2xl font-medium text-muted-text border-none focus:ring-2 focus:ring-primary/20"
                                />
                            </div>
                            <select
                                value={filterLevel}
                                onChange={e => setFilterLevel(e.target.value)}
                                className="px-4 py-3 rounded-2xl bg-soft font-bold text-gray-500 border-none"
                            >
                                <option value="">Todos os níveis</option>
                                {levels.map(l => (
                                    <option key={l.id} value={l.id}>{l.label}</option>
                                ))}
                            </select>
                        </div>

                        <div className="overflow-x-auto">
                            <table className="w-full text-left">
                                <thead>
                                    <tr className="bg-soft/50">
                                        <th className="px-8 py-5 text-xs font-black text-gray-400 uppercase tracking-widest">Cliente</th>
                                        <th className="px-8 py-5 text-xs font-black text-gray-400 uppercase tracking-widest">Telefone</th>
                                        <th className="px-8 py-5 text-xs font-black text-gray-400 uppercase tracking-widest">Nível</th>
                                        <th className="px-8 py-5 text-xs font-black text-gray-400 uppercase tracking-widest">Cadastro</th>
                                        <th className="px-8 py-5 text-xs font-black text-gray-400 uppercase tracking-widest text-center">Ações</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-50">
                                    {loading ? (
                                        <tr><td colSpan={5} className="text-center py-20 text-gray-400 font-bold animate-pulse">Carregando...</td></tr>
                                    ) : filtered.length === 0 ? (
                                        <tr><td colSpan={5} className="text-center py-20 text-gray-400 font-bold">Nenhum cliente encontrado.</td></tr>
                                    ) : filtered.map(c => {
                                        const lvl = getLevelForCustomer(c);
                                        return (
                                            <tr key={c.id} className="hover:bg-soft/30 transition-colors group">
                                                <td className="px-8 py-5">
                                                    <div className="flex items-center gap-3">
                                                        <div className="w-10 h-10 rounded-2xl flex items-center justify-center text-white font-black text-sm" style={{ backgroundColor: lvl?.color || '#6B7280' }}>
                                                            {(c.full_name || '?')[0]?.toUpperCase()}
                                                        </div>
                                                        <span className="font-black text-muted-text">{c.full_name || 'Sem nome'}</span>
                                                    </div>
                                                </td>
                                                <td className="px-8 py-5 text-gray-500 font-bold">{c.phone || '—'}</td>
                                                <td className="px-8 py-5">
                                                    <span
                                                        className="inline-block px-3 py-1 rounded-xl text-xs font-black uppercase tracking-widest text-white"
                                                        style={{ backgroundColor: lvl?.color || '#6B7280' }}
                                                    >
                                                        {lvl?.label || 'Normal'}
                                                    </span>
                                                </td>
                                                <td className="px-8 py-5 text-gray-400 font-bold text-sm">
                                                    {new Date(c.created_at).toLocaleDateString('pt-BR')}
                                                </td>
                                                <td className="px-8 py-5 text-center">
                                                    <button
                                                        onClick={() => { setEditingCustomer(c); setSelectedLevelId(c.customer_level_id || ''); }}
                                                        className="p-3 bg-soft text-gray-500 rounded-xl hover:bg-primary hover:text-white transition-all"
                                                    >
                                                        <Edit2 size={16} />
                                                    </button>
                                                </td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                        </div>
                    </div>
                )}

                {/* ======= ABA NÍVEIS ======= */}
                {tab === 'niveis' && (
                    <div>
                        <div className="flex justify-end mb-6">
                            <Button
                                onClick={() => { setEditingLevel(null); setLevelForm({ name: '', label: '', color: '#6B7280' }); setShowLevelModal(true); }}
                                className="h-13 px-8 rounded-2xl gap-3 shadow-vibrant"
                            >
                                <Plus size={18} /> Novo Nível
                            </Button>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                            {levels.map(lvl => {
                                const count = customers.filter(c => c.customer_level_id === lvl.id).length;
                                return (
                                    <div key={lvl.id} className="bg-white rounded-3xl p-6 shadow-premium border border-white">
                                        <div className="flex items-center justify-between mb-4">
                                            <div className="flex items-center gap-3">
                                                <div className="w-10 h-10 rounded-2xl" style={{ backgroundColor: lvl.color }} />
                                                <div>
                                                    <p className="font-black text-muted-text">{lvl.label}</p>
                                                    <code className="text-xs text-gray-400">{lvl.name}</code>
                                                </div>
                                            </div>
                                            <span className="text-2xl font-black text-primary">{count}</span>
                                        </div>
                                        <p className="text-xs text-gray-400 font-bold mb-4">{count} cliente{count !== 1 ? 's' : ''}</p>
                                        <div className="flex gap-2">
                                            <button
                                                onClick={() => { setEditingLevel(lvl); setLevelForm({ name: lvl.name, label: lvl.label, color: lvl.color }); setShowLevelModal(true); }}
                                                className="flex-1 py-2 bg-soft text-gray-500 rounded-xl hover:bg-primary hover:text-white transition-all font-bold text-sm"
                                            >
                                                <Edit2 size={14} className="inline mr-1" /> Editar
                                            </button>
                                            <button
                                                onClick={() => handleDeleteLevel(lvl)}
                                                className="flex-1 py-2 bg-soft text-gray-500 rounded-xl hover:bg-red-500 hover:text-white transition-all font-bold text-sm"
                                            >
                                                <Trash2 size={14} className="inline mr-1" /> Excluir
                                            </button>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                )}
            </main>

            {/* Modal Editar Nível do Cliente */}
            {editingCustomer && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4 backdrop-blur-sm">
                    <div className="bg-white rounded-[3rem] p-10 max-w-sm w-full shadow-2xl">
                        <div className="flex justify-between items-center mb-6">
                            <h2 className="text-2xl font-black text-muted-text">Alterar Nível</h2>
                            <button onClick={() => setEditingCustomer(null)} className="p-2 hover:bg-soft rounded-xl"><X size={22} /></button>
                        </div>
                        <p className="text-gray-500 font-bold mb-6">{editingCustomer.full_name || 'Cliente'}</p>
                        <div className="space-y-3 mb-8">
                            {levels.map(l => (
                                <button
                                    key={l.id}
                                    onClick={() => setSelectedLevelId(l.id)}
                                    className={`w-full flex items-center gap-4 p-4 rounded-2xl border-2 transition-all ${selectedLevelId === l.id ? 'border-primary bg-primary/5' : 'border-gray-100 hover:border-gray-200'}`}
                                >
                                    <div className="w-6 h-6 rounded-full" style={{ backgroundColor: l.color }} />
                                    <span className="font-black text-muted-text">{l.label}</span>
                                    {selectedLevelId === l.id && <span className="ml-auto text-primary">✓</span>}
                                </button>
                            ))}
                        </div>
                        <div className="flex gap-3">
                            <Button variant="outline" className="flex-1 h-13 rounded-2xl" onClick={() => setEditingCustomer(null)} disabled={saving}>Cancelar</Button>
                            <Button className="flex-1 h-13 rounded-2xl shadow-vibrant" onClick={handleSaveCustomerLevel} disabled={saving}>
                                {saving ? <Loader2 size={18} className="animate-spin" /> : 'Salvar'}
                            </Button>
                        </div>
                    </div>
                </div>
            )}

            {/* Modal Criar/Editar Nível */}
            {showLevelModal && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4 backdrop-blur-sm">
                    <div className="bg-white rounded-[3rem] p-10 max-w-sm w-full shadow-2xl">
                        <div className="flex justify-between items-center mb-8">
                            <h2 className="text-2xl font-black text-muted-text">{editingLevel ? 'Editar Nível' : 'Novo Nível'}</h2>
                            <button onClick={() => setShowLevelModal(false)} className="p-2 hover:bg-soft rounded-xl"><X size={22} /></button>
                        </div>
                        <div className="space-y-5">
                            <div>
                                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest block mb-2">Nome do Nível</label>
                                <input
                                    type="text"
                                    placeholder="Ex: Ouro, Diamante, VIP..."
                                    value={levelForm.label}
                                    onChange={e => setLevelForm(f => ({ ...f, label: e.target.value, name: generateName(e.target.value) }))}
                                    className="w-full p-4 bg-soft rounded-2xl font-bold text-muted-text border-none"
                                />
                            </div>
                            <div>
                                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest block mb-2">Cor do Badge</label>
                                <div className="flex items-center gap-4">
                                    <input
                                        type="color"
                                        value={levelForm.color}
                                        onChange={e => setLevelForm(f => ({ ...f, color: e.target.value }))}
                                        className="w-14 h-14 rounded-2xl border-none cursor-pointer bg-soft p-1"
                                    />
                                    <span
                                        className="px-4 py-2 rounded-xl text-white font-black text-sm"
                                        style={{ backgroundColor: levelForm.color }}
                                    >
                                        {levelForm.label || 'Preview'}
                                    </span>
                                </div>
                            </div>
                        </div>
                        <div className="flex gap-3 mt-8">
                            <Button variant="outline" className="flex-1 h-13 rounded-2xl" onClick={() => setShowLevelModal(false)} disabled={savingLevel}>Cancelar</Button>
                            <Button className="flex-1 h-13 rounded-2xl shadow-vibrant" onClick={handleSaveLevel} disabled={savingLevel || !levelForm.label}>
                                {savingLevel ? <Loader2 size={18} className="animate-spin" /> : (editingLevel ? 'Atualizar' : 'Criar')}
                            </Button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
