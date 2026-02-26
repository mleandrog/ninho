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
            <header className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 mb-12">
                <div>
                    <h1 className="text-4xl font-black text-muted-text lowercase tracking-tighter">Entregadores</h1>
                    <p className="text-gray-400 font-bold mt-1 text-sm">Gestão de logística e motoristas cadastrados</p>
                </div>

                <div className="flex w-full md:w-auto gap-4">
                    <div className="relative flex-1 md:w-64">
                        <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                        <input
                            type="text"
                            placeholder="Buscar entregador..."
                            className="w-full pl-12 pr-4 h-14 bg-white/50 border-none rounded-2xl font-bold text-sm shadow-sm outline-none focus:ring-2 focus:ring-primary/20 transition-all"
                            value={searchTerm}
                            onChange={e => setSearchTerm(e.target.value)}
                        />
                    </div>
                    <Button
                        onClick={() => handleOpenModal()}
                        className="h-14 px-8 rounded-2xl shadow-vibrant font-black text-xs uppercase tracking-widest gap-3 whitespace-nowrap"
                    >
                        <UserPlus size={20} /> Adicionar Entregador
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
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                    {filteredDrivers.map(driver => (
                        <div key={driver.id} className="bg-white p-8 rounded-[2.5rem] shadow-premium border border-white group hover:border-primary/20 transition-all flex flex-col justify-between">
                            <div>
                                <div className="flex justify-between items-start mb-6">
                                    <div className="w-16 h-16 bg-soft rounded-2xl flex items-center justify-center text-3xl group-hover:bg-primary/10 transition-colors">
                                        🚚
                                    </div>
                                    <button
                                        onClick={() => toggleStatus(driver)}
                                        className={`px-4 py-2 rounded-xl text-[9px] font-black uppercase tracking-widest transition-all ${driver.active
                                            ? 'bg-green-100 text-green-600 hover:bg-green-200'
                                            : 'bg-red-100 text-red-600 hover:bg-red-200'
                                            }`}
                                    >
                                        {driver.active ? 'Disponível' : 'Indisponível'}
                                    </button>
                                </div>

                                <h3 className="text-xl font-black text-muted-text truncate">{driver.full_name}</h3>

                                <div className="mt-4 space-y-3">
                                    <div className="flex items-center gap-2 text-gray-400 font-bold text-sm">
                                        <Phone size={14} className="text-secondary" /> {driver.phone}
                                    </div>
                                    <div className="flex items-center gap-2 text-gray-400 font-bold text-sm">
                                        <MapPin size={14} className="text-primary" /> {driver.area_coverage || 'Área não definida'}
                                    </div>
                                </div>
                            </div>

                            <div className="pt-6 mt-6 border-t border-soft flex gap-2">
                                <button
                                    onClick={() => handleOpenModal(driver)}
                                    className="flex-1 h-12 bg-soft text-gray-500 rounded-xl hover:bg-primary hover:text-white transition-all font-black text-[10px] uppercase tracking-widest flex items-center justify-center gap-2"
                                >
                                    <Edit2 size={14} /> Editar
                                </button>
                                <button
                                    onClick={() => handleDeleteDriver(driver.id)}
                                    className="h-12 w-12 bg-soft text-gray-400 rounded-xl hover:bg-red-500 hover:text-white transition-all flex items-center justify-center"
                                >
                                    <Trash2 size={16} />
                                </button>
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {/* Modal de Cadastro/Edição */}
            {showModal && (
                <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-in fade-in duration-300">
                    <div className="bg-white w-full max-w-xl rounded-[3rem] shadow-2xl overflow-hidden animate-in zoom-in-95 slide-in-from-bottom-4 duration-400">
                        <div className="p-8 md:p-10">
                            <div className="flex justify-between items-start mb-8">
                                <div>
                                    <h2 className="text-3xl font-black text-muted-text lowercase tracking-tighter">
                                        {editingDriver ? 'editar entregador' : 'novo entregador'}
                                    </h2>
                                    <p className="text-gray-400 font-bold text-sm">Preencha os dados básicos do motorista</p>
                                </div>
                                <button
                                    onClick={() => setShowModal(false)}
                                    className="p-3 bg-soft rounded-2xl text-gray-400 hover:text-muted-text transition-colors"
                                >
                                    <X size={24} />
                                </button>
                            </div>

                            <form onSubmit={handleSaveDriver} className="space-y-6">
                                <div className="space-y-2">
                                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest px-2">Nome Completo</label>
                                    <input
                                        type="text"
                                        required
                                        className="w-full p-5 bg-soft rounded-3xl border-none font-bold text-sm focus:ring-2 focus:ring-primary/20 outline-none transition-all"
                                        placeholder="Ex: João Silva"
                                        value={driverForm.full_name}
                                        onChange={e => setDriverForm({ ...driverForm, full_name: e.target.value })}
                                    />
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                    <div className="space-y-2">
                                        <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest px-2">WhatsApp</label>
                                        <input
                                            type="text"
                                            required
                                            className="w-full p-5 bg-soft rounded-3xl border-none font-bold text-sm focus:ring-2 focus:ring-primary/20 outline-none transition-all"
                                            placeholder="(00) 00000-0000"
                                            value={driverForm.phone}
                                            onChange={e => setDriverForm({ ...driverForm, phone: e.target.value })}
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest px-2">Área de Atuação</label>
                                        <input
                                            type="text"
                                            className="w-full p-5 bg-soft rounded-3xl border-none font-bold text-sm focus:ring-2 focus:ring-primary/20 outline-none transition-all"
                                            placeholder="Ex: Zona Sul, Centro..."
                                            value={driverForm.area_coverage}
                                            onChange={e => setDriverForm({ ...driverForm, area_coverage: e.target.value })}
                                        />
                                    </div>
                                </div>

                                <div className="pt-4 border-t border-gray-100">
                                    <h3 className="text-xs font-black text-gray-400 uppercase tracking-widest mb-4 px-2">Regras de Comissão e Login</h3>

                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                                        <div className="space-y-2">
                                            <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest px-2">Tipo de Comissão</label>
                                            <select
                                                className="w-full p-5 bg-soft rounded-3xl border-none font-bold text-sm focus:ring-2 focus:ring-primary/20 outline-none transition-all appearance-none cursor-pointer"
                                                value={driverForm.commission_type}
                                                onChange={e => setDriverForm({ ...driverForm, commission_type: e.target.value })}
                                            >
                                                <option value="fixed">Valor Fixo (R$)</option>
                                                <option value="percentage">Porcentagem (%)</option>
                                            </select>
                                        </div>
                                        <div className="space-y-2">
                                            <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest px-2">
                                                {driverForm.commission_type === 'fixed' ? 'Valor por Entrega' : 'Porcentagem (%)'}
                                            </label>
                                            <input
                                                type="number"
                                                step="0.01"
                                                className="w-full p-5 bg-soft rounded-3xl border-none font-bold text-sm focus:ring-2 focus:ring-primary/20 outline-none transition-all"
                                                value={driverForm.commission_value}
                                                onChange={e => setDriverForm({ ...driverForm, commission_value: parseFloat(e.target.value) })}
                                            />
                                        </div>
                                    </div>

                                    <div className="space-y-2 mb-6">
                                        <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest px-2 flex justify-between">
                                            <span>Loja paga do Frete</span>
                                            <span className="text-primary font-black uppercase tracking-normal">{driverForm.store_pay_percentage}%</span>
                                        </label>
                                        <input
                                            type="range"
                                            min="0"
                                            max="100"
                                            step="5"
                                            className="w-full h-2 bg-soft rounded-lg appearance-none cursor-pointer accent-primary"
                                            value={driverForm.store_pay_percentage}
                                            onChange={e => setDriverForm({ ...driverForm, store_pay_percentage: parseInt(e.target.value) })}
                                        />
                                        <p className="text-[10px] text-gray-400 font-bold px-2 italic">
                                            Define quanto do valor do frete calculado é assumido pela loja.
                                        </p>
                                    </div>

                                    <div className="space-y-2">
                                        <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest px-2">Vincular Conta de Usuário (Login)</label>
                                        <select
                                            className="w-full p-5 bg-soft rounded-3xl border-none font-bold text-sm focus:ring-2 focus:ring-primary/20 outline-none transition-all appearance-none cursor-pointer"
                                            value={driverForm.user_id}
                                            onChange={e => setDriverForm({ ...driverForm, user_id: e.target.value })}
                                        >
                                            <option value="">Não vincular ainda</option>
                                            {availableUsers.map(user => (
                                                <option key={user.id} value={user.id}>{user.full_name} ({user.phone})</option>
                                            ))}
                                        </select>
                                    </div>
                                </div>

                                <div className="flex items-center gap-4 p-5 bg-soft rounded-3xl">
                                    <div className="flex-1">
                                        <p className="font-black text-muted-text text-sm">Status do Entregador</p>
                                        <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Ative ou desative a disponibilidade</p>
                                    </div>
                                    <button
                                        type="button"
                                        onClick={() => setDriverForm({ ...driverForm, active: !driverForm.active })}
                                        className={`w-14 h-8 rounded-full relative transition-all ${driverForm.active ? 'bg-primary' : 'bg-gray-300'}`}
                                    >
                                        <div className={`absolute top-1 w-6 h-6 bg-white rounded-full transition-all ${driverForm.active ? 'right-1 shadow-sm' : 'left-1'}`} />
                                    </button>
                                </div>

                                <div className="flex gap-4 pt-4">
                                    <Button
                                        type="button"
                                        variant="ghost"
                                        onClick={() => setShowModal(false)}
                                        className="flex-1 h-16 rounded-3xl font-black text-xs uppercase tracking-widest text-gray-400"
                                    >
                                        Cancelar
                                    </Button>
                                    <Button
                                        type="submit"
                                        disabled={loading}
                                        className="flex-[2] h-16 rounded-3xl shadow-vibrant font-black text-lg gap-3"
                                    >
                                        {loading ? <Loader2 className="animate-spin" size={24} /> : editingDriver ? <Save size={24} /> : <UserPlus size={24} />}
                                        {editingDriver ? "Salvar Alterações" : "Cadastrar Agora"}
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
