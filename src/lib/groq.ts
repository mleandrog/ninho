import Groq from 'groq-sdk';

if (!process.env.GROQ_API_KEY) {
    throw new Error('GROQ_API_KEY não configurada no .env.local');
}

export const groq = new Groq({
    apiKey: process.env.GROQ_API_KEY,
});

// Configurações padrão para o modelo
export const GROQ_CONFIG = {
    model: 'llama-3.1-8b-instant',
    temperature: 0.7,
    max_tokens: 500,
    top_p: 1,
    stream: false,
} as const;
