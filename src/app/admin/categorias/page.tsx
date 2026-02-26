"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
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
            <header className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 sm:gap-6 mb-6 sm:mb-8 lg:mb-10">
                <div>
                    <h1 className="text-2xl sm:text-3xl lg:text-4xl font-black text-muted-text lowercase tracking-tighter">Categorias</h1>
                    <p className="text-[9px] sm:text-xs lg:text-sm text-gray-400 font-bold mt-0.5 uppercase tracking-widest leading-tight">{categories.length} cadastradas</p>
                </div>
                <Button className="w-full sm:w-auto h-11 sm:h-14 px-6 sm:px-8 rounded-xl sm:rounded-2xl gap-2 sm:gap-3 shadow-vibrant font-black text-[10px] sm:text-xs uppercase tracking-widest whitespace-nowrap" onClick={() => handleOpenModal()}>
                    <Plus size={16} className="sm:w-5 sm:h-5" /> Nova Categoria
                </Button>
            </header>

            <div className="bg-white p-3 sm:p-4 lg:p-6 rounded-xl sm:rounded-2xl lg:rounded-[2.5rem] shadow-premium border border-white mb-4 sm:mb-6 lg:mb-8">
                <div className="relative max-w-md">
                    <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" size={14} />
                    <input
                        type="text"
                        placeholder="Buscar categoria..."
                        className="w-full pl-9 pr-4 py-2 sm:py-2.5 lg:py-3 bg-soft rounded-lg sm:rounded-xl lg:rounded-2xl border-none font-bold text-[10px] sm:text-xs lg:text-sm text-muted-text outline-none"
                        value={searchTerm}
                        onChange={e => setSearchTerm(e.target.value)}
                    />
                </div>
            </div>

            <div className="bg-white rounded-2xl sm:rounded-3xl lg:rounded-[2.5rem] shadow-premium border border-white overflow-hidden">
                <div className="flex flex-col">
                    {loading ? (
                        <div className="px-8 py-20 text-center font-bold text-gray-400 animate-pulse">Carregando...</div>
                    ) : filtered.length === 0 ? (
                        <div className="px-8 py-20 text-center font-bold text-gray-400">Nenhuma encontrada.</div>
                    ) : filtered.map(cat => (
                        <div
                            key={cat.id}
                            className="dense-row group lg:grid lg:grid-cols-[1fr_1.5fr_auto] lg:gap-6 lg:py-4 lg:px-10 lg:items-center border-b border-gray-50 last:border-0 hover:bg-soft/30 transition-colors"
                        >
                            {/* Nome & Slug */}
                            <div className="flex items-center gap-3 sm:gap-4 min-w-0">
                                <div className="w-8 h-8 sm:w-10 sm:h-10 lg:w-12 lg:h-12 bg-soft rounded-lg sm:rounded-xl lg:rounded-2xl flex items-center justify-center shrink-0">
                                    <FolderTree size={14} className="text-gray-400 sm:w-4 sm:h-4 lg:w-5 lg:h-5" />
                                </div>
                                <div className="min-w-0">
                                    <p className="font-black text-muted-text text-[11px] sm:text-sm lg:text-base truncate leading-tight group-hover:text-primary transition-colors">{cat.name}</p>
                                    <code className="text-[7.5px] sm:text-[9px] lg:text-[10px] bg-soft px-1.5 py-0.5 rounded-md text-gray-400 font-bold leading-none mt-1">{cat.slug}</code>
                                </div>
                            </div>

                            {/* Acesso */}
                            <div className="flex flex-wrap items-center gap-1.5 lg:gap-2 justify-end lg:justify-start">
                                {(!cat.allowed_levels || cat.allowed_levels.length === 0) ? (
                                    <span className="flex items-center gap-1 text-green-500 font-black text-[7.5px] sm:text-[9px] lg:text-[10px] uppercase tracking-widest leading-none">
                                        <Globe size={10} className="sm:w-3 sm:h-3" /> Pública
                                    </span>
                                ) : (
                                    <>
                                        <Lock size={10} className="text-gray-300 sm:w-3 sm:h-3" />
                                        {cat.allowed_levels.map(lid => {
                                            const lvl = levels.find(l => l.id === lid);
                                            return lvl ? (
                                                <span key={lid} className="px-1.5 py-0.5 rounded-md text-white text-[7.5px] sm:text-[9px] lg:text-[10px] font-black uppercase tracking-widest shadow-sm leading-none" style={{ backgroundColor: lvl.color }}>
                                                    {lvl.label}
                                                </span>
                                            ) : null;
                                        })}
                                    </>
                                )}
                            </div>

                            {/* Ações */}
                            <div className="flex items-center justify-end gap-1.5 sm:gap-2 ml-2">
                                <button
                                    onClick={() => handleOpenModal(cat)}
                                    className="w-7 h-7 sm:w-8 sm:h-8 lg:w-10 lg:h-10 bg-soft text-gray-400 rounded-lg lg:rounded-xl hover:bg-primary hover:text-white transition-all shadow-sm flex items-center justify-center shrink-0"
                                >
                                    <Edit2 size={12} className="sm:w-3.5 sm:h-3.5" />
                                </button>
                                <button
                                    onClick={() => handleDelete(cat.id)}
                                    className="w-7 h-7 sm:w-8 sm:h-8 lg:w-10 lg:h-10 bg-soft text-gray-400 rounded-lg lg:rounded-xl hover:bg-red-500 hover:text-white transition-all shadow-sm flex items-center justify-center shrink-0"
                                >
                                    <Trash2 size={12} className="sm:w-3.5 sm:h-3.5" />
                                </button>
                            </div>
                        </div>
                    ))}
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

                        <form onSubmit={handleSubmit} className="space-y-5 sm:space-y-6">
                            <div className="space-y-2">
                                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Nome da Categoria</label>
                                <input
                                    type="text" required
                                    className="w-full p-3 sm:p-4 bg-soft rounded-xl sm:rounded-2xl border-none font-bold text-muted-text outline-none text-sm"
                                    value={formData.name}
                                    onChange={handleNameChange}
                                    placeholder="Ex: Roupas de Bebê"
                                />
                            </div>
                            <div className="space-y-2">
                                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Slug (URL)</label>
                                <input
                                    type="text" required readOnly
                                    className="w-full p-3 sm:p-4 bg-soft rounded-xl sm:rounded-2xl border-none font-bold text-gray-400 cursor-not-allowed text-[10px] uppercase sm:text-xs"
                                    value={formData.slug}
                                />
                            </div>

                            {/* Controle de Acesso por Nível */}
                            <div className="space-y-3">
                                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest block">
                                    Acesso Restrito
                                </label>
                                <div className="space-y-1.5 sm:space-y-2">
                                    {levels.map(lvl => (
                                        <label key={lvl.id} className="flex items-center gap-3 p-2.5 sm:p-3 rounded-xl sm:rounded-2xl hover:bg-soft cursor-pointer transition-colors border border-transparent hover:border-gray-100">
                                            <input
                                                type="checkbox"
                                                checked={selectedLevelIds.includes(lvl.id)}
                                                onChange={() => toggleLevel(lvl.id)}
                                                className="w-4 h-4 sm:w-5 sm:h-5 rounded accent-primary"
                                            />
                                            <span className="w-2.5 h-2.5 sm:w-3 sm:h-3 rounded-full shrink-0" style={{ backgroundColor: lvl.color }} />
                                            <span className="font-black text-muted-text text-xs sm:text-sm">{lvl.label}</span>
                                        </label>
                                    ))}
                                </div>
                                {selectedLevelIds.length > 0 && (
                                    <p className="text-[9px] sm:text-xs text-amber-500 font-bold flex items-center gap-1 mt-2">
                                        <Lock size={12} /> Visível apenas para níveis selecionados
                                    </p>
                                )}
                            </div>

                            <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 pt-4 mb-2">
                                <Button type="button" variant="outline" className="h-12 sm:h-14 rounded-xl sm:rounded-2xl font-black uppercase text-[10px] sm:text-xs" onClick={() => setShowModal(false)} disabled={saving}>
                                    Cancelar
                                </Button>
                                <Button type="submit" className="flex-1 h-12 sm:h-14 rounded-xl sm:rounded-2xl shadow-vibrant font-black uppercase text-[10px] sm:text-xs gap-2" disabled={saving}>
                                    {saving ? <Loader2 className="animate-spin" size={16} /> : (editingCategory ? "Atualizar" : "Cadastrar")}
                                </Button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}
