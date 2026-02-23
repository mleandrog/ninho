import { supabase } from "@/lib/supabase";

const GROQ_API_KEY = process.env.GROQ_API_KEY;

export const aiService = {
    async processQuery(phone: string, query: string) {
        try {
            // 1. Buscar histórico real do cliente no Supabase
            const { data: customer } = await supabase
                .from("profiles")
                .select("*")
                .eq("phone", phone)
                .single();

            const { data: orders } = await supabase
                .from("orders")
                .select("*, products(name)")
                .eq("customer_id", customer?.id)
                .order("created_at", { ascending: false });

            const { data: bags } = await supabase
                .from("bags")
                .select("*, bag_items(*, products(name))")
                .eq("customer_id", customer?.id)
                .eq("status", "open");

            // 2. Preparar contexto para o Groq
            const context = `
        Você é a assistente inteligente da loja Ninho Lar.
        Cliente: ${customer?.full_name || "Usuário"}
        Histórico de Pedidos: ${JSON.stringify(orders)}
        Sacolas Abertas: ${JSON.stringify(bags)}
        
        Responda de forma carinhosa, lúdica e eficiente. 
        Se o cliente perguntar sobre sacolas, informe o prazo de 10/20/30 dias.
        Se perguntar sobre pedidos, diga os nomes dos produtos.
      `;

            // 3. Chamada para Groq Cloud
            const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
                method: "POST",
                headers: {
                    "Authorization": `Bearer ${GROQ_API_KEY}`,
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({
                    model: "llama-3.3-70b-versatile",
                    messages: [
                        { role: "system", content: context },
                        { role: "user", content: query }
                    ],
                    temperature: 0.7,
                }),
            });

            const result = await response.json();
            return result.choices?.[0]?.message?.content || "Desculpe, não consegui processar seu pedido agora.";
        } catch (error) {
            console.error("Erro no processamento IA:", error);
            return "Estou com um probleminha para acessar seu histórico. Pode me perguntar novamente em instantes?";
        }
    }
};
