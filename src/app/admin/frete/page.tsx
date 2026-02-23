"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { AdminSidebar } from "@/components/admin/AdminSidebar";
import { Plus, Trash2, Save, MapPin, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { toast } from "react-hot-toast";

interface FeeZone {
    id?: string;
    name: string;
    min_km: number;
    max_km: number | null;
    base_fee: number;
    extra_per_km: number;
    active: boolean;
}

const emptyZone = (): FeeZone => ({
    name: "",
    min_km: 0,
    max_km: null,
    base_fee: 0,
    extra_per_km: 0,
    active: true,
});

export default function FreteConfigPage() {
    const [zones, setZones] = useState<FeeZone[]>([]);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);

    useEffect(() => { fetchZones(); }, []);

    const fetchZones = async () => {
        setLoading(true);
        const { data } = await supabase
            .from("delivery_fee_zones")
            .select("*")
            .order("min_km", { ascending: true });
        setZones(data || []);
        setLoading(false);
    };

    const handleChange = (index: number, field: keyof FeeZone, value: any) => {
        const updated = [...zones];
        updated[index] = { ...updated[index], [field]: value };
        setZones(updated);
    };

    const addZone = () => {
        const last = zones[zones.length - 1];
        setZones([...zones, { ...emptyZone(), min_km: last?.max_km ?? 0 }]);
    };

    const removeZone = async (index: number) => {
        const zone = zones[index];
        if (zone.id) {
            await supabase.from("delivery_fee_zones").delete().eq("id", zone.id);
            toast.success("Zona removida!");
        }
        setZones(zones.filter((_, i) => i !== index));
    };

    const saveAll = async () => {
        setSaving(true);
        try {
            for (const zone of zones) {
                const payload = {
                    name: zone.name,
                    min_km: zone.min_km,
                    max_km: zone.max_km,
                    base_fee: zone.base_fee,
                    extra_per_km: zone.extra_per_km,
                    active: zone.active,
                };
                if (zone.id) {
                    await supabase.from("delivery_fee_zones").update(payload).eq("id", zone.id);
                } else {
                    await supabase.from("delivery_fee_zones").insert(payload);
                }
            }
            toast.success("Configurações de frete salvas!");
            fetchZones();
        } catch (err: any) {
            toast.error("Erro ao salvar: " + err.message);
        } finally {
            setSaving(false);
        }
    };

    return (
        <div className="min-h-screen bg-soft flex">
            <AdminSidebar />
            <main className="flex-1 p-8 md:p-12 overflow-y-auto">
                <header className="flex justify-between items-center mb-10">
                    <div>
                        <h1 className="text-4xl font-black text-muted-text tracking-tighter lowercase flex items-center gap-3">
                            <MapPin className="text-primary" size={32} />
                            Zonas de Frete
                        </h1>
                        <p className="text-gray-400 font-bold mt-1">
                            Defina o valor da entrega por faixa de distância (km)
                        </p>
                    </div>
                    <Button onClick={saveAll} disabled={saving} className="h-14 px-8 rounded-2xl gap-3 shadow-vibrant">
                        <Save size={18} />
                        {saving ? "Salvando..." : "Salvar Tudo"}
                    </Button>
                </header>

                <div className="bg-blue-50 border border-blue-100 rounded-2xl p-4 mb-8 flex gap-3 text-sm text-blue-700">
                    <AlertCircle size={18} className="flex-shrink-0 mt-0.5" />
                    <div>
                        <strong>Como funciona:</strong> Quando o cliente informa o CEP no checkout do WhatsApp, o sistema calcula a distância até a loja e aplica a tarifa correspondente.
                        O <strong>frete é cobrado apenas no 1º pedido</strong> de cada sacola. Pedidos adicionais na mesma sacola não pagam frete novamente.
                    </div>
                </div>

                {loading ? (
                    <p className="text-gray-400 font-bold animate-pulse">Carregando zonas...</p>
                ) : (
                    <div className="space-y-4">
                        {zones.map((zone, i) => (
                            <div key={i} className="bg-white rounded-[2rem] shadow-sm border border-white p-6">
                                <div className="grid md:grid-cols-6 gap-4 items-end">
                                    <div className="md:col-span-2 space-y-1">
                                        <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Nome da Zona</label>
                                        <input
                                            type="text"
                                            placeholder="Ex: Centro – Até 5km"
                                            className="w-full p-3 bg-soft rounded-xl border-none font-bold text-sm"
                                            value={zone.name}
                                            onChange={e => handleChange(i, "name", e.target.value)}
                                        />
                                    </div>
                                    <div className="space-y-1">
                                        <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">De (km)</label>
                                        <input
                                            type="number" min={0} step={0.5}
                                            className="w-full p-3 bg-soft rounded-xl border-none font-bold text-sm"
                                            value={zone.min_km}
                                            onChange={e => handleChange(i, "min_km", parseFloat(e.target.value))}
                                        />
                                    </div>
                                    <div className="space-y-1">
                                        <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Até (km)</label>
                                        <input
                                            type="number" min={0} step={0.5}
                                            placeholder="Sem limite"
                                            className="w-full p-3 bg-soft rounded-xl border-none font-bold text-sm"
                                            value={zone.max_km ?? ""}
                                            onChange={e => handleChange(i, "max_km", e.target.value ? parseFloat(e.target.value) : null)}
                                        />
                                    </div>
                                    <div className="space-y-1">
                                        <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Taxa Fixa (R$)</label>
                                        <input
                                            type="number" min={0} step={0.5}
                                            className="w-full p-3 bg-soft rounded-xl border-none font-bold text-sm"
                                            value={zone.base_fee}
                                            onChange={e => handleChange(i, "base_fee", parseFloat(e.target.value))}
                                        />
                                    </div>
                                    <div className="space-y-1">
                                        <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">+ R$/km extra</label>
                                        <input
                                            type="number" min={0} step={0.5}
                                            className="w-full p-3 bg-soft rounded-xl border-none font-bold text-sm"
                                            value={zone.extra_per_km}
                                            onChange={e => handleChange(i, "extra_per_km", parseFloat(e.target.value))}
                                        />
                                    </div>
                                    <button
                                        onClick={() => removeZone(i)}
                                        className="p-3 hover:bg-red-50 rounded-xl text-red-400 transition-colors justify-self-center"
                                    >
                                        <Trash2 size={18} />
                                    </button>
                                </div>

                                {/* Preview da regra */}
                                <div className="mt-3 px-2 text-xs text-gray-400 font-bold">
                                    📦 {zone.min_km}km {zone.max_km ? `até ${zone.max_km}km` : "em diante"} →
                                    R$ {Number(zone.base_fee).toFixed(2)} fixo{zone.extra_per_km > 0 ? ` + R$ ${zone.extra_per_km.toFixed(2)}/km` : ""}
                                </div>
                            </div>
                        ))}

                        <button
                            onClick={addZone}
                            className="w-full py-4 border-2 border-dashed border-gray-200 rounded-[2rem] text-gray-400 font-black flex items-center justify-center gap-2 hover:border-primary/40 hover:text-primary transition-colors"
                        >
                            <Plus size={18} />
                            Adicionar Zona
                        </button>
                    </div>
                )}
            </main>
        </div>
    );
}
