"use client";

import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import { Button } from "@/components/ui/Button";
import { UserPlus, Truck, MapPin, Phone, Edit2, Trash2, X, Loader2, CheckCircle2, Search, Save } from "lucide-react";
import { toast } from "react-hot-toast";

export default function AdminDeliveryDashboard() {
    const [deliveryPersons, setDeliveryPersons] = useState<any[]>([]);
    const [loading, setLoading] = useState(false);
    const [showModal, setShowModal] = useState(false);
    const [editingDriver, setEditingDriver] = useState<any>(null);
    const [searchTerm, setSearchTerm] = useState("");
    const [availableUsers, setAvailableUsers] = useState<any[]>([]);
    const [driverForm, setDriverForm] = useState({
        full_name: "",
        phone: "",
        area_coverage: "",
        active: true,
        commission_type: "fixed",
        commission_value: 0,
        store_pay_percentage: 100, // Armazenamos como 0-100 para facilidade do usuário
        user_id: ""
    });

    useEffect(() => {
        fetchDrivers();
        fetchUsers();
    }, []);

    const fetchUsers = async () => {
        const { data } = await supabase.from("profiles").select("id, full_name, phone");
        setAvailableUsers(data || []);
    };

    const fetchDrivers = async () => {
        setLoading(true);
        try {
            const { data } = await supabase.from("delivery_persons").select("*").order("full_name", { ascending: true });
            setDeliveryPersons(data || []);
        } catch (error) {
            console.error(error);
        } finally {
            setLoading(false);
        }
    };

    const handleOpenModal = (driver: any = null) => {
        if (driver) {
            setEditingDriver(driver);
            setDriverForm({
                full_name: driver.full_name,
                phone: driver.phone,
                area_coverage: driver.area_coverage || "",
                active: driver.active,
                commission_type: driver.commission_type || "fixed",
                commission_value: driver.commission_value || 0,
                store_pay_percentage: (driver.store_pay_percentage || 1) * 100,
                user_id: driver.user_id || ""
            });
        } else {
            setEditingDriver(null);
            setDriverForm({
                full_name: "",
                phone: "",
                area_coverage: "",
                active: true,
                commission_type: "fixed",
                commission_value: 0,
                store_pay_percentage: 100,
                user_id: ""
            });
        }
        setShowModal(true);
    };

    const handleSaveDriver = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!driverForm.full_name || !driverForm.phone) return toast.error("Preencha os campos obrigatórios.");

        setLoading(true);
        try {
            const payload = {
                ...driverForm,
                store_pay_percentage: driverForm.store_pay_percentage / 100,
                user_id: driverForm.user_id || null
            };

            if (editingDriver) {
                const { error } = await supabase
                    .from("delivery_persons")
                    .update(payload)
                    .eq("id", editingDriver.id);
                if (error) throw error;
                toast.success("Entregador atualizado!");
            } else {
                const { error } = await supabase.from("delivery_persons").insert([payload]);
                if (error) throw error;
                toast.success("Entregador cadastrado!");
            }
            setShowModal(false);
            fetchDrivers();
        } catch (error) {
            toast.error("Erro ao salvar entregador.");
        } finally {
            setLoading(false);
        }
    };

    const handleDeleteDriver = async (id: string) => {
        if (!confirm("Tem certeza que deseja excluir este entregador?")) return;

        try {
            const { error } = await supabase.from("delivery_persons").delete().eq("id", id);
            if (error) throw error;
            toast.success("Entregador excluído!");
            fetchDrivers();
        } catch (error) {
            toast.error("Erro ao excluir entregador.");
        }
    };

    const toggleStatus = async (driver: any) => {
        try {
            const { error } = await supabase
                .from("delivery_persons")
                .update({ active: !driver.active })
                .eq("id", driver.id);
            if (error) throw error;
            fetchDrivers();
        } catch (error) {
            toast.error("Erro ao alterar status.");
        }
    };

    const filteredDrivers = deliveryPersons.filter(d =>
        d.full_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        d.phone.includes(searchTerm) ||
        (d.area_coverage && d.area_coverage.toLowerCase().includes(searchTerm.toLowerCase()))
    );

    return (
        <div className="animate-in fade-in duration-500">
            <header className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 sm:gap-6 mb-6 sm:mb-8 lg:mb-10">
                <div>
                    <h1 className="text-2xl sm:text-3xl lg:text-4xl font-black text-muted-text lowercase tracking-tighter">Entregadores</h1>
                    <p className="text-[9px] sm:text-xs lg:text-sm text-gray-400 font-bold mt-0.5 uppercase tracking-widest leading-tight">Logística e motoristas</p>
                </div>

                <div className="flex w-full sm:w-auto gap-3">
                    <div className="relative flex-1 sm:w-64">
                        <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" size={14} />
                        <input
                            type="text"
                            placeholder="Buscar..."
                            className="w-full pl-9 pr-4 h-11 sm:h-14 bg-white/50 border-none rounded-xl sm:rounded-2xl font-bold text-[10px] sm:text-xs lg:text-sm shadow-sm outline-none focus:ring-2 focus:ring-primary/20 transition-all"
                            value={searchTerm}
                            onChange={e => setSearchTerm(e.target.value)}
                        />
                    </div>
                    <Button
                        onClick={() => handleOpenModal()}
                        className="h-11 sm:h-14 px-4 sm:px-8 rounded-xl sm:rounded-2xl shadow-vibrant font-black text-[10px] sm:text-xs uppercase tracking-widest gap-2 sm:gap-3 whitespace-nowrap"
                    >
                        <UserPlus size={16} className="sm:w-5 sm:h-5" /> <span className="hidden xs:inline">Novo Entregador</span><span className="xs:hidden">Novo</span>
                    </Button>
                </div>
            </header>

            {loading && deliveryPersons.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-32 gap-4">
                    <Loader2 size={48} className="animate-spin text-primary" />
                    <p className="text-gray-400 font-black uppercase tracking-widest text-xs">Carregando entregadores...</p>
                </div>
            ) : filteredDrivers.length === 0 ? (
                <div className="bg-white/50 border-4 border-dashed border-soft rounded-[3rem] p-20 text-center flex flex-col items-center">
                    <div className="w-24 h-24 bg-soft rounded-full flex items-center justify-center text-4xl mb-6">📍</div>
                    <h3 className="text-2xl font-black text-muted-text opacity-50">Nenhum entregador encontrado</h3>
                    <p className="text-gray-400 font-bold mt-2 lowercase">tente buscar por outro termo ou cadastre um novo entregador</p>
                </div>
            ) : (
                <div className="bg-white rounded-2xl sm:rounded-3xl lg:rounded-[2.5rem] shadow-premium border border-white overflow-hidden">
                    <div className="flex flex-col">
                        {filteredDrivers.map(driver => (
                            <div key={driver.id} className="dense-row group lg:grid lg:grid-cols-[1.5fr_1fr_1.2fr_auto] lg:gap-6 lg:py-4 lg:px-10 lg:items-center border-b border-gray-50 last:border-0 hover:bg-soft/30 transition-colors">
                                {/* Nome & Status */}
                                <div className="flex items-center gap-3 sm:gap-4 min-w-0">
                                    <div className="w-8 h-8 sm:w-10 sm:h-10 lg:w-12 lg:h-12 bg-soft rounded-lg sm:rounded-xl lg:rounded-2xl flex items-center justify-center shrink-0">
                                        <Truck size={14} className="text-gray-400 sm:w-4 sm:h-4 lg:w-5 lg:h-5" />
                                    </div>
                                    <div className="min-w-0 flex-1">
                                        <p className="font-black text-muted-text text-[11px] sm:text-sm lg:text-base truncate leading-tight group-hover:text-primary transition-colors">{driver.full_name}</p>
                                        <button
                                            onClick={() => toggleStatus(driver)}
                                            className={`mt-1 px-1.5 py-0.5 rounded-md text-[7px] sm:text-[8px] lg:text-[9px] font-black uppercase tracking-widest transition-all ${driver.active
                                                ? 'bg-green-100 text-green-600 hover:bg-green-200'
                                                : 'bg-red-100 text-red-600 hover:bg-red-200'
                                                }`}
                                        >
                                            {driver.active ? 'Disponível' : 'Indisponível'}
                                        </button>
                                    </div>
                                </div>

                                {/* Contato */}
                                <div className="flex items-center gap-1.5 lg:gap-2 justify-end lg:justify-start">
                                    <Phone size={10} className="text-gray-300 sm:w-3 sm:h-3" />
                                    <span className="font-bold text-gray-500 text-[10px] sm:text-xs lg:text-sm">{driver.phone}</span>
                                </div>

                                {/* Área */}
                                <div className="flex items-center gap-1.5 lg:gap-2 justify-end lg:justify-start">
                                    <MapPin size={10} className="text-gray-300 sm:w-3 sm:h-3" />
                                    <span className="font-bold text-gray-400 text-[9px] sm:text-[10px] lg:text-xs truncate max-w-[120px] lg:max-w-none">
                                        {driver.area_coverage || 'não definida'}
                                    </span>
                                </div>

                                {/* Ações */}
                                <div className="flex items-center justify-end gap-1.5 sm:gap-2 ml-2">
                                    <button
                                        onClick={() => handleOpenModal(driver)}
                                        className="w-7 h-7 sm:w-8 sm:h-8 lg:w-10 lg:h-10 bg-soft text-gray-400 rounded-lg lg:rounded-xl hover:bg-primary hover:text-white transition-all shadow-sm flex items-center justify-center shrink-0"
                                    >
                                        <Edit2 size={12} className="sm:w-3.5 sm:h-3.5" />
                                    </button>
                                    <button
                                        onClick={() => handleDeleteDriver(driver.id)}
                                        className="w-7 h-7 sm:w-8 sm:h-8 lg:w-10 lg:h-10 bg-soft text-gray-400 rounded-lg lg:rounded-xl hover:bg-red-500 hover:text-white transition-all shadow-sm flex items-center justify-center shrink-0"
                                    >
                                        <Trash2 size={12} className="sm:w-3.5 sm:h-3.5" />
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* Modal de Cadastro/Edição */}
            {showModal && (
                <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-in fade-in duration-300">
                    <div className="bg-white sm:rounded-[3rem] shadow-2xl overflow-hidden h-full sm:h-auto overflow-y-auto animate-in zoom-in-95 slide-in-from-bottom-4 duration-400">
                        <div className="p-6 sm:p-8 md:p-10">
                            <div className="flex justify-between items-start mb-6 sm:mb-8 sticky top-0 bg-white z-10 pb-2">
                                <div>
                                    <h2 className="text-2xl sm:text-3xl font-black text-muted-text lowercase tracking-tighter leading-none">
                                        {editingDriver ? 'editar entregador' : 'novo entregador'}
                                    </h2>
                                    <p className="text-gray-400 font-bold text-[10px] sm:text-xs mt-1 uppercase tracking-widest">motorista e logística</p>
                                </div>
                                <button
                                    onClick={() => setShowModal(false)}
                                    className="p-2 sm:p-3 bg-soft rounded-xl sm:rounded-2xl text-gray-400 hover:text-muted-text transition-colors"
                                >
                                    <X size={20} className="sm:w-6 sm:h-6" />
                                </button>
                            </div>

                            <form onSubmit={handleSaveDriver} className="space-y-4 sm:space-y-6">
                                <div className="space-y-1.5 sm:space-y-2">
                                    <label className="text-[9px] sm:text-[10px] font-black text-gray-400 uppercase tracking-widest px-1">Nome Completo</label>
                                    <input
                                        type="text"
                                        required
                                        className="w-full p-3.5 sm:p-5 bg-soft rounded-xl sm:rounded-3xl border-none font-bold text-xs sm:text-sm focus:ring-2 focus:ring-primary/20 outline-none transition-all"
                                        placeholder="Ex: João Silva"
                                        value={driverForm.full_name}
                                        onChange={e => setDriverForm({ ...driverForm, full_name: e.target.value })}
                                    />
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6">
                                    <div className="space-y-1.5 sm:space-y-2">
                                        <label className="text-[9px] sm:text-[10px] font-black text-gray-400 uppercase tracking-widest px-1">WhatsApp</label>
                                        <input
                                            type="text"
                                            required
                                            className="w-full p-3.5 sm:p-5 bg-soft rounded-xl sm:rounded-3xl border-none font-bold text-xs sm:text-sm focus:ring-2 focus:ring-primary/20 outline-none transition-all"
                                            placeholder="(00) 00000-0000"
                                            value={driverForm.phone}
                                            onChange={e => setDriverForm({ ...driverForm, phone: e.target.value })}
                                        />
                                    </div>
                                    <div className="space-y-1.5 sm:space-y-2">
                                        <label className="text-[9px] sm:text-[10px] font-black text-gray-400 uppercase tracking-widest px-1">Área de Atuação</label>
                                        <input
                                            type="text"
                                            className="w-full p-3.5 sm:p-5 bg-soft rounded-xl sm:rounded-3xl border-none font-bold text-xs sm:text-sm focus:ring-2 focus:ring-primary/20 outline-none transition-all"
                                            placeholder="Ex: Zona Sul, Centro..."
                                            value={driverForm.area_coverage}
                                            onChange={e => setDriverForm({ ...driverForm, area_coverage: e.target.value })}
                                        />
                                    </div>
                                </div>

                                <div className="pt-4 border-t border-gray-100">
                                    <h3 className="text-[9px] sm:text-xs font-black text-gray-400 uppercase tracking-widest mb-4 px-1">Regras e Login</h3>

                                    <div className="grid grid-cols-2 gap-4 sm:gap-6 mb-4 sm:mb-6">
                                        <div className="space-y-1.5 sm:space-y-2">
                                            <label className="text-[9px] sm:text-[10px] font-black text-gray-400 uppercase tracking-widest px-1">Tipo</label>
                                            <select
                                                className="w-full p-3.5 sm:p-5 bg-soft rounded-xl sm:rounded-3xl border-none font-bold text-xs sm:text-sm focus:ring-2 focus:ring-primary/20 outline-none transition-all appearance-none cursor-pointer"
                                                value={driverForm.commission_type}
                                                onChange={e => setDriverForm({ ...driverForm, commission_type: e.target.value })}
                                            >
                                                <option value="fixed">Fixo (R$)</option>
                                                <option value="percentage">Porcent. (%)</option>
                                            </select>
                                        </div>
                                        <div className="space-y-1.5 sm:space-y-2">
                                            <label className="text-[9px] sm:text-[10px] font-black text-gray-400 uppercase tracking-widest px-1">
                                                Valor
                                            </label>
                                            <input
                                                type="number"
                                                step="0.01"
                                                className="w-full p-3.5 sm:p-5 bg-soft rounded-xl sm:rounded-3xl border-none font-bold text-xs sm:text-sm focus:ring-2 focus:ring-primary/20 outline-none transition-all"
                                                value={driverForm.commission_value}
                                                onChange={e => setDriverForm({ ...driverForm, commission_value: parseFloat(e.target.value) })}
                                            />
                                        </div>
                                    </div>

                                    <div className="space-y-1.5 sm:space-y-2 mb-4 sm:mb-6">
                                        <label className="text-[9px] sm:text-[10px] font-black text-gray-400 uppercase tracking-widest px-1 flex justify-between">
                                            <span>Loja paga do Frete</span>
                                            <span className="text-primary font-black">{driverForm.store_pay_percentage}%</span>
                                        </label>
                                        <input
                                            type="range" min="0" max="100" step="5"
                                            className="w-full h-1.5 sm:h-2 bg-soft rounded-lg appearance-none cursor-pointer accent-primary"
                                            value={driverForm.store_pay_percentage}
                                            onChange={e => setDriverForm({ ...driverForm, store_pay_percentage: parseInt(e.target.value) })}
                                        />
                                    </div>

                                    <div className="space-y-1.5 sm:space-y-2">
                                        <label className="text-[9px] sm:text-[10px] font-black text-gray-400 uppercase tracking-widest px-1">Conta de Usuário</label>
                                        <select
                                            className="w-full p-3.5 sm:p-5 bg-soft rounded-xl sm:rounded-3xl border-none font-bold text-xs sm:text-sm focus:ring-2 focus:ring-primary/20 outline-none transition-all appearance-none cursor-pointer"
                                            value={driverForm.user_id}
                                            onChange={e => setDriverForm({ ...driverForm, user_id: e.target.value })}
                                        >
                                            <option value="">Não vincular ainda</option>
                                            {availableUsers.map(user => (
                                                <option key={user.id} value={user.id}>{user.full_name}</option>
                                            ))}
                                        </select>
                                    </div>
                                </div>

                                <div className="flex items-center gap-4 p-4 sm:p-5 bg-soft rounded-2xl sm:rounded-3xl">
                                    <div className="flex-1">
                                        <p className="font-black text-muted-text text-[11px] sm:text-sm">Disponível</p>
                                        <p className="text-[8px] sm:text-[9px] font-bold text-gray-400 uppercase tracking-widest">Status atual</p>
                                    </div>
                                    <button
                                        type="button"
                                        onClick={() => setDriverForm({ ...driverForm, active: !driverForm.active })}
                                        className={`w-12 h-7 sm:w-14 sm:h-8 rounded-full relative transition-all ${driverForm.active ? 'bg-primary' : 'bg-gray-300'}`}
                                    >
                                        <div className={`absolute top-1 w-5 h-5 sm:w-6 sm:h-6 bg-white rounded-full transition-all ${driverForm.active ? 'right-1 shadow-sm' : 'left-1'}`} />
                                    </button>
                                </div>

                                <div className="flex gap-3 sm:gap-4 pt-4 mb-2">
                                    <Button
                                        type="button"
                                        variant="ghost"
                                        onClick={() => setShowModal(false)}
                                        className="flex-1 h-12 sm:h-16 rounded-xl sm:rounded-3xl font-black text-[10px] sm:text-xs uppercase tracking-widest text-gray-400"
                                    >
                                        Cancelar
                                    </Button>
                                    <Button
                                        type="submit"
                                        disabled={loading}
                                        className="flex-[2] h-12 sm:h-16 rounded-xl sm:rounded-3xl shadow-vibrant font-black text-sm sm:text-lg gap-2"
                                    >
                                        {loading ? <Loader2 className="animate-spin" size={18} /> : (editingDriver ? "Salvar" : "Cadastrar")}
                                    </Button>
                                </div>
                            </form>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
