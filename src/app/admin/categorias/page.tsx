"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { Button } from "@/components/ui/Button";
import { Plus, Search, Edit2, Trash2, FolderTree, X, Loader2, Lock, Globe } from "lucide-react";
import { toast } from "react-hot-toast";
import { ConfirmModal } from "@/components/ui/ConfirmModal";

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
    const [confirmModal, setConfirmModal] = useState<{
        isOpen: boolean;
        title: string;
        message: string;
        onConfirm: () => void;
        type: "danger" | "info";
    }>({
        isOpen: false,
        title: "",
        message: "",
        onConfirm: () => { },
        type: "info"
    });

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

    const handleDelete = (id: number) => {
        setConfirmModal({
            isOpen: true,
            title: "Excluir Categoria",
            message: "Deseja realmente excluir esta categoria? Os produtos vinculados podem ficar sem categoria.",
            type: "danger",
            onConfirm: () => executeDelete(id)
        });
    };

    const executeDelete = async (id: number) => {
        setConfirmModal(prev => ({ ...prev, isOpen: false }));
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
                <div className="flex flex-col divide-y divide-gray-50">
                    {loading ? (
                        <div className="px-8 py-20 text-center flex flex-col items-center gap-4">
                            <Loader2 className="w-8 h-8 text-primary animate-spin" />
                            <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Carregando categorias...</span>
                        </div>
                    ) : filtered.length === 0 ? (
                        <div className="px-8 py-20 text-center flex flex-col items-center gap-4">
                            <FolderTree size={40} className="text-gray-100" />
                            <span className="text-sm font-bold text-gray-400">Nenhuma categoria encontrada.</span>
                        </div>
                    ) : filtered.map(cat => (
                        <div
                            key={cat.id}
                            className="group flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 sm:p-6 lg:px-10 hover:bg-soft/30 transition-all duration-300"
                        >
                            {/* Info Principal */}
                            <div className="flex items-center gap-4 min-w-0">
                                <div className="w-10 h-10 sm:w-12 sm:h-12 bg-soft rounded-xl sm:rounded-2xl flex items-center justify-center shrink-0 group-hover:bg-white group-hover:shadow-sm transition-all">
                                    <FolderTree size={16} className="text-gray-400 group-hover:text-primary transition-colors" />
                                </div>
                                <div className="min-w-0">
                                    <div className="flex flex-wrap items-center gap-2">
                                        <p className="font-black text-muted-text text-sm sm:text-base lg:text-lg truncate leading-tight group-hover:text-primary transition-colors">
                                            {cat.name}
                                        </p>

                                        {/* Badge de Acesso Mobile/Inline */}
                                        <div className="flex items-center gap-1.5">
                                            {(!cat.allowed_levels || cat.allowed_levels.length === 0) ? (
                                                <span className="flex items-center gap-1 text-[8px] sm:text-[10px] font-black text-green-500 uppercase tracking-widest bg-green-50 px-2 py-0.5 rounded-full border border-green-100">
                                                    <Globe size={10} /> Pública
                                                </span>
                                            ) : (
                                                <div className="flex items-center gap-1 bg-amber-50 px-2 py-0.5 rounded-full border border-amber-100">
                                                    <Lock size={10} className="text-amber-500" />
                                                    <span className="text-[8px] sm:text-[10px] font-black text-amber-500 uppercase tracking-widest">
                                                        Restrita ({cat.allowed_levels.length})
                                                    </span>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-2 mt-1">
                                        <code className="text-[8px] sm:text-[10px] bg-soft group-hover:bg-white px-2 py-0.5 rounded-md text-gray-400 font-black leading-none uppercase tracking-wider">
                                            /{cat.slug}
                                        </code>
                                    </div>
                                </div>
                            </div>

                            {/* Detalhes de Níveis (Desktop) */}
                            {cat.allowed_levels && cat.allowed_levels.length > 0 && (
                                <div className="hidden lg:flex flex-wrap items-center gap-2 flex-1 justify-center px-4">
                                    {cat.allowed_levels.map(lid => {
                                        const lvl = levels.find(l => l.id === lid);
                                        return lvl ? (
                                            <span
                                                key={lid}
                                                className="px-2.5 py-1 rounded-lg text-white text-[9px] font-black uppercase tracking-widest shadow-sm hover:scale-105 transition-transform cursor-default"
                                                style={{ backgroundColor: lvl.color }}
                                            >
                                                {lvl.label}
                                            </span>
                                        ) : null;
                                    })}
                                </div>
                            )}

                            {/* Ações */}
                            <div className="flex items-center justify-end gap-2 shrink-0">
                                <button
                                    onClick={() => handleOpenModal(cat)}
                                    className="w-10 h-10 lg:w-12 lg:h-12 bg-soft text-gray-400 rounded-xl lg:rounded-2xl hover:bg-primary hover:text-white transition-all shadow-sm flex items-center justify-center hover:scale-110 active:scale-95"
                                    title="Editar"
                                >
                                    <Edit2 size={16} />
                                </button>
                                <button
                                    onClick={() => handleDelete(cat.id)}
                                    className="w-10 h-10 lg:w-12 lg:h-12 bg-soft text-gray-400 rounded-xl lg:rounded-2xl hover:bg-red-500 hover:text-white transition-all shadow-sm flex items-center justify-center hover:scale-110 active:scale-95"
                                    title="Excluir"
                                >
                                    <Trash2 size={16} />
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
            {confirmModal.isOpen && (
                <ConfirmModal
                    isOpen={confirmModal.isOpen}
                    title={confirmModal.title}
                    message={confirmModal.message}
                    type={confirmModal.type}
                    onClose={() => setConfirmModal(prev => ({ ...prev, isOpen: false }))}
                    onConfirm={confirmModal.onConfirm}
                />
            )}
        </div>
    );
}
