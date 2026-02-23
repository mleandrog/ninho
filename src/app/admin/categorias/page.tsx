"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { AdminSidebar } from "@/components/admin/AdminSidebar";
import { Button } from "@/components/ui/Button";
import { Plus, Search, Edit2, Trash2, FolderTree, X, Loader2 } from "lucide-react";
import { toast } from "react-hot-toast";

export default function AdminCategoriesPage() {
    const [categories, setCategories] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState("");

    // CRUD states
    const [showModal, setShowModal] = useState(false);
    const [editingCategory, setEditingCategory] = useState<any>(null);
    const [saving, setSaving] = useState(false);
    const [formData, setFormData] = useState({ name: "", slug: "" });

    useEffect(() => {
        fetchCategories();
    }, []);

    const fetchCategories = async () => {
        setLoading(true);
        try {
            const { data, error } = await supabase
                .from("categories")
                .select("*")
                .order("name", { ascending: true });

            if (error) throw error;
            setCategories(data || []);
        } catch (error: any) {
            toast.error("Erro ao carregar categorias: " + error.message);
        } finally {
            setLoading(false);
        }
    };

    const generateSlug = (text: string) => {
        return text
            .toString()
            .normalize("NFD")
            .replace(/[\u0300-\u036f]/g, "")
            .toLowerCase()
            .trim()
            .replace(/\s+/g, "-")
            .replace(/[^\w-]+/g, "")
            .replace(/--+/g, "-");
    };

    const handleNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const name = e.target.value;
        setFormData({ name, slug: generateSlug(name) });
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setSaving(true);
        try {
            if (editingCategory) {
                const { error } = await supabase
                    .from("categories")
                    .update(formData)
                    .eq("id", editingCategory.id);
                if (error) throw error;
                toast.success("Categoria atualizada!");
            } else {
                const { error } = await supabase
                    .from("categories")
                    .insert([formData]);
                if (error) throw error;
                toast.success("Categoria criada!");
            }
            setShowModal(false);
            resetForm();
            fetchCategories();
        } catch (error: any) {
            toast.error("Erro ao salvar: " + error.message);
        } finally {
            setSaving(false);
        }
    };

    const handleEdit = (category: any) => {
        setEditingCategory(category);
        setFormData({ name: category.name, slug: category.slug });
        setShowModal(true);
    };

    const handleDelete = async (id: string) => {
        if (!confirm("Deseja realmente excluir esta categoria?")) return;
        const toastId = toast.loading("Excluindo...");
        try {
            const { error } = await supabase
                .from("categories")
                .delete()
                .eq("id", id);

            if (error) throw error;
            toast.success("Categoria excluída!", { id: toastId });
            fetchCategories();
        } catch (error: any) {
            console.error("Erro ao excluir:", error);
            let message = "Erro ao excluir: " + error.message;
            if (error.code === '23503') {
                message = "Não é possível excluir esta categoria pois ela possui produtos vinculados.";
            } else if (error.code === '42501') {
                message = "Você não tem permissão para excluir categorias.";
            }
            toast.error(message, { id: toastId });
        }
    };

    const resetForm = () => {
        setFormData({ name: "", slug: "" });
        setEditingCategory(null);
    };

    const filteredCategories = categories.filter((c) =>
        c.name.toLowerCase().includes(searchTerm.toLowerCase())
    );

    return (
        <div className="min-h-screen bg-soft flex">
            <AdminSidebar />

            <main className="flex-1 p-12 overflow-y-auto">
                <header className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 mb-12">
                    <div>
                        <h1 className="text-4xl font-black text-muted-text lowercase tracking-tighter">Gestão de Categorias</h1>
                        <p className="text-gray-400 font-bold mt-1">{categories.length} categorias cadastradas</p>
                    </div>
                    <Button
                        className="h-14 px-8 rounded-2xl gap-3 shadow-vibrant"
                        onClick={() => { resetForm(); setShowModal(true); }}
                    >
                        <Plus size={20} />
                        Nova Categoria
                    </Button>
                </header>

                <div className="bg-white rounded-[2.5rem] shadow-premium border border-white overflow-hidden">
                    <div className="p-8 border-b border-gray-50 flex flex-col md:flex-row gap-4 justify-between">
                        <div className="relative flex-1 max-w-md">
                            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
                            <input
                                type="text"
                                placeholder="Buscar categoria..."
                                className="w-full pl-12 pr-6 py-4 bg-soft rounded-2xl border-none focus:ring-2 focus:ring-primary/20 font-medium text-muted-text"
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                            />
                        </div>
                    </div>

                    <div className="overflow-x-auto">
                        <table className="w-full text-left border-collapse">
                            <thead>
                                <tr className="bg-soft/50">
                                    <th className="px-8 py-6 text-xs font-black text-gray-400 uppercase tracking-widest">Categoria</th>
                                    <th className="px-8 py-6 text-xs font-black text-gray-400 uppercase tracking-widest">Slug</th>
                                    <th className="px-8 py-6 text-xs font-black text-gray-400 uppercase tracking-widest text-center">Ações</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-50">
                                {loading ? (
                                    <tr>
                                        <td colSpan={3} className="px-8 py-20 text-center font-bold text-gray-400 animate-pulse">
                                            Carregando categorias...
                                        </td>
                                    </tr>
                                ) : filteredCategories.length === 0 ? (
                                    <tr>
                                        <td colSpan={3} className="px-8 py-20 text-center font-bold text-gray-400">
                                            Nenhuma categoria encontrada.
                                        </td>
                                    </tr>
                                ) : (
                                    filteredCategories.map((cat) => (
                                        <tr key={cat.id} className="hover:bg-soft/30 transition-colors group">
                                            <td className="px-8 py-6">
                                                <div className="flex items-center gap-4">
                                                    <div className="w-12 h-12 bg-soft rounded-xl flex items-center justify-center text-xl">
                                                        <FolderTree size={20} className="text-gray-400" />
                                                    </div>
                                                    <p className="font-black text-muted-text leading-tight">{cat.name}</p>
                                                </div>
                                            </td>
                                            <td className="px-8 py-6">
                                                <code className="text-xs bg-soft px-3 py-1 rounded-lg text-gray-500 font-bold">
                                                    {cat.slug}
                                                </code>
                                            </td>
                                            <td className="px-8 py-6">
                                                <div className="flex items-center justify-center gap-2">
                                                    <button
                                                        onClick={() => handleEdit(cat)}
                                                        className="p-3 bg-soft text-gray-500 rounded-xl hover:bg-primary hover:text-white transition-all shadow-sm"
                                                    >
                                                        <Edit2 size={18} />
                                                    </button>
                                                    <button
                                                        onClick={() => handleDelete(cat.id)}
                                                        className="p-3 bg-soft text-gray-500 rounded-xl hover:bg-red-500 hover:text-white transition-all shadow-sm"
                                                    >
                                                        <Trash2 size={18} />
                                                    </button>
                                                </div>
                                            </td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            </main>

            {/* Modal de CRUD */}
            {showModal && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4 backdrop-blur-sm">
                    <div className="bg-white rounded-[3rem] p-10 max-w-md w-full shadow-2xl">
                        <div className="flex justify-between items-center mb-8">
                            <h2 className="text-3xl font-black text-muted-text">
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
                                    type="text"
                                    required
                                    className="w-full p-4 bg-soft rounded-2xl border-none font-bold text-muted-text"
                                    value={formData.name}
                                    onChange={handleNameChange}
                                    placeholder="Ex: Roupas de Bebê"
                                />
                            </div>

                            <div className="space-y-2">
                                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Slug (URL amigável)</label>
                                <input
                                    type="text"
                                    required
                                    className="w-full p-4 bg-soft rounded-2xl border-none font-bold text-gray-500 cursor-not-allowed"
                                    value={formData.slug}
                                    readOnly
                                />
                            </div>

                            <div className="flex gap-4 pt-4">
                                <Button type="button" variant="outline" className="flex-1 h-14 rounded-2xl font-black lowercase" onClick={() => setShowModal(false)} disabled={saving}>
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
