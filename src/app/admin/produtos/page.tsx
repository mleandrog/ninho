"use client";

import { useEffect, useState, useRef } from "react";
import { supabase } from "@/lib/supabase";
import { AdminSidebar } from "@/components/admin/AdminSidebar";
import { Button } from "@/components/ui/Button";
import { Plus, Search, Edit2, Trash2, X, MessageSquare, Upload, Loader2, Image as ImageIcon, Info } from "lucide-react";
import { toast } from "react-hot-toast";

export default function AdminProductsPage() {
    const [products, setProducts] = useState<any[]>([]);
    const [categories, setCategories] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState("");
    const [showModal, setShowModal] = useState(false);
    const [editingProduct, setEditingProduct] = useState<any>(null);
    const [uploading, setUploading] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const SIZES = ['RN', 'P', 'M', 'G', 'GG', 'Outros'];

    const [formData, setFormData] = useState({
        name: "",
        description: "",
        price: 0,
        category_id: "",
        image_url: "",
        is_featured: false,
        whatsapp_exclusive: false,
        size: "",
    });
    const [customSize, setCustomSize] = useState("");

    const [imagePreview, setImagePreview] = useState<string>("");
    const [selectedFile, setSelectedFile] = useState<File | null>(null);

    useEffect(() => {
        fetchProducts();
        fetchCategories();
    }, []);

    const fetchProducts = async () => {
        setLoading(true);
        try {
            const { data, error } = await supabase
                .from("products")
                .select("*, categories(name)")
                .order("created_at", { ascending: false });

            if (error) throw error;
            setProducts(data || []);
        } catch (error: any) {
            toast.error("Erro ao carregar produtos: " + error.message);
        } finally {
            setLoading(false);
        }
    };

    const fetchCategories = async () => {
        const { data } = await supabase.from("categories").select("*");
        setCategories(data || []);
    };

    const compressImage = (file: File, size?: string): Promise<Blob> => {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.readAsDataURL(file);
            reader.onload = (event) => {
                const img = new Image();
                img.src = event.target?.result as string;
                img.onload = async () => {
                    const canvas = document.createElement('canvas');
                    let width = img.width;
                    let height = img.height;

                    // Redimensionar para no máximo 1600px (alta qualidade)
                    const max = 1600;
                    if (width > height && width > max) {
                        height = (height * max) / width;
                        width = max;
                    } else if (height > max) {
                        width = (width * max) / height;
                        height = max;
                    }

                    canvas.width = width;
                    canvas.height = height;
                    const ctx = canvas.getContext('2d', { alpha: false });
                    if (!ctx) return reject(new Error("Contexto não encontrado"));

                    // Alta qualidade de suavização global
                    ctx.imageSmoothingEnabled = true;
                    ctx.imageSmoothingQuality = 'high';

                    ctx.drawImage(img, 0, 0, width, height);

                    // Adicionar Branding (Logo + Tamanho) se houver tamanho
                    if (size) {
                        try {
                            const logo = new Image();
                            logo.src = '/logo-ninho.png';
                            await new Promise((res) => {
                                logo.onload = res;
                                logo.onerror = res;
                            });

                            if (logo.complete && logo.naturalWidth > 0) {
                                // Configurações do Overlay
                                const ovHeight = height * 0.20; // 20% da altura
                                const ovWidth = ovHeight * 2.6;
                                const x = 30;
                                const y = height - ovHeight - 30;
                                const radius = ovHeight * 0.28;

                                // Desenhar Retângulo Branco Arredondado
                                ctx.save();
                                ctx.shadowColor = 'rgba(0,0,0,0.1)';
                                ctx.shadowBlur = 20;
                                ctx.shadowOffsetX = 0;
                                ctx.shadowOffsetY = 10;

                                ctx.fillStyle = 'white';
                                ctx.beginPath();
                                ctx.moveTo(x + radius, y);
                                ctx.lineTo(x + ovWidth - radius, y);
                                ctx.quadraticCurveTo(x + ovWidth, y, x + ovWidth, y + radius);
                                ctx.lineTo(x + ovWidth, y + ovHeight - radius);
                                ctx.quadraticCurveTo(x + ovWidth, y + ovHeight, x + ovWidth - radius, y + ovHeight);
                                ctx.lineTo(x + radius, y + ovHeight);
                                ctx.quadraticCurveTo(x, y + ovHeight, x, y + ovHeight - radius);
                                ctx.lineTo(x, y + radius);
                                ctx.quadraticCurveTo(x, y, x + radius, y);
                                ctx.closePath();
                                ctx.fill();
                                ctx.restore();

                                // Desenhar a Logo com suavização máxima
                                const logoPadding = ovHeight * 0.12;
                                const logoSize = ovHeight - (logoPadding * 2);
                                ctx.save();
                                ctx.imageSmoothingEnabled = true;
                                ctx.imageSmoothingQuality = 'high';
                                ctx.drawImage(logo, x + logoPadding, y + logoPadding, logoSize, logoSize);
                                ctx.restore();

                                // Desenhar o Texto do Tamanho (Arial garantida = sem variação)
                                ctx.fillStyle = '#C4A484';
                                const fontSize = Math.round(ovHeight * 0.52);
                                ctx.font = `900 ${fontSize}px Arial, Helvetica, sans-serif`;
                                ctx.textAlign = 'left';
                                ctx.textBaseline = 'middle';
                                ctx.fillText(size, x + logoSize + (logoPadding * 2.2), y + (ovHeight / 2));
                            }
                        } catch (err) {
                            console.error("Erro ao processar branding:", err);
                        }
                    }

                    canvas.toBlob((blob) => {
                        if (blob) resolve(blob);
                        else reject(new Error("Erro na compressão"));
                    }, 'image/jpeg', 0.92); // 92% qualidade
                };
            };
            reader.onerror = (error) => reject(error);
        });
    };

    const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            setSelectedFile(file);
            setImagePreview(URL.createObjectURL(file));
        }
    };

    const uploadImage = async (file: File, size?: string): Promise<string> => {
        const compressedBlob = await compressImage(file, size);
        const fileName = `${Date.now()}-${file.name}`;
        const filePath = `products/${fileName}`;

        const { error: uploadError } = await supabase.storage
            .from('products')
            .upload(filePath, compressedBlob);

        if (uploadError) throw uploadError;

        const { data } = supabase.storage
            .from('products')
            .getPublicUrl(filePath);

        return data.publicUrl;
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setUploading(true);

        try {
            let finalImageUrl = formData.image_url;

            if (selectedFile) {
                const toastId = toast.loading("Gerando branding e enviando imagem...");
                try {
                    const sizeToUse = formData.size === 'Outros' ? customSize : formData.size;
                    finalImageUrl = await uploadImage(selectedFile, sizeToUse);
                    toast.success("Imagem enviada!", { id: toastId });
                } catch (err: any) {
                    toast.error("Erro no upload da imagem: " + err.message, { id: toastId });
                    setUploading(false);
                    return;
                }
            }

            const productData = {
                ...formData,
                image_url: finalImageUrl,
                available_in_store: !formData.whatsapp_exclusive,
                whatsapp_campaign_completed: false,
                size: formData.size === 'Outros' ? customSize : formData.size,
            };

            if (editingProduct) {
                const { error } = await supabase
                    .from("products")
                    .update(productData)
                    .eq("id", editingProduct.id);
                if (error) throw error;
                toast.success("Produto atualizado!");
            } else {
                const { error } = await supabase
                    .from("products")
                    .insert([productData]);
                if (error) throw error;
                toast.success("Produto cadastrado!");
            }

            setShowModal(false);
            resetForm();
            fetchProducts();
        } catch (error: any) {
            toast.error("Erro ao salvar produto: " + error.message);
        } finally {
            setUploading(false);
        }
    };

    const handleEdit = (product: any) => {
        setEditingProduct(product);
        const isCustom = product.size && !SIZES.slice(0, -1).includes(product.size);
        setFormData({
            name: product.name,
            description: product.description || "",
            price: product.price,
            category_id: product.category_id,
            image_url: product.image_url || "",
            is_featured: product.is_featured || false,
            whatsapp_exclusive: product.whatsapp_exclusive || false,
            size: isCustom ? 'Outros' : (product.size || ''),
        });
        if (isCustom) setCustomSize(product.size);
        setImagePreview(product.image_url || "");
        setSelectedFile(null);
        setShowModal(true);
    };

    const handleDelete = async (id: number) => {
        if (!confirm("Deseja realmente excluir este produto?")) return;

        const toastId = toast.loading("Excluindo produto...");
        try {
            const { error } = await supabase
                .from("products")
                .delete()
                .eq("id", id);

            if (error) throw error;

            toast.success("Produto excluído!", { id: toastId });
            fetchProducts();
        } catch (error: any) {
            console.error("Erro ao excluir:", error);
            let message = "Erro ao excluir: " + error.message;
            if (error.code === '23503') {
                message = "Não é possível excluir este produto pois ele possui pedidos ou itens de sacola vinculados.";
            } else if (error.code === '42501') {
                message = "Você não tem permissão para excluir produtos.";
            }
            toast.error(message, { id: toastId });
        }
    };

    const resetForm = () => {
        setFormData({
            name: "",
            description: "",
            price: 0,
            category_id: "",
            image_url: "",
            is_featured: false,
            whatsapp_exclusive: false,
            size: "",
        });
        setCustomSize("");
        setImagePreview("");
        setSelectedFile(null);
        setEditingProduct(null);
    };

    const filteredProducts = products.filter((p) =>
        p.name.toLowerCase().includes(searchTerm.toLowerCase())
    );

    return (
        <div className="animate-in fade-in duration-500">
            <header className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-6 mb-10 lg:mb-12">
                <div>
                    <h1 className="text-3xl lg:text-4xl font-black text-muted-text lowercase tracking-tighter">Produtos</h1>
                    <p className="text-gray-400 font-bold mt-1">{products.length} itens cadastrados no catálogo</p>
                </div>
                <Button
                    className="w-full sm:w-auto h-14 px-8 rounded-2xl gap-3 shadow-vibrant"
                    onClick={() => {
                        resetForm();
                        setShowModal(true);
                    }}
                >
                    <Plus size={20} />
                    Novo Produto
                </Button>
            </header>

            <div className="bg-white rounded-3xl lg:rounded-[2.5rem] shadow-premium border border-white overflow-hidden">
                <div className="p-6 lg:p-8 border-b border-gray-50 space-y-4">
                    <div className="relative max-w-md">
                        <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
                        <input
                            type="text"
                            placeholder="Buscar produto por nome..."
                            className="w-full pl-12 pr-6 py-4 bg-soft rounded-2xl border-none focus:ring-2 focus:ring-primary/20 font-medium text-muted-text"
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                        />
                    </div>
                    {/* Legenda dos status */}
                    <div className="flex flex-wrap items-center gap-3 p-4 bg-blue-50 rounded-2xl border border-blue-100">
                        <Info size={16} className="text-blue-500 shrink-0" />
                        <span className="text-xs font-black text-blue-700 uppercase tracking-widest">Legenda:</span>
                        <div className="flex flex-wrap gap-2">
                            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-black bg-green-100 text-green-700">🟢 Na Loja</span>
                            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-black bg-red-100 text-red-700">🔴 Reservado</span>
                            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-black bg-primary/10 text-primary">💬 Exclusivo WA</span>
                        </div>
                    </div>
                </div>

                <div className="overflow-x-auto scrollbar-thin scrollbar-thumb-gray-200">
                    <table className="w-full text-left border-collapse min-w-[800px]">
                        <thead>
                            <tr className="bg-soft/50">
                                <th className="px-6 lg:px-8 py-6 text-xs font-black text-gray-400 uppercase tracking-widest">Produto</th>
                                <th className="px-6 lg:px-8 py-6 text-xs font-black text-gray-400 uppercase tracking-widest">Tamanho</th>
                                <th className="px-6 lg:px-8 py-6 text-xs font-black text-gray-400 uppercase tracking-widest">Categoria</th>
                                <th className="px-6 lg:px-8 py-6 text-xs font-black text-gray-400 uppercase tracking-widest">Preço</th>
                                <th className="px-6 lg:px-8 py-6 text-xs font-black text-gray-400 uppercase tracking-widest">Status</th>
                                <th className="px-6 lg:px-8 py-6 text-xs font-black text-gray-400 uppercase tracking-widest text-center">Ações</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-50">
                            {loading ? (
                                <tr>
                                    <td colSpan={6} className="px-8 py-20 text-center font-bold text-gray-400 animate-pulse">
                                        Carregando inventário...
                                    </td>
                                </tr>
                            ) : filteredProducts.length === 0 ? (
                                <tr>
                                    <td colSpan={6} className="px-8 py-20 text-center font-bold text-gray-400">
                                        Nenhum produto encontrado.
                                    </td>
                                </tr>
                            ) : (
                                filteredProducts.map((product) => (
                                    <tr key={product.id} className="hover:bg-soft/30 transition-colors">
                                        <td className="px-6 lg:px-8 py-6">
                                            <div className="flex items-center gap-4">
                                                <div className="w-12 h-12 lg:w-16 lg:h-16 rounded-xl bg-soft flex items-center justify-center overflow-hidden border border-gray-100 shadow-sm shrink-0">
                                                    {product.image_url ? (
                                                        <img
                                                            src={product.image_url}
                                                            alt={product.name}
                                                            className="w-full h-full object-cover"
                                                        />
                                                    ) : (
                                                        <ImageIcon className="text-gray-300" size={24} />
                                                    )}
                                                </div>
                                                <div className="min-w-0">
                                                    <div className="font-black text-muted-text truncate">{product.name}</div>
                                                    {product.whatsapp_exclusive && (
                                                        <div className="flex items-center gap-1 mt-1 text-[10px] font-bold text-primary">
                                                            <MessageSquare size={10} />
                                                            Exclusivo WhatsApp
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-6 lg:px-8 py-6">
                                            {product.size ? (
                                                <span className="inline-flex px-3 py-1 rounded-full text-xs font-black bg-primary/10 text-primary">{product.size}</span>
                                            ) : (
                                                <span className="text-gray-300 font-bold text-xs">—</span>
                                            )}
                                        </td>
                                        <td className="px-6 lg:px-8 py-6 font-bold text-gray-500">
                                            {product.categories?.name || "Sem categoria"}
                                        </td>
                                        <td className="px-6 lg:px-8 py-6 font-black text-muted-text">
                                            R$ {Number(product.price).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                                        </td>
                                        <td className="px-6 lg:px-8 py-6">
                                            <div className="flex flex-col gap-1.5">
                                                {product.available_in_store ? (
                                                    <span className="inline-flex px-3 py-1 rounded-full text-[10px] font-black bg-green-100 text-green-700 w-fit">
                                                        🟢 Na Loja
                                                    </span>
                                                ) : product.whatsapp_exclusive ? (
                                                    <span className="inline-flex px-3 py-1 rounded-full text-[10px] font-black bg-primary/10 text-primary w-fit">
                                                        💬 Exclusivo WA
                                                    </span>
                                                ) : (
                                                    <span className="inline-flex px-3 py-1 rounded-full text-[10px] font-black bg-red-100 text-red-600 w-fit">
                                                        🔴 Reservado
                                                    </span>
                                                )}
                                            </div>
                                        </td>
                                        <td className="px-6 lg:px-8 py-6">
                                            <div className="flex justify-center gap-2">
                                                <button
                                                    onClick={() => handleEdit(product)}
                                                    className="p-2 hover:bg-soft rounded-xl transition-colors"
                                                >
                                                    <Edit2 size={18} className="text-gray-400" />
                                                </button>
                                                <button
                                                    onClick={() => handleDelete(product.id)}
                                                    className="p-2 hover:bg-red-50 rounded-xl transition-colors"
                                                >
                                                    <Trash2 size={18} className="text-red-400" />
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

            {showModal && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-0 sm:p-4 backdrop-blur-sm">
                    <div className="bg-white sm:rounded-[3rem] p-6 lg:p-10 w-full max-w-2xl h-full sm:h-auto sm:max-h-[90vh] overflow-y-auto shadow-2xl relative">
                        <div className="flex justify-between items-center mb-8 sticky top-0 bg-white z-10 pb-2">
                            <h2 className="text-2xl lg:text-3xl font-black text-muted-text">
                                {editingProduct ? "Editar Produto" : "Novo Produto"}
                            </h2>
                            <button onClick={() => setShowModal(false)} className="p-2 hover:bg-soft rounded-xl transition-colors">
                                <X size={24} />
                            </button>
                        </div>

                        <form onSubmit={handleSubmit} className="space-y-6">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 lg:gap-8">
                                <div className="space-y-6">
                                    <div className="space-y-2">
                                        <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Nome do Produto</label>
                                        <input
                                            type="text"
                                            required
                                            className="w-full p-4 bg-soft rounded-2xl border-none font-bold text-muted-text"
                                            value={formData.name}
                                            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                        />
                                    </div>

                                    <div className="space-y-2">
                                        <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Categoria</label>
                                        <select
                                            required
                                            className="w-full p-4 bg-soft rounded-2xl border-none font-bold text-muted-text"
                                            value={formData.category_id}
                                            onChange={(e) => setFormData({ ...formData, category_id: e.target.value })}
                                        >
                                            <option value="">Selecione...</option>
                                            {categories.map(cat => (
                                                <option key={cat.id} value={cat.id}>{cat.name}</option>
                                            ))}
                                        </select>
                                    </div>

                                    <div className="space-y-2">
                                        <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Preço (R$)</label>
                                        <input
                                            type="number"
                                            step="0.01"
                                            required
                                            className="w-full p-4 bg-soft rounded-2xl border-none font-bold text-muted-text"
                                            value={formData.price}
                                            onChange={(e) => setFormData({ ...formData, price: parseFloat(e.target.value) })}
                                        />
                                    </div>

                                    <div className="space-y-2">
                                        <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Tamanho</label>
                                        <div className="flex flex-wrap gap-2">
                                            {SIZES.map(s => (
                                                <button
                                                    key={s}
                                                    type="button"
                                                    onClick={() => setFormData({ ...formData, size: s })}
                                                    className={`px-3 py-2 lg:px-4 lg:py-2 rounded-xl font-black text-sm transition-all ${formData.size === s
                                                        ? 'bg-primary text-white shadow-sm'
                                                        : 'bg-soft text-gray-500 hover:bg-primary/10'
                                                        }`}
                                                >
                                                    {s}
                                                </button>
                                            ))}
                                        </div>
                                        {formData.size === 'Outros' && (
                                            <input
                                                type="text"
                                                placeholder="Ex: 6 meses, 1 ano..."
                                                className="w-full p-3 bg-soft rounded-2xl border-none font-bold text-muted-text mt-2"
                                                value={customSize}
                                                onChange={(e) => setCustomSize(e.target.value)}
                                            />
                                        )}
                                    </div>
                                </div>

                                <div className="space-y-2">
                                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Foto do Produto</label>
                                    <div
                                        onClick={() => fileInputRef.current?.click()}
                                        className="w-full aspect-square bg-soft rounded-[2rem] border-2 border-dashed border-gray-200 flex flex-col items-center justify-center cursor-pointer hover:border-primary/50 transition-all overflow-hidden group"
                                    >
                                        {imagePreview ? (
                                            <div className="relative w-full h-full">
                                                <img src={imagePreview} className="w-full h-full object-cover" alt="Preview" />
                                                <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                                                    <Upload className="text-white" size={32} />
                                                </div>
                                            </div>
                                        ) : (
                                            <>
                                                <Upload className="text-gray-300 mb-2 group-hover:text-primary transition-colors" size={40} />
                                                <p className="text-xs font-bold text-gray-400 text-center px-4">Clique para selecionar</p>
                                            </>
                                        )}
                                    </div>
                                    <input
                                        type="file"
                                        ref={fileInputRef}
                                        className="hidden"
                                        accept="image/*"
                                        onChange={handleFileSelect}
                                    />
                                </div>
                            </div>

                            <div className="space-y-2">
                                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Descrição</label>
                                <textarea
                                    className="w-full p-4 bg-soft rounded-2xl border-none font-bold text-muted-text h-24"
                                    value={formData.description}
                                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                                />
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div className="flex items-center justify-between p-4 bg-soft rounded-2xl">
                                    <div>
                                        <div className="font-black text-muted-text text-sm">Em Destaque</div>
                                        <div className="text-[10px] text-gray-400 font-bold">Aparece na home</div>
                                    </div>
                                    <button
                                        type="button"
                                        onClick={() => setFormData({ ...formData, is_featured: !formData.is_featured })}
                                        className={`w-10 h-5 rounded-full relative transition-colors ${formData.is_featured ? 'bg-primary' : 'bg-gray-300'}`}
                                    >
                                        <div className={`absolute top-0.5 w-4 h-4 bg-white rounded-full transition-transform ${formData.is_featured ? 'right-0.5' : 'left-0.5'}`} />
                                    </button>
                                </div>

                                <div className="flex items-center justify-between p-4 bg-gradient-to-r from-primary/5 to-secondary/5 rounded-2xl border border-primary/10">
                                    <div>
                                        <div className="font-black text-muted-text text-sm flex items-center gap-2">
                                            <MessageSquare size={14} className="text-primary" />
                                            Exclusivo WhatsApp
                                        </div>
                                        <div className="text-[10px] text-gray-400 font-bold">Reserva priorizada</div>
                                    </div>
                                    <button
                                        type="button"
                                        onClick={() => setFormData({ ...formData, whatsapp_exclusive: !formData.whatsapp_exclusive })}
                                        className={`w-10 h-5 rounded-full relative transition-colors ${formData.whatsapp_exclusive ? 'bg-primary' : 'bg-gray-300'}`}
                                    >
                                        <div className={`absolute top-0.5 w-4 h-4 bg-white rounded-full transition-transform ${formData.whatsapp_exclusive ? 'right-0.5' : 'left-0.5'}`} />
                                    </button>
                                </div>
                            </div>

                            <div className="flex flex-col sm:flex-row gap-4 pt-4">
                                <Button type="button" variant="outline" className="h-14 rounded-2xl font-black lowercase" onClick={() => setShowModal(false)} disabled={uploading}>
                                    Cancelar
                                </Button>
                                <Button type="submit" className="flex-1 h-14 rounded-2xl shadow-vibrant font-black lowercase gap-2" disabled={uploading}>
                                    {uploading ? <Loader2 className="animate-spin" size={20} /> : (editingProduct ? "Atualizar" : "Cadastrar")}
                                </Button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}
