// Cálculo de Frete por KM
const KM_RATE = 2.50; // R$ 2,50 por KM
const MIN_FEE = 10.00; // Valor mínimo de frete

// Coordenadas da Loja Ninho Lar (Exemplo: São Paulo Centro)
const STORE_COORDS = {
    lat: -23.550520,
    lng: -46.633308
};

export const deliveryService = {
    /**
     * Calcula a distância em KM entre dois pontos (Haversine)
     */
    calculateDistance(lat2: number, lng2: number) {
        const R = 6371; // Raio da Terra em KM
        const dLat = (lat2 - STORE_COORDS.lat) * Math.PI / 180;
        const dLon = (lng2 - STORE_COORDS.lng) * Math.PI / 180;

        const a =
            Math.sin(dLat / 2) * Math.sin(dLat / 2) +
            Math.cos(STORE_COORDS.lat * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
            Math.sin(dLon / 2) * Math.sin(dLon / 2);

        const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
        const distance = R * c;

        return distance;
    },

    /**
     * Retorna o valor do frete baseado nas coordenadas
     */
    calculateFee(lat: number, lng: number) {
        const distance = this.calculateDistance(lat, lng);
        const calculatedFee = distance * KM_RATE;

        return Math.max(MIN_FEE, calculatedFee);
    },

    /**
     * Integração com Geocoding (Converter Endereço em Coordenadas)
     * Utilizando Nominatim (OpenStreetMap) - Gratuito
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
