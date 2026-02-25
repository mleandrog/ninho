import { supabaseAdmin as supabase } from "@/lib/supabaseAdmin";
import { evolutionService } from "@/services/evolution";
import { queueService } from "@/services/queue";

export const automationService = {
    /**
     * Verifica itens na fila com status 'notified' que já passaram do tempo de expiração.
     * Para cada item expirado, chama releaseItem() que notifica o próximo ou reativa o produto.
     */
    async processQueueExpirations() {
        console.log('[Automation] Verificando itens expirados na priority_queue...');

        // Buscar configurações para saber o tempo de expiração do carrinho
        const { data: settings } = await supabase
            .from('whatsapp_settings')
            .select('cart_expiration_minutes')
            .limit(1)
            .single();

        const expirationMinutes = settings?.cart_expiration_minutes || 60;
        const cutoff = new Date(Date.now() - expirationMinutes * 60 * 1000).toISOString();

        // Buscar itens 'notified' criados antes do cutoff (já expiraram)
        const { data: expiredItems, error } = await supabase
            .from('priority_queue')
            .select('id, customer_name, product_id')
            .eq('status', 'notified')
            .lt('created_at', cutoff);

        if (error) {
            console.error('[Automation] Erro ao buscar itens expirados:', error);
            return;
        }

        if (!expiredItems || expiredItems.length === 0) {
            console.log('[Automation] Nenhum item expirado encontrado.');
            return;
        }

        console.log(`[Automation] ${expiredItems.length} item(ns) expirado(s) encontrado(s). Processando...`);

        for (const item of expiredItems) {
            try {
                const result = await queueService.releaseItem(item.id, 'expired');
                console.log(`[Automation] Item ${item.id} processado:`, result);
            } catch (err) {
                console.error(`[Automation] Erro ao processar item ${item.id}:`, err);
            }
        }

        console.log('[Automation] processQueueExpirations concluído.');
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
