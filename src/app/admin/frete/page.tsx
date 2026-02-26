"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { Plus, Trash2, Save, MapPin, AlertCircle, Loader2 } from "lucide-react";
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
        <div className="animate-in fade-in duration-500">
            <header className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 sm:gap-6 mb-6 sm:mb-8 lg:mb-10">
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 sm:w-12 sm:h-12 bg-primary/10 rounded-xl flex items-center justify-center text-primary shrink-0">
                        <MapPin size={20} className="sm:w-6 sm:h-6" />
                    </div>
                    <div>
                        <h1 className="text-2xl sm:text-3xl lg:text-4xl font-black text-muted-text lowercase tracking-tighter leading-none">Frete</h1>
                        <p className="text-[9px] sm:text-xs lg:text-sm text-gray-400 font-bold mt-1 uppercase tracking-widest leading-tight">Configuração de zonas</p>
                    </div>
                </div>
                <Button onClick={saveAll} disabled={saving} className="w-full sm:w-auto h-11 sm:h-14 px-6 sm:px-8 rounded-xl sm:rounded-2xl gap-2 sm:gap-3 shadow-vibrant font-black text-[10px] sm:text-xs uppercase tracking-widest">
                    {saving ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} className="sm:w-5 sm:h-5" />}
                    {saving ? "Salvando..." : "Salvar Tudo"}
                </Button>
            </header>

            <div className="bg-blue-50/50 border border-blue-100 rounded-xl sm:rounded-2xl p-3 sm:p-4 mb-6 sm:mb-8 flex gap-3 text-[10px] sm:text-xs text-blue-700 leading-relaxed">
                <AlertCircle size={16} className="shrink-0 mt-0.5" />
                <p>
                    <strong className="block sm:inline mb-0.5 sm:mb-0">Como funciona:</strong> O sistema calcula a distância da loja ao CEP do cliente no 1º pedido da sacola.
                    Zonas adicionais na mesma sacola não pagam frete.
                </p>
            </div>

            {loading ? (
                <p className="text-gray-400 font-bold animate-pulse">Carregando zonas...</p>
            ) : (
                <div className="space-y-4 sm:space-y-6">
                    {zones.map((zone, i) => (
                        <div key={i} className="bg-white rounded-2xl sm:rounded-[2.5rem] shadow-premium border border-white p-4 sm:p-6 lg:p-8 hover:border-primary/20 transition-all group relative">
                            <button
                                onClick={() => removeZone(i)}
                                className="absolute top-4 right-4 p-2 bg-soft text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-all"
                            >
                                <Trash2 size={14} />
                            </button>

                            <div className="grid grid-cols-1 md:grid-cols-6 gap-4 sm:gap-6 pt-2">
                                <div className="md:col-span-2 space-y-1.5 sm:space-y-2">
                                    <label className="text-[9px] sm:text-[10px] font-black text-gray-400 uppercase tracking-widest px-1">Nome da Zona</label>
                                    <input
                                        type="text"
                                        placeholder="Ex: Centro"
                                        className="w-full p-3 sm:p-4 bg-soft rounded-xl sm:rounded-2xl border-none font-bold text-xs sm:text-sm focus:ring-2 focus:ring-primary/20 outline-none"
                                        value={zone.name}
                                        onChange={e => handleChange(i, "name", e.target.value)}
                                    />
                                </div>
                                <div className="grid grid-cols-2 md:grid-cols-4 md:col-span-4 gap-4">
                                    <div className="space-y-1.5 sm:space-y-2">
                                        <label className="text-[9px] sm:text-[10px] font-black text-gray-400 uppercase tracking-widest px-1">De (km)</label>
                                        <input
                                            type="number" min={0} step={0.5}
                                            className="w-full p-3 sm:p-4 bg-soft rounded-xl sm:rounded-2xl border-none font-bold text-xs sm:text-sm"
                                            value={zone.min_km}
                                            onChange={e => handleChange(i, "min_km", parseFloat(e.target.value))}
                                        />
                                    </div>
                                    <div className="space-y-1.5 sm:space-y-2">
                                        <label className="text-[9px] sm:text-[10px] font-black text-gray-400 uppercase tracking-widest px-1">Até (km)</label>
                                        <input
                                            type="number" min={0} step={0.5}
                                            placeholder="∞"
                                            className="w-full p-3 sm:p-4 bg-soft rounded-xl sm:rounded-2xl border-none font-bold text-xs sm:text-sm"
                                            value={zone.max_km ?? ""}
                                            onChange={e => handleChange(i, "max_km", e.target.value ? parseFloat(e.target.value) : null)}
                                        />
                                    </div>
                                    <div className="space-y-1.5 sm:space-y-2">
                                        <label className="text-[9px] sm:text-[10px] font-black text-gray-400 uppercase tracking-widest px-1">Fixo (R$)</label>
                                        <input
                                            type="number" min={0} step={0.5}
                                            className="w-full p-3 sm:p-4 bg-soft rounded-xl sm:rounded-2xl border-none font-bold text-xs sm:text-sm"
                                            value={zone.base_fee}
                                            onChange={e => handleChange(i, "base_fee", parseFloat(e.target.value))}
                                        />
                                    </div>
                                    <div className="space-y-1.5 sm:space-y-2">
                                        <label className="text-[9px] sm:text-[10px] font-black text-gray-400 uppercase tracking-widest px-1">Ex. R$/km</label>
                                        <input
                                            type="number" min={0} step={0.5}
                                            className="w-full p-3 sm:p-4 bg-soft rounded-xl sm:rounded-2xl border-none font-bold text-xs sm:text-sm"
                                            value={zone.extra_per_km}
                                            onChange={e => handleChange(i, "extra_per_km", parseFloat(e.target.value))}
                                        />
                                    </div>
                                </div>
                            </div>

                            {/* Preview da regra */}
                            <div className="mt-4 sm:mt-6 pt-3 sm:pt-4 border-t border-gray-50 flex items-center justify-between">
                                <div className="flex items-center gap-2 text-[9px] sm:text-[10px] text-gray-400 font-bold uppercase tracking-widest">
                                    <AlertCircle size={10} className="text-secondary" />
                                    <span>Regra: {zone.min_km}km {zone.max_km ? `até ${zone.max_km} km` : "∞"}</span>
                                </div>
                                <div className="text-[10px] sm:text-xs font-black text-muted-text">
                                    Taxa: <span className="text-primary">R$ {Number(zone.base_fee).toFixed(2)}</span>
                                    {zone.extra_per_km > 0 && <span className="opacity-50"> + R$ {zone.extra_per_km.toFixed(2)}/km</span>}
                                </div>
                            </div>
                        </div>
                    ))}

                    <button
                        onClick={addZone}
                        className="w-full py-6 sm:py-8 border-2 border-dashed border-gray-200 rounded-2xl sm:rounded-[3rem] text-gray-400 font-black flex items-center justify-center gap-2 hover:border-primary/40 hover:text-primary hover:bg-soft/30 transition-all text-sm uppercase tracking-widest"
                    >
                        <Plus size={18} />
                        Adicionar Nova Zona
                    </button>
                </div>
            )}
        </div >
    );
}
