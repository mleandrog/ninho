import { supabase } from "@/lib/supabase";

export const deliveryService = {
    /**
     * Calcula a distância em KM entre dois pontos (Haversine)
     */
    async calculateDistance(lat2: number, lng2: number) {
        // Buscar coordenadas da loja nas configurações
        const { data: settings } = await supabase.from('whatsapp_settings').select('store_lat, store_lng').limit(1).single();

        const storeLat = settings?.store_lat || -23.550520;
        const storeLng = settings?.store_lng || -46.633308;

        const R = 6371; // Raio da Terra em KM
        const dLat = (lat2 - storeLat) * Math.PI / 180;
        const dLon = (lng2 - storeLng) * Math.PI / 180;

        const a =
            Math.sin(dLat / 2) * Math.sin(dLat / 2) +
            Math.cos(storeLat * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
            Math.sin(dLon / 2) * Math.sin(dLon / 2);

        const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
        const distance = R * c;

        return distance;
    },

    /**
     * Retorna o valor do frete baseado nas coordenadas e nas zonas cadastradas
     */
    async calculateFee(lat: number, lng: number) {
        const distance = await this.calculateDistance(lat, lng);

        // Buscar zonas de frete do banco
        const { data: zones } = await supabase
            .from("delivery_fee_zones")
            .select("*")
            .eq("active", true)
            .order("min_km", { ascending: true });

        if (!zones || zones.length === 0) {
            return 10.00; // Fallback se não houver zonas
        }

        // Encontrar a zona correspondente
        const zone = zones.find(z =>
            distance >= z.min_km && (z.max_km === null || distance <= z.max_km)
        );

        if (!zone) {
            // Se estiver fora de todas as zonas, pega a última cadastrada ou um padrão
            const lastZone = zones[zones.length - 1];
            return lastZone.base_fee + (distance * lastZone.extra_per_km);
        }

        return zone.base_fee + (distance * zone.extra_per_km);
    },

    /**
     * Integração com Geocoding (Converter Endereço em Coordenadas)
     */
    async getCoordsFromAddress(address: string) {
        try {
            const response = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(address)}&limit=1`, {
                headers: {
                    'User-Agent': 'NinhoLar-App'
                }
            });
            const data = await response.json();

            if (data && data.length > 0) {
                return {
                    lat: parseFloat(data[0].lat),
                    lng: parseFloat(data[0].lon)
                };
            }
            return null;
        } catch (error) {
            console.error("Erro no Geocoding:", error);
            return null;
        }
    }
};
