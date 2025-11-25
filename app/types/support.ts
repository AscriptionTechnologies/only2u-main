export interface SupportTicket {
    id: string;
    user_id: string;
    subject: string | null;
    status: 'open' | 'in_progress' | 'resolved' | 'closed';
    priority: 'low' | 'medium' | 'high' | 'urgent';
    created_at: string;
    updated_at: string;
    resolved_at: string | null;
    last_message_at: string;
    user?: {
        email: string;
        name?: string;
    };
}

export interface SupportMessage {
    id: string;
    ticket_id: string;
    sender_id: string;
    sender_type: 'user' | 'admin';
    message: string;
    is_read: boolean;
    created_at: string;
    updated_at: string;
}
