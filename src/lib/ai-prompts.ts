import type { AIFunction } from '@/types/ai.types';

/**
 * System prompt para a IA da Ninho & Lar
 */
export const SYSTEM_PROMPT = `Você é a assistente virtual da Ninho & Lar, uma loja de moda infantil brasileira.

**Sua Personalidade:**
- Amigável, calorosa e prestativa
- Use emojis com moderação (🧸 👶 ✨ 💝)
- Sempre trate o cliente com carinho
- Seja objetiva e clara nas respostas

**Suas Funções:**
- Consultar sacolas pendentes do cliente
- Verificar histórico de pedidos
- Informar sobre o último pedido
- Fornecer estatísticas de compras

**Regras Importantes:**
1. SEMPRE use as funções disponíveis para buscar informações reais do banco de dados
2. NÃO invente informações - se não souber, seja honesta
3. Formate valores em reais (R$) com 2 casas decimais
4. Formate datas de forma amigável (ex: "15 de fevereiro de 2026")
5. Se o cliente perguntar algo fora do seu escopo, oriente-o a falar com o atendimento humano

**Tom de Voz:**
- "Olá! 👋 Como posso te ajudar hoje?"
- "Deixa eu verificar isso pra você..."
- "Encontrei aqui! 🎉"
- "Qualquer dúvida, estou por aqui! 💝"`;

/**
 * Definições de funções disponíveis para a IA (Function Calling)
 */
export const AI_FUNCTIONS: AIFunction[] = [
    {
        name: 'getCustomerBags',
        description: 'Busca sacolas pendentes (abertas) do cliente. Use quando o cliente perguntar sobre sacolas, produtos guardados ou itens pendentes.',
        parameters: {
            type: 'object',
            properties: {
                phone: {
                    type: 'string',
                    description: 'Número de telefone do cliente (com DDI, ex: 5511999999999)',
                },
            },
            required: ['phone'],
        },
    },
    {
        name: 'getCustomerOrders',
        description: 'Busca histórico completo de pedidos do cliente. Use quando o cliente perguntar sobre compras anteriores, histórico ou pedidos passados.',
        parameters: {
            type: 'object',
            properties: {
                phone: {
                    type: 'string',
                    description: 'Número de telefone do cliente (com DDI, ex: 5511999999999)',
                },
            },
            required: ['phone'],
        },
    },
    {
        name: 'getLastOrder',
        description: 'Busca o último pedido realizado pelo cliente. Use quando o cliente perguntar especificamente sobre o pedido mais recente.',
        parameters: {
            type: 'object',
            properties: {
                phone: {
                    type: 'string',
                    description: 'Número de telefone do cliente (com DDI, ex: 5511999999999)',
                },
            },
            required: ['phone'],
        },
    },
    {
        name: 'getCustomerStats',
        description: 'Busca estatísticas gerais do cliente (total gasto, quantidade de pedidos, sacolas pendentes). Use quando o cliente perguntar sobre resumo geral ou estatísticas.',
        parameters: {
            type: 'object',
            properties: {
                phone: {
                    type: 'string',
                    description: 'Número de telefone do cliente (com DDI, ex: 5511999999999)',
                },
            },
            required: ['phone'],
        },
    },
];

/**
 * Formata valor monetário para reais
 */
export function formatCurrency(value: number): string {
    return new Intl.NumberFormat('pt-BR', {
        style: 'currency',
        currency: 'BRL',
    }).format(value);
}

/**
 * Formata data de forma amigável
 */
export function formatDate(dateString: string): string {
    const date = new Date(dateString);
    return new Intl.DateTimeFormat('pt-BR', {
        day: 'numeric',
        month: 'long',
        year: 'numeric',
    }).format(date);
}
