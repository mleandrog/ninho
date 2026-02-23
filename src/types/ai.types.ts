// Tipos para integração com IA (Groq)

export interface ChatRequest {
    phone: string;
    message: string;
}

export interface ChatResponse {
    reply: string;
    metadata?: {
        function_called?: string;
        data?: any;
    };
}

export interface CustomerBag {
    id: string;
    status: 'open' | 'closed' | 'abandoned';
    items: BagItem[];
    total_amount: number;
    created_at: string;
    last_interaction: string;
}

export interface BagItem {
    id: string;
    product_id: number;
    product_name: string;
    product_price: number;
    quantity: number;
    added_at: string;
}

export interface CustomerOrder {
    id: string;
    order_number: string;
    total_amount: number;
    status: string;
    created_at: string;
    items: OrderItem[];
}

export interface OrderItem {
    product_name: string;
    quantity: number;
    price: number;
}

export interface CustomerStats {
    total_orders: number;
    total_spent: number;
    pending_bags: number;
    last_order_date?: string;
}

export interface AIFunction {
    name: string;
    description: string;
    parameters: {
        type: string;
        properties: Record<string, any>;
        required: string[];
    };
}
