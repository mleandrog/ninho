"use client";

import { useEffect, useState, useRef } from "react";
import { supabase } from "@/lib/supabase";
import { Button } from "@/components/ui/Button";
import { Plus, Search, Edit2, Trash2, X, MessageSquare, Upload, Loader2, Image as ImageIcon, Info, Heart } from "lucide-react";
import { toast } from "react-hot-toast";
import { ConfirmModal } from "@/components/ui/ConfirmModal";

export default function AdminProductsPage() {
    const [products, setProducts] = useState<any[]>([]);
    const [categories, setCategories] = useState<any[]>([]);
    const [productTypes, setProductTypes] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState("");
    const [showModal, setShowModal] = useState(false);
    const [editingProduct, setEditingProduct] = useState<any>(null);
    const [uploading, setUploading] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);
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
        product_type_id: "",
        available_in_store: true,
    });
    const [customSize, setCustomSize] = useState("");

    const [imagePreview, setImagePreview] = useState<string>("");
    const [selectedFile, setSelectedFile] = useState<File | null>(null);

    useEffect(() => {
        fetchProducts();
        fetchCategories();
        fetchProductTypes();
    }, []);

    const fetchProducts = async () => {
        setLoading(true);
        try {
            const { data, error } = await supabase
                .from("products")
                .select("*, categories(name), product_types(name)")
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

    const fetchProductTypes = async () => {
        const { data } = await supabase.from("product_types").select("*");
        setProductTypes(data || []);
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

                                // POSICIONAMENTO: CANTO INFERIOR ESQUERDO
                                const x = 30;
                                const y = height - ovHeight - 30;
                                const radius = ovHeight * 0.28;

                                console.log(`[Branding] Aplicando estampa em ${width}x${height} na posição x:${x}, y:${y}`);

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
                available_in_store: formData.available_in_store,
                whatsapp_campaign_completed: false,
                size: formData.size === 'Outros' ? customSize : formData.size,
                // Garantir que não envie "" para UUIDs
                category_id: formData.category_id || null,
                product_type_id: formData.product_type_id || null,
            };

            // Validação amigável
            if (!productData.category_id) {
                toast.error("Por favor, selecione uma categoria para o produto.");
                setUploading(false);
                return;
            }
            if (!productData.product_type_id) {
                toast.error("O 'Tipo de Produto' é obrigatório para que os clientes saibam o que estão comprando.");
                setUploading(false);
                return;
            }

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
            product_type_id: product.product_type_id || '',
            available_in_store: product.available_in_store ?? true,
        });
        if (isCustom) setCustomSize(product.size);
        setImagePreview(product.image_url || "");
        setSelectedFile(null);
        setShowModal(true);
    };

    const handleDelete = (id: number) => {
        setConfirmModal({
            isOpen: true,
            title: "Excluir Produto",
            message: "Tem certeza que deseja excluir este produto? Esta ação não pode ser desfeita.",
            type: "danger",
            onConfirm: () => executeDelete(id)
        });
    };

    const executeDelete = async (id: number) => {
        setConfirmModal(prev => ({ ...prev, isOpen: false }));
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
            product_type_id: "",
            available_in_store: true,
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
            <header className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6 sm:mb-8 lg:mb-12">
                <div>
                    <h1 className="text-2xl sm:text-3xl lg:text-4xl font-black text-muted-text lowercase tracking-tighter">Produtos</h1>
                    <p className="text-[9px] sm:text-xs lg:text-sm text-gray-400 font-bold mt-0.5 sm:mt-1 uppercase tracking-widest">{products.length} itens no catálogo</p>
                </div>
                <Button
                    className="w-full sm:w-auto h-11 sm:h-12 lg:h-14 px-5 sm:px-6 lg:px-8 rounded-xl lg:rounded-2xl gap-2 sm:gap-3 shadow-vibrant text-[10px] sm:text-xs lg:text-base font-black"
                    onClick={() => {
                        resetForm();
                        setShowModal(true);
                    }}
                >
                    <Plus size={16} className="sm:w-5 sm:h-5" />
                    Novo Produto
                </Button>
            </header>

            <div className="bg-white rounded-xl sm:rounded-2xl lg:rounded-[2.5rem] shadow-premium border border-white overflow-hidden">
                <div className="p-4 sm:p-6 lg:p-8 border-b border-gray-50 flex flex-col sm:flex-row justify-between items-center gap-4">
                    <div className="relative w-full max-w-md">
                        <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
                        <input
                            type="text"
                            placeholder="Buscar produto..."
                            className="w-full pl-10 pr-4 py-3 bg-soft rounded-2xl border-none focus:ring-2 focus:ring-primary/20 font-bold text-sm text-muted-text outline-none transition-all"
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                        />
                    </div>
                </div>

                <div className="flex flex-col divide-y divide-gray-50">
                    {/* Desktop Header */}
                    <div className="hidden lg:grid grid-cols-[100px_1fr_120px_100px_140px_120px_120px] gap-6 px-10 py-5 bg-soft/30 border-b border-gray-50">
                        <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Foto</span>
                        <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Produto</span>
                        <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Tipo</span>
                        <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Tam</span>
                        <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Categoria</span>
                        <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest text-right">Preço</span>
                        <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest text-center">Ações</span>
                    </div>

                    {loading ? (
                        <div className="p-12 lg:p-20 text-center flex flex-col items-center gap-4">
                            <Loader2 className="w-8 h-8 lg:w-10 lg:h-10 text-primary animate-spin" />
                            <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Carregando catálogo...</span>
                        </div>
                    ) : filteredProducts.length === 0 ? (
                        <div className="p-12 lg:p-20 text-center flex flex-col items-center gap-4">
                            <ImageIcon size={40} className="text-gray-200" />
                            <span className="text-sm font-bold text-gray-400">Nenhum produto encontrado.</span>
                        </div>
                    ) : (
                        filteredProducts.map((product) => (
                            <div
                                key={product.id}
                                className="group lg:grid lg:grid-cols-[100px_1fr_120px_100px_140px_120px_120px] lg:gap-6 p-4 sm:p-6 lg:px-10 lg:py-5 lg:items-center hover:bg-soft/30 transition-all duration-300 relative"
                            >
                                {/* Foto e Status (Mobile/Desktop) */}
                                <div className="flex items-center gap-4 lg:contents">
                                    <div className="shrink-0 relative">
                                        <div className="w-16 h-16 sm:w-20 sm:h-20 lg:w-16 lg:h-16 rounded-2xl bg-white flex items-center justify-center overflow-hidden border border-gray-100 shadow-sm group-hover:shadow-md transition-all">
                                            {product.image_url ? (
                                                <img src={product.image_url} alt={product.name} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500" />
                                            ) : (
                                                <ImageIcon className="text-gray-200" size={20} />
                                            )}
                                        </div>
                                        {/* Tag de Disponibilidade Mobile */}
                                        <div className="absolute -top-2 -right-2 lg:hidden">
                                            {product.available_in_store ? (
                                                <div className="w-3 h-3 bg-green-500 rounded-full border-2 border-white shadow-sm" title="Loja Online" />
                                            ) : (
                                                <div className="w-3 h-3 bg-red-500 rounded-full border-2 border-white shadow-sm" title="Reservado" />
                                            )}
                                        </div>
                                    </div>

                                    {/* Info Principal - Mobile Context */}
                                    <div className="flex-1 min-w-0 lg:contents">
                                        <div className="min-w-0 lg:pr-4">
                                            <p className="font-black text-muted-text text-sm sm:text-base lg:text-base truncate leading-tight group-hover:text-primary transition-colors">
                                                {product.name}
                                            </p>
                                            <div className="flex flex-wrap items-center gap-2 mt-1 lg:hidden">
                                                <span className="px-2 py-0.5 rounded-lg bg-soft text-[9px] font-black text-gray-400 uppercase tracking-widest whitespace-nowrap">
                                                    {product.categories?.name}
                                                </span>
                                                {product.size && (
                                                    <span className="px-2 py-0.5 rounded-lg bg-primary/10 text-[9px] font-black text-primary uppercase tracking-widest whitespace-nowrap">
                                                        {product.size}
                                                    </span>
                                                )}
                                            </div>
                                        </div>

                                        {/* Tipo (Desktop) */}
                                        <div className="hidden lg:block text-[10px] font-black text-gray-400 uppercase tracking-widest truncate">
                                            {product.product_types?.name || "—"}
                                        </div>

                                        {/* Tamanho (Desktop) */}
                                        <div className="hidden lg:block">
                                            {product.size ? (
                                                <span className="px-2.5 py-1 rounded-lg bg-primary/10 text-[10px] font-black text-primary uppercase tracking-widest">
                                                    {product.size}
                                                </span>
                                            ) : (
                                                <span className="text-gray-200">—</span>
                                            )}
                                        </div>

                                        {/* Categoria (Desktop) */}
                                        <div className="hidden lg:block text-[10px] font-bold text-gray-500 truncate">
                                            {product.categories?.name || "Sem categoria"}
                                        </div>

                                        {/* Preço (Mobile/Desktop) */}
                                        <div className="lg:text-right">
                                            <div className="font-black text-muted-text text-base sm:text-lg lg:text-base leading-tight tabular-nums group-hover:scale-105 transition-transform origin-right">
                                                R$ {Number(product.price).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                                            </div>
                                            {/* Status Badge Desktop Only */}
                                            <div className="hidden lg:flex items-center justify-end gap-1.5 mt-1">
                                                {product.available_in_store ? (
                                                    <span className="text-[8px] font-black text-green-500 uppercase tracking-widest bg-green-50 px-1.5 py-0.5 rounded-full border border-green-100">Loja</span>
                                                ) : product.whatsapp_exclusive ? (
                                                    <span className="text-[8px] font-black text-primary uppercase tracking-widest bg-primary/5 px-1.5 py-0.5 rounded-full border border-primary/10">Zap</span>
                                                ) : (
                                                    <span className="text-[8px] font-black text-red-500 uppercase tracking-widest bg-red-50 px-1.5 py-0.5 rounded-full border border-red-100">Reserv</span>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                {/* Ações (Responsivo) */}
                                <div className="flex items-center justify-end gap-2 mt-4 lg:mt-0 pt-4 lg:pt-0 border-t lg:border-t-0 border-gray-50 lg:justify-center">
                                    <button
                                        onClick={() => handleEdit(product)}
                                        className="flex-1 lg:flex-none h-10 sm:h-12 lg:w-11 lg:h-11 bg-soft text-gray-400 rounded-xl lg:rounded-2xl hover:bg-primary hover:text-white transition-all shadow-sm flex items-center justify-center gap-2 lg:gap-0 hover:scale-105 active:scale-95"
                                        title="Editar"
                                    >
                                        <Edit2 size={16} />
                                        <span className="font-black text-[10px] uppercase tracking-widest lg:hidden">Editar</span>
                                    </button>
                                    <button
                                        onClick={() => handleDelete(product.id)}
                                        className="flex-1 lg:flex-none h-10 sm:h-12 lg:w-11 lg:h-11 bg-soft text-gray-400 rounded-xl lg:rounded-2xl hover:bg-red-500 hover:text-white transition-all shadow-sm flex items-center justify-center gap-2 lg:gap-0 hover:scale-105 active:scale-95"
                                        title="Excluir"
                                    >
                                        <Trash2 size={16} />
                                        <span className="font-black text-[10px] uppercase tracking-widest lg:hidden">Excluir</span>
                                    </button>
                                </div>
                            </div>
                        ))
                    )}
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
                                        <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Tipo de Produto</label>
                                        <select
                                            className="w-full p-4 bg-soft rounded-2xl border-none font-bold text-muted-text"
                                            value={formData.product_type_id}
                                            onChange={(e) => setFormData({ ...formData, product_type_id: e.target.value })}
                                        >
                                            <option value="">Selecione...</option>
                                            {productTypes.map(type => (
                                                <option key={type.id} value={type.id}>{type.name}</option>
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

                                <div className="flex items-center justify-between p-4 bg-soft rounded-2xl">
                                    <div>
                                        <div className="font-black text-muted-text text-sm">Disponível</div>
                                        <div className="text-[10px] text-gray-400 font-bold">Visível na loja / WhatsApp</div>
                                    </div>
                                    <button
                                        type="button"
                                        onClick={() => setFormData({ ...formData, available_in_store: !formData.available_in_store })}
                                        className={`w-10 h-5 rounded-full relative transition-colors ${formData.available_in_store ? 'bg-green-500' : 'bg-gray-300'}`}
                                    >
                                        <div className={`absolute top-0.5 w-4 h-4 bg-white rounded-full transition-transform ${formData.available_in_store ? 'right-0.5' : 'left-0.5'}`} />
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
            )
            }
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
        </div >
    );
}
