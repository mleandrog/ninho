import { NextRequest, NextResponse } from 'next/server';
import { groq, GROQ_CONFIG } from '@/lib/groq';
import { SYSTEM_PROMPT, AI_FUNCTIONS } from '@/lib/ai-prompts';
import {
    getCustomerBags,
    getCustomerOrders,
    getLastOrder,
    getCustomerStats,
} from '@/lib/ai-queries';
import type { ChatRequest, ChatResponse } from '@/types/ai.types';

export async function POST(request: NextRequest) {
    try {
        const body: ChatRequest = await request.json();
        const { phone, message } = body;

        if (!phone || !message) {
            return NextResponse.json(
                { error: 'Phone e message são obrigatórios' },
                { status: 400 }
            );
        }

        // Primeira chamada: identificar intenção e executar function calling
        const completion = await groq.chat.completions.create({
            ...GROQ_CONFIG,
            messages: [
                { role: 'system', content: SYSTEM_PROMPT },
                { role: 'user', content: message },
            ],
            tools: AI_FUNCTIONS.map((fn) => ({
                type: 'function' as const,
                function: fn,
            })),
            tool_choice: 'auto',
        });

        const responseMessage = completion.choices[0]?.message;

        // Se a IA decidiu chamar uma função
        if (responseMessage?.tool_calls && responseMessage.tool_calls.length > 0) {
            const toolCall = responseMessage.tool_calls[0];
            const functionName = toolCall.function.name;
            const functionArgs = JSON.parse(toolCall.function.arguments);

            // Executar a função correspondente
            let functionResult: any;
            switch (functionName) {
                case 'getCustomerBags':
                    functionResult = await getCustomerBags(phone);
                    break;
                case 'getCustomerOrders':
                    functionResult = await getCustomerOrders(phone);
                    break;
                case 'getLastOrder':
                    functionResult = await getLastOrder(phone);
                    break;
                case 'getCustomerStats':
                    functionResult = await getCustomerStats(phone);
                    break;
                default:
                    functionResult = { error: 'Função não encontrada' };
            }

            // Segunda chamada: gerar resposta com base no resultado da função
            const finalCompletion = await groq.chat.completions.create({
                ...GROQ_CONFIG,
                messages: [
                    { role: 'system', content: SYSTEM_PROMPT },
                    { role: 'user', content: message },
                    responseMessage,
                    {
                        role: 'tool',
                        tool_call_id: toolCall.id,
                        content: JSON.stringify(functionResult),
                    },
                ],
            });

            const reply = finalCompletion.choices[0]?.message?.content || 'Desculpe, não consegui processar sua solicitação.';

            const response: ChatResponse = {
                reply,
                metadata: {
                    function_called: functionName,
                    data: functionResult,
                },
            };

            return NextResponse.json(response);
        }

        // Se não houve function calling, retornar resposta direta
        const reply = responseMessage?.content || 'Desculpe, não entendi. Pode reformular?';

        const response: ChatResponse = {
            reply,
        };

        return NextResponse.json(response);
    } catch (error: any) {
        console.error('Erro no chat AI:', error);
        return NextResponse.json(
            { error: 'Erro ao processar mensagem', details: error.message },
            { status: 500 }
        );
    }
}
