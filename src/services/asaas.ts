const ASAAS_API_URL = process.env.ASAAS_API_URL || 'https://api-sandbox.asaas.com/api/v3';
const ASAAS_API_KEY = process.env.ASAAS_API_KEY || '';

/**
 * Serviço de integração com o gateway de pagamento ASAAS.
 * Variáveis necessárias no .env:
 *   ASAAS_API_URL = https://api-sandbox.asaas.com/api/v3 (sandbox) ou https://api.asaas.com/api/v3 (produção)
 *   ASAAS_API_KEY = Sua chave de API ASAAS
 */
export const asaasService = {

    async fetchApi(endpoint: string, method = 'GET', body?: object) {
        const response = await fetch(`${ASAAS_API_URL}${endpoint}`, {
            method,
            headers: {
                'Content-Type': 'application/json',
                'access_token': ASAAS_API_KEY,
            },
            ...(body ? { body: JSON.stringify(body) } : {}),
        });

        if (!response.ok) {
            const err = await response.text();
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
