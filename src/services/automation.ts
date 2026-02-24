import { supabase } from "@/lib/supabase";
import { evolutionService } from "@/services/evolution";

export const automationService = {
    /**
     * Verifica itens na fila que expiraram (processing)
     * e delega para o queueService para avançar a fila.
     */
    async processQueueExpirations() {
        // Fluxo antigo de fila removido. Agora o carrinho é consolidado ao final da campanha.
        console.log('[Automation] processQueueExpirations ignorado (fluxo consolidado ativo).');
    },

    /**
   * Envia alertas para sacolas abertas (10, 20, 30 dias)
   */
    async processBagAlerts() {
        const intervals = [10, 20, 30];
        const now = new Date();

        for (const days of intervals) {
            const targetDate = new Date();
            targetDate.setDate(now.getDate() - days);

            // Buscar sacolas que tiveram a última interação exatamente nesse intervalo
            // (Para simplificar, buscamos sacolas 'open' com last_interaction antiga)
            const { data: bags } = await supabase
                .from("bags")
                .select("*, profiles(full_name, phone)")
                .eq("status", "open")
                .lte("last_interaction", targetDate.toISOString());

            if (bags) {
                for (const bag of bags) {
                    const customerName = bag.profiles?.full_name || "Mãezinha/Paizinho";
                    const customerPhone = bag.profiles?.phone;

                    if (!customerPhone) continue;

                    let message = "";
                    if (days === 10) {
                        message = `Olá ${customerName}! 🧸 Passando para lembrar que sua sacola no Ninho Lar ainda está aberta. Tem peças lindas te esperando! ✨`;
                    } else if (days === 20) {
                        message = `Oi ${customerName}! Sua sacola já está aberta há 20 dias. 🌸 Deseja finalizar agora para garantirmos o envio ou quer adicionar algo mais?`;
                    } else if (days === 30) {
                        message = `Atenção ${customerName}! ⚠️ Sua sacola completou 30 dias. Precisamos que você escolha entre finalizar o pedido ou liberar as peças para outras crianças. Como podemos te ajudar?`;
                    }

                    if (message) {
                        await evolutionService.sendMessage(customerPhone, message);
                        // Atualizar last_interaction para não repetir o alerta no mesmo dia
                        await supabase
                            .from("bags")
                            .update({ last_interaction: now.toISOString() })
                            .eq("id", bag.id);
                    }
                }
            }
        }
    }
};
