const EVOLUTION_API_URL = process.env.EVOLUTION_API_URL;
const EVOLUTION_API_KEY = process.env.EVOLUTION_API_KEY;
const INSTANCE_NAME = process.env.EVOLUTION_INSTANCE_NAME;

export const evolutionService = {
    async sendMessage(phone: string, text: string) {
        try {
            console.log(`[Evolution] Enviando texto para ${phone}...`);
            const apiUrl = `${EVOLUTION_API_URL}/message/sendText/${INSTANCE_NAME}`;
            const apiKey = EVOLUTION_API_KEY || '';

            const response = await fetch(apiUrl, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'apikey': apiKey,
                },
                body: JSON.stringify({
                    number: phone,
                    text: text,
                    delay: 1200,
                    linkPreview: false
                }),
            });

            const data = await response.json();
            console.log(`[Evolution] Resposta sendMessage (${phone}):`, JSON.stringify(data));
            return data;
        } catch (error) {
            console.error('Erro ao enviar mensagem WhatsApp:', error);
            throw error;
        }
    },

    async sendMedia(phone: string, mediaUrl: string, caption: string, fileName: string) {
        try {
            console.log(`[Evolution] Enviando mídia para ${phone}...`);
            const response = await fetch(`${EVOLUTION_API_URL}/message/sendMedia/${INSTANCE_NAME}`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'apikey': EVOLUTION_API_KEY || '',
                },
                body: JSON.stringify({
                    number: phone,
                    mediatype: 'image',
                    mimetype: 'image/jpeg',
                    caption: caption,
                    media: mediaUrl,
                    fileName: fileName
                }),
            });

            const data = await response.json();
            console.log(`[Evolution] Resposta sendMedia:`, JSON.stringify(data));
            return data;
        } catch (error) {
            console.error('Erro ao enviar mídia WhatsApp:', error);
            throw error;
        }
    },

    // Gerar link formatado para checkout rápido via MP
    generateCheckoutLink(orderId: string, amount: number) {
        // Esta URL deve apontar para uma página que redireciona para o MP ou o próprio link do MP
        const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
        return `${baseUrl}/checkout/whatsapp?orderId=${orderId}`;
    },

    // Instance Management
    async getConnectionStatus() {
        const res = await fetch('/api/whatsapp/instance?action=status');
        return await res.json();
    },

    async connectInstance() {
        const res = await fetch('/api/whatsapp/instance?action=connect');
        return await res.json();
    },

    async logoutInstance() {
        const res = await fetch('/api/whatsapp/instance?action=logout', { method: 'POST' });
        return await res.json();
    },

    async fetchAllGroups() {
        const res = await fetch('/api/whatsapp/groups');
        return await res.json();
    },

    async registerWebhook(url: string) {
        const res = await fetch('/api/whatsapp/instance?action=webhook', {
            method: 'POST',
            body: JSON.stringify({ url })
        });
        return await res.json();
    }
};
