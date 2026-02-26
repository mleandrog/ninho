import { supabaseAdmin as supabase } from '@/lib/supabaseAdmin';

let cachedSettings: { key: string, url: string } | null = null;

export const asaasService = {

    async getCredentials() {
        if (cachedSettings) return cachedSettings;

        // Tentar buscar do banco de dados primeiro
        const { data: settings } = await supabase
            .from('whatsapp_settings')
            .select('asaas_api_key, asaas_api_url')
            .limit(1)
            .single();

        const key = settings?.asaas_api_key || process.env.ASAAS_API_KEY || '';
        const url = settings?.asaas_api_url || process.env.ASAAS_API_URL || 'https://sandbox.asaas.com/api/v3';

        cachedSettings = { key, url };
        return cachedSettings;
    },

    async fetchApi(endpoint: string, method = 'GET', body?: object) {
        const { key, url } = await this.getCredentials();
        const fullUrl = `${url}${endpoint}`;

        const keyInfo = key
            ? `${key.substring(0, 10)}... (Tamanho: ${key.length})`
            : 'VAZIA!';

        console.log(`[Asaas] ${method} ${fullUrl} | KEY: ${keyInfo}`);

        const response = await fetch(fullUrl, {
            method,
            headers: {
                'Content-Type': 'application/json',
                'access_token': key,
            },
            ...(body ? { body: JSON.stringify(body) } : {}),
        });

        if (!response.ok) {
            const err = await response.text();
            console.error(`[Asaas] ❌ Erro ${response.status} em ${fullUrl}: ${err}`);
            throw new Error(`ASAAS API Error ${response.status}: ${err}`);
        }
        return response.json();
    },

    /**
     * Busca um cliente pelo CPF/CNPJ. Se não existir, cria um novo.
     */
    async findOrCreateCustomer(params: {
        name: string;
        phone: string;
        cpfCnpj?: string;
        email?: string;
    }) {
        // Tentar buscar por telefone
        if (params.cpfCnpj) {
            const search = await this.fetchApi(`/customers?cpfCnpj=${params.cpfCnpj}`);
            if (search.data && search.data.length > 0) {
                return search.data[0].id;
            }
        }

        // Criar novo cliente (sem CPF obrigatório, ASAAS permite)
        const customer = await this.fetchApi('/customers', 'POST', {
            name: params.name,
            phone: params.phone,
            cpfCnpj: params.cpfCnpj,
            email: params.email,
        });

        return customer.id;
    },

    /**
     * Gera um QR Code PIX para uma cobrança.
     * @returns { id, encodedImage, payload, expirationDate }
     */
    async createPixPayment(params: {
        customerId: string;
        value: number;
        description: string;
        expirationDate: string; // 'YYYY-MM-DD'
        externalReference?: string; // ID do pedido para rastrear
    }) {
        const charge = await this.fetchApi('/payments', 'POST', {
            customer: params.customerId,
            billingType: 'PIX',
            value: params.value,
            dueDate: params.expirationDate,
            description: params.description,
            externalReference: params.externalReference,
        });

        // Buscar o QR Code do PIX
        const pix = await this.fetchApi(`/payments/${charge.id}/pixQrCode`);
        return {
            chargeId: charge.id,
            invoiceUrl: charge.invoiceUrl,
            qrCode: pix.encodedImage,
            qrCodePayload: pix.payload,
        };
    },

    /**
     * Gera um link de pagamento genérico (Cartão, Boleto, PIX) – o clint escolhe.
     */
    async createPaymentLink(params: {
        customerId: string;
        value: number;
        description: string;
        expirationDate: string;
        externalReference?: string;
    }) {
        const charge = await this.fetchApi('/payments', 'POST', {
            customer: params.customerId,
            billingType: 'UNDEFINED', // Cliente escolhe na tela do ASAAS
            value: params.value,
            dueDate: params.expirationDate,
            description: params.description,
            externalReference: params.externalReference,
        });

        return {
            chargeId: charge.id,
            invoiceUrl: charge.invoiceUrl, // URL da fatura ASAAS
        };
    },

    /**
     * Consulta o status de uma cobrança.
     */
    async getChargeStatus(chargeId: string) {
        const charge = await this.fetchApi(`/payments/${chargeId}`);
        // Status possíveis: PENDING, RECEIVED, CONFIRMED, OVERDUE, REFUNDED, CANCELLED
        return charge.status;
    }
};
