"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { AdminSidebar } from "@/components/admin/AdminSidebar";
import { Button } from "@/components/ui/Button";
import { Plus, Search, Edit2, Trash2, FolderTree, X, Loader2, Lock, Globe } from "lucide-react";
import { toast } from "react-hot-toast";

type Level = { id: string; name: string; label: string; color: string };
type Category = { id: number; name: string; slug: string; allowed_levels?: string[] };

export default function AdminCategoriesPage() {
    const [categories, setCategories] = useState<Category[]>([]);
    const [levels, setLevels] = useState<Level[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState("");

    const [showModal, setShowModal] = useState(false);
    const [editingCategory, setEditingCategory] = useState<Category | null>(null);
    const [saving, setSaving] = useState(false);
    const [formData, setFormData] = useState({ name: "", slug: "" });
    const [selectedLevelIds, setSelectedLevelIds] = useState<string[]>([]);

    useEffect(() => {
        fetchLevels();
        fetchCategories();
    }, []);

    const fetchLevels = async () => {
        const { data } = await supabase.from("customer_levels").select("*").order("created_at");
        setLevels(data || []);
    };

    const fetchCategories = async () => {
        setLoading(true);
        try {
            const { data: cats } = await supabase.from("categories").select("*").order("name");
            const { data: accesses } = await supabase.from("category_level_access").select("category_id, level_id");

            const mapped = (cats || []).map((c: any) => ({
                ...c,
                allowed_levels: accesses?.filter(a => a.category_id === c.id).map(a => a.level_id) || [],
            }));
            setCategories(mapped);
        } catch (e: any) {
            toast.error("Erro ao carregar categorias: " + e.message);
        } finally {
            setLoading(false);
        }
    };

    const generateSlug = (text: string) =>
        text.toString().normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().trim()
            .replace(/\s+/g, "-").replace(/[^\w-]+/g, "").replace(/--+/g, "-");

    const handleNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const name = e.target.value;
        setFormData({ name, slug: generateSlug(name) });
    };

    const toggleLevel = (id: string) => {
        setSelectedLevelIds(prev =>
            prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
        );
    };

    const handleOpenModal = (cat?: Category) => {
        if (cat) {
            setEditingCategory(cat);
            setFormData({ name: cat.name, slug: cat.slug });
            setSelectedLevelIds(cat.allowed_levels || []);
        } else {
            setEditingCategory(null);
            setFormData({ name: "", slug: "" });
            setSelectedLevelIds([]);
        }
        setShowModal(true);
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setSaving(true);
        try {
            let catId: number;

            if (editingCategory) {
                await supabase.from("categories").update(formData).eq("id", editingCategory.id);
                catId = editingCategory.id;
            } else {
                const { data, error } = await supabase.from("categories").insert([formData]).select().single();
                if (error) throw error;
                catId = data.id;
            }

            // Sync níveis de acesso
            await supabase.from("category_level_access").delete().eq("category_id", catId);
            if (selectedLevelIds.length > 0) {
                await supabase.from("category_level_access").insert(
                    selectedLevelIds.map(lid => ({ category_id: catId, level_id: lid }))
                );
            }

            toast.success(editingCategory ? "Categoria atualizada!" : "Categoria criada!");
            setShowModal(false);
            fetchCategories();
        } catch (e: any) {
            toast.error("Erro ao salvar: " + e.message);
        } finally {
            setSaving(false);
        }
    };

    const handleDelete = async (id: number) => {
        if (!confirm("Deseja realmente excluir esta categoria?")) return;
        const toastId = toast.loading("Excluindo...");
        try {
            await supabase.from("category_level_access").delete().eq("category_id", id);
            const { error } = await supabase.from("categories").delete().eq("id", id);
            if (error) throw error;
            toast.success("Categoria excluída!", { id: toastId });
            fetchCategories();
        } catch (e: any) {
            let msg = "Erro ao excluir: " + e.message;
            if (e.code === '23503') msg = "Não é possível excluir: há produtos vinculados.";
            toast.error(msg, { id: toastId });
        }
    };

    const filtered = categories.filter(c =>
        c.name.toLowerCase().includes(searchTerm.toLowerCase())
    );

    return (
        <div className="animate-in fade-in duration-500">
            <header className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-6 mb-10 lg:mb-12">
                <div>
                    <h1 className="text-3xl lg:text-4xl font-black text-muted-text lowercase tracking-tighter">Gestão de Categorias</h1>
                    <p className="text-gray-400 font-bold mt-1">{categories.length} categorias cadastradas</p>
                </div>
                <Button className="w-full sm:w-auto h-14 px-8 rounded-2xl gap-3 shadow-vibrant" onClick={() => handleOpenModal()}>
                    <Plus size={20} /> Nova Categoria
                </Button>
            </header>

            <div className="bg-white rounded-3xl lg:rounded-[2.5rem] shadow-premium border border-white overflow-hidden">
                <div className="p-6 lg:p-8 border-b border-gray-50">
                    <div className="relative max-w-md">
                        <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
                        <input
                            type="text"
                            placeholder="Buscar categoria..."
                            className="w-full pl-12 pr-6 py-4 bg-soft rounded-2xl border-none focus:ring-2 focus:ring-primary/20 font-medium text-muted-text"
                            value={searchTerm}
                            onChange={e => setSearchTerm(e.target.value)}
                        />
                    </div>
                </div>

                <div className="overflow-x-auto scrollbar-thin scrollbar-thumb-gray-200">
                    <table className="w-full text-left border-collapse min-w-[700px]">
                        <thead>
                            <tr className="bg-soft/50">
                                <th className="px-6 lg:px-8 py-6 text-xs font-black text-gray-400 uppercase tracking-widest">Categoria</th>
                                <th className="px-6 lg:px-8 py-6 text-xs font-black text-gray-400 uppercase tracking-widest">Acesso</th>
                                <th className="px-6 lg:px-8 py-6 text-xs font-black text-gray-400 uppercase tracking-widest text-center">Ações</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-50">
                            {loading ? (
                                <tr><td colSpan={3} className="px-8 py-20 text-center font-bold text-gray-400 animate-pulse">Carregando categorias...</td></tr>
                            ) : filtered.length === 0 ? (
                                <tr><td colSpan={3} className="px-8 py-20 text-center font-bold text-gray-400">Nenhuma categoria encontrada.</td></tr>
                            ) : filtered.map(cat => (
                                <tr key={cat.id} className="hover:bg-soft/30 transition-colors group">
                                    <td className="px-6 lg:px-8 py-6">
                                        <div className="flex items-center gap-4">
                                            <div className="w-12 h-12 bg-soft rounded-xl flex items-center justify-center shrink-0">
                                                <FolderTree size={20} className="text-gray-400" />
                                            </div>
                                            <div className="min-w-0">
                                                <p className="font-black text-muted-text truncate">{cat.name}</p>
                                                <code className="text-xs bg-soft px-2 py-0.5 rounded-lg text-gray-500 font-bold">{cat.slug}</code>
                                            </div>
                                        </div>
                                    </td>
                                    <td className="px-6 lg:px-8 py-6">
                                        {(!cat.allowed_levels || cat.allowed_levels.length === 0) ? (
                                            <span className="flex items-center gap-2 text-green-500 font-bold text-sm">
                                                <Globe size={14} /> Pública
                                            </span>
                                        ) : (
                                            <div className="flex flex-wrap gap-2">
                                                <Lock size={14} className="text-gray-400 mt-1" />
                                                {cat.allowed_levels.map(lid => {
                                                    const lvl = levels.find(l => l.id === lid);
                                                    return lvl ? (
                                                        <span key={lid} className="px-2 py-0.5 rounded-lg text-white text-xs font-black" style={{ backgroundColor: lvl.color }}>
                                                            {lvl.label}
                                                        </span>
                                                    ) : null;
                                                })}
                                            </div>
                                        )}
                                    </td>
                                    <td className="px-6 lg:px-8 py-6">
                                        <div className="flex items-center justify-center gap-2">
                                            <button onClick={() => handleOpenModal(cat)} className="p-3 bg-soft text-gray-500 rounded-xl hover:bg-primary hover:text-white transition-all shadow-sm">
                                                <Edit2 size={18} />
                                            </button>
                                            <button onClick={() => handleDelete(cat.id)} className="p-3 bg-soft text-gray-500 rounded-xl hover:bg-red-500 hover:text-white transition-all shadow-sm">
                                                <Trash2 size={18} />
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>

            {showModal && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-0 sm:p-4 backdrop-blur-sm">
                    <div className="bg-white sm:rounded-[3rem] p-6 lg:p-10 w-full max-w-md h-full sm:h-auto overflow-y-auto shadow-2xl relative">
                        <div className="flex justify-between items-center mb-8 sticky top-0 bg-white z-10 pb-2">
                            <h2 className="text-2xl lg:text-3xl font-black text-muted-text">
                                {editingCategory ? "Editar Categoria" : "Nova Categoria"}
                            </h2>
                            <button onClick={() => setShowModal(false)} className="p-2 hover:bg-soft rounded-xl transition-colors">
                                <X size={24} />
                            </button>
                        </div>

                        <form onSubmit={handleSubmit} className="space-y-6">
                            <div className="space-y-2">
                                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Nome da Categoria</label>
                                <input
                                    type="text" required
                                    className="w-full p-4 bg-soft rounded-2xl border-none font-bold text-muted-text"
                                    value={formData.name}
                                    onChange={handleNameChange}
                                    placeholder="Ex: Roupas de Bebê"
                                />
                            </div>
                            <div className="space-y-2">
                                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Slug (URL)</label>
                                <input
                                    type="text" required readOnly
                                    className="w-full p-4 bg-soft rounded-2xl border-none font-bold text-gray-500 cursor-not-allowed"
                                    value={formData.slug}
                                />
                            </div>

                            {/* Controle de Acesso por Nível */}
                            <div className="space-y-3">
                                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest block">
                                    Acesso Restrito (vazio = pública para todos)
                                </label>
                                <div className="space-y-2">
                                    {levels.map(lvl => (
                                        <label key={lvl.id} className="flex items-center gap-3 p-3 rounded-2xl hover:bg-soft cursor-pointer transition-colors">
                                            <input
                                                type="checkbox"
                                                checked={selectedLevelIds.includes(lvl.id)}
                                                onChange={() => toggleLevel(lvl.id)}
                                                className="w-5 h-5 rounded accent-primary"
                                            />
                                            <span className="w-3 h-3 rounded-full shrink-0" style={{ backgroundColor: lvl.color }} />
                                            <span className="font-black text-muted-text">{lvl.label}</span>
                                        </label>
                                    ))}
                                </div>
                                {selectedLevelIds.length > 0 && (
                                    <p className="text-xs text-amber-500 font-bold flex items-center gap-1">
                                        <Lock size={12} /> Visível apenas para os níveis selecionados
                                    </p>
                                )}
                            </div>

                            <div className="flex flex-col sm:flex-row gap-4 pt-2">
                                <Button type="button" variant="outline" className="h-14 rounded-2xl font-black lowercase" onClick={() => setShowModal(false)} disabled={saving}>
                                    Cancelar
                                </Button>
                                <Button type="submit" className="flex-1 h-14 rounded-2xl shadow-vibrant font-black lowercase gap-2" disabled={saving}>
                                    {saving ? <Loader2 className="animate-spin" size={20} /> : (editingCategory ? "Atualizar" : "Cadastrar")}
                                </Button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}
