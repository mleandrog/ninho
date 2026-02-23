"use client";

import { useState, useEffect } from "react";
import { AdminSidebar } from "@/components/admin/AdminSidebar";
import { supabase } from "@/lib/supabase";
import { Button } from "@/components/ui/Button";
import { UserPlus, Truck, MapPin, Phone, CheckCircle, Clock } from "lucide-react";
import { toast } from "react-hot-toast";

export default function AdminDeliveryDashboard() {
    const [deliveryPersons, setDeliveryPersons] = useState<any[]>([]);
    const [loading, setLoading] = useState(false);
    const [newDriver, setNewDriver] = useState({ full_name: "", phone: "", area_coverage: "" });

    useEffect(() => {
        fetchDrivers();
    }, []);

    const fetchDrivers = async () => {
        setLoading(true);
        try {
            const { data } = await supabase.from("delivery_persons").select("*").order("created_at", { ascending: false });
            setDeliveryPersons(data || []);
        } catch (error) {
            console.error(error);
        } finally {
            setLoading(false);
        }
    };

    const handleAddDriver = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!newDriver.full_name || !newDriver.phone) return toast.error("Preencha os campos obrigatórios.");

        try {
            const { error } = await supabase.from("delivery_persons").insert([newDriver]);
            if (error) throw error;
            toast.success("Entregador cadastrado com sucesso!");
            setNewDriver({ full_name: "", phone: "", area_coverage: "" });
            fetchDrivers();
        } catch (error) {
            toast.error("Erro ao cadastrar entregador.");
        }
    };

    return (
        <div className="min-h-screen bg-soft flex">
            <AdminSidebar />

            <main className="flex-1 p-12 overflow-y-auto">
                <header className="flex justify-between items-center mb-12">
                    <div>
                        <h1 className="text-4xl font-black text-muted-text lowercase tracking-tighter">Entregadores</h1>
                        <p className="text-gray-400 font-bold mt-1">Gestão de logística, rotas e motoristas cadastrados</p>
                    </div>
                </header>

                <div className="grid lg:grid-cols-3 gap-12">
                    {/* Form de Cadastro */}
                    <div className="bg-white p-10 rounded-[3rem] shadow-premium border border-white space-y-8 h-fit">
                        <h2 className="text-2xl font-black text-muted-text flex items-center gap-3">
                            <UserPlus size={24} className="text-primary" /> Novo Entregador
                        </h2>

                        <form onSubmit={handleAddDriver} className="space-y-6">
                            <div className="space-y-2">
                                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Nome Completo</label>
                                <input
                                    type="text"
                                    className="w-full p-4 bg-soft rounded-2xl border-none font-bold text-sm"
                                    value={newDriver.full_name}
                                    onChange={e => setNewDriver({ ...newDriver, full_name: e.target.value })}
                                />
                            </div>
                            <div className="space-y-2">
                                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">WhatsApp</label>
                                <input
                                    type="text"
                                    placeholder="(00) 00000-0000"
                                    className="w-full p-4 bg-soft rounded-2xl border-none font-bold text-sm"
                                    value={newDriver.phone}
                                    onChange={e => setNewDriver({ ...newDriver, phone: e.target.value })}
                                />
                            </div>
                            <div className="space-y-2">
                                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Área de Atuação</label>
                                <input
                                    type="text"
                                    placeholder="Ex: Zona Sul, Centro..."
                                    className="w-full p-4 bg-soft rounded-2xl border-none font-bold text-sm"
                                    value={newDriver.area_coverage}
                                    onChange={e => setNewDriver({ ...newDriver, area_coverage: e.target.value })}
                                />
                            </div>
                            <Button type="submit" className="w-full h-16 rounded-full shadow-vibrant font-black text-lg gap-2">
                                <UserPlus size={20} /> Cadastrar
                            </Button>
                        </form>
                    </div>

                    {/* Lista de Entregadores */}
                    <div className="lg:col-span-2 space-y-8">
                        <div className="grid sm:grid-cols-2 gap-6">
                            {deliveryPersons.map(driver => (
                                <div key={driver.id} className="bg-white p-8 rounded-[2.5rem] shadow-premium border border-white group hover:border-primary/20 transition-all">
                                    <div className="flex justify-between items-start mb-6">
                                        <div className="w-16 h-16 bg-soft rounded-2xl flex items-center justify-center text-3xl group-hover:bg-primary/10 transition-colors">
                                            🚚
                                        </div>
                                        <div className={`px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest ${driver.active ? 'bg-green-100 text-green-600' : 'bg-red-100 text-red-600'}`}>
                                            {driver.active ? 'Disponível' : 'Indisponível'}
                                        </div>
                                    </div>

                                    <h3 className="text-2xl font-black text-muted-text">{driver.full_name}</h3>

                                    <div className="mt-4 space-y-3">
                                        <div className="flex items-center gap-2 text-gray-400 font-bold text-sm">
                                            <Phone size={14} className="text-secondary" /> {driver.phone}
                                        </div>
                                        <div className="flex items-center gap-2 text-gray-400 font-bold text-sm">
                                            <MapPin size={14} className="text-primary" /> {driver.area_coverage || 'Geral'}
                                        </div>
                                    </div>

                                    <div className="pt-6 mt-6 border-t border-soft flex gap-2">
                                        <Button variant="outline" className="flex-1 h-12 rounded-xl text-[10px] font-black uppercase tracking-widest">Editar</Button>
                                        <Button variant="ghost" className="h-12 w-12 rounded-xl flex items-center justify-center text-red-400 hover:bg-red-50">
                                            🗑️
                                        </Button>
                                    </div>
                                </div>
                            ))}
                        </div>

                        {deliveryPersons.length === 0 && (
                            <div className="bg-white/50 border-4 border-dashed border-soft rounded-[3rem] p-20 text-center">
                                <div className="text-6xl mb-4">📍</div>
                                <h3 className="text-2xl font-black text-muted-text opacity-50">Nenhum entregador cadastrado</h3>
                                <p className="text-gray-400 font-bold mt-2 lowercase">cadastre seu primeiro motorista para começar a gerenciar rotas</p>
                            </div>
                        )}
                    </div>
                </div>
            </main>
        </div>
    );
}
