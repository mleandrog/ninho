"use client";

import { Input } from "@/components/ui/Input";

interface AddressFormProps {
    data: any;
    onChange: (field: string, value: string) => void;
}

export function AddressForm({ data, onChange }: AddressFormProps) {
    return (
        <div className="bg-white p-8 rounded-[2.5rem] shadow-premium border border-white/20 space-y-6">
            <h2 className="text-2xl font-black text-muted-text flex items-center gap-3">
                📍 Endereço de Entrega
            </h2>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="md:col-span-1">
                    <Input
                        label="CEP"
                        placeholder="00000-000"
                        value={data.zipcode || ""}
                        onChange={(e) => onChange("zipcode", e.target.value)}
                        required
                    />
                </div>
                <div className="md:col-span-2">
                    <Input
                        label="Logradouro (Rua/Avenida)"
                        placeholder="Ex: Rua das Flores"
                        value={data.street || ""}
                        onChange={(e) => onChange("street", e.target.value)}
                        required
                    />
                </div>
                <div className="md:col-span-1">
                    <Input
                        label="Número"
                        placeholder="123"
                        value={data.number || ""}
                        onChange={(e) => onChange("number", e.target.value)}
                        required
                    />
                </div>
                <div className="md:col-span-1">
                    <Input
                        label="Complemento"
                        placeholder="Apto 101"
                        value={data.complement || ""}
                        onChange={(e) => onChange("complement", e.target.value)}
                    />
                </div>
                <div className="md:col-span-1">
                    <Input
                        label="Bairro"
                        placeholder="Centro"
                        value={data.neighborhood || ""}
                        onChange={(e) => onChange("neighborhood", e.target.value)}
                        required
                    />
                </div>
                <div className="md:col-span-1">
                    <Input
                        label="Cidade"
                        placeholder="Sua Cidade"
                        value={data.city || ""}
                        onChange={(e) => onChange("city", e.target.value)}
                        required
                    />
                </div>
            </div>
        </div>
    );
}
