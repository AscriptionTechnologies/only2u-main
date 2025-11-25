"use client";

import React, { useEffect, useState, useRef } from "react";
import { supabase } from "../../../lib/supabase";
import { SupportTicket, SupportMessage } from "../../types/support";
import { Loader2, Send, Search, Filter, CheckCircle, XCircle } from "lucide-react";
import { toast } from "react-hot-toast";
import { format } from "date-fns";

export default function SupportPage() {
    const [tickets, setTickets] = useState<SupportTicket[]>([]);
    const [selectedTicket, setSelectedTicket] = useState<SupportTicket | null>(null);
    const [messages, setMessages] = useState<SupportMessage[]>([]);
    const [newMessage, setNewMessage] = useState("");
    const [isLoadingTickets, setIsLoadingTickets] = useState(true);
    const [isLoadingMessages, setIsLoadingMessages] = useState(false);
    const [isSending, setIsSending] = useState(false);
    const [filterStatus, setFilterStatus] = useState<'all' | 'open' | 'resolved'>('all');
    const messagesEndRef = useRef<HTMLDivElement>(null);
    const [adminId, setAdminId] = useState<string | null>(null);

    // Fetch current admin ID
    useEffect(() => {
        const getAdminId = async () => {
            const { data: { user } } = await supabase.auth.getUser();
            if (user) setAdminId(user.id);
        };
        getAdminId();
    }, []);

    // Fetch tickets
    useEffect(() => {
        fetchTickets();

        // Subscribe to new tickets
        const ticketSubscription = supabase
            .channel('public:support_tickets')
            .on('postgres_changes', { event: '*', schema: 'public', table: 'support_tickets' }, (payload) => {
                fetchTickets(); // Refresh list on any change
            })
            .subscribe();

        return () => {
            supabase.removeChannel(ticketSubscription);
        };
    }, [filterStatus]);

    const fetchTickets = async () => {
        try {
            let query = supabase
                .from('support_tickets')
                .select('*, user:users(email, name)') // Assuming users table has these fields
                .order('last_message_at', { ascending: false });

            if (filterStatus !== 'all') {
                if (filterStatus === 'open') {
                    query = query.in('status', ['open', 'in_progress']);
                } else {
                    query = query.eq('status', filterStatus);
                }
            }

            const { data, error } = await query;

            if (error) {
                console.error('Supabase error details:', JSON.stringify(error, null, 2));
                throw error;
            }
            setTickets(data || []);
        } catch (error: any) {
            console.error('Error fetching tickets:', error);
            if (error.message?.includes('users')) {
                // Fallback: try fetching without user join
                try {
                    console.log('Retrying without user join...');
                    const { data, error: retryError } = await supabase
                        .from('support_tickets')
                        .select('*')
                        .order('last_message_at', { ascending: false });

                    if (retryError) throw retryError;
                    setTickets(data || []);
                    toast.success('Loaded tickets (user details unavailable)');
                    return;
                } catch (e) {
                    console.error('Retry failed:', e);
                }
            }
            toast.error('Failed to load tickets: ' + (error.message || 'Unknown error'));
        } finally {
            setIsLoadingTickets(false);
        }
    };

    // Fetch messages when ticket is selected
    useEffect(() => {
        if (!selectedTicket) return;

        setIsLoadingMessages(true);
        fetchMessages(selectedTicket.id);

        // Subscribe to new messages for this ticket
        const messageSubscription = supabase
            .channel(`public:support_messages:ticket_id=eq.${selectedTicket.id}`)
            .on('postgres_changes', {
                event: 'INSERT',
                schema: 'public',
                table: 'support_messages',
                filter: `ticket_id=eq.${selectedTicket.id}`
            }, (payload) => {
                const newMessage = payload.new as SupportMessage;
                setMessages(prev => [...prev, newMessage]);
                scrollToBottom();
            })
            .subscribe();

        return () => {
            supabase.removeChannel(messageSubscription);
        };
    }, [selectedTicket]);

    const fetchMessages = async (ticketId: string) => {
        try {
            const { data, error } = await supabase
                .from('support_messages')
                .select('*')
                .eq('ticket_id', ticketId)
                .order('created_at', { ascending: true });

            if (error) throw error;
            setMessages(data || []);
            scrollToBottom();
        } catch (error) {
            console.error('Error fetching messages:', error);
            toast.error('Failed to load messages');
        } finally {
            setIsLoadingMessages(false);
        }
    };

    const scrollToBottom = () => {
        setTimeout(() => {
            messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
        }, 100);
    };

    const handleSendMessage = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!newMessage.trim() || !selectedTicket || !adminId) return;

        setIsSending(true);
        try {
            const { error } = await supabase
                .from('support_messages')
                .insert({
                    ticket_id: selectedTicket.id,
                    sender_id: adminId,
                    sender_type: 'admin',
                    message: newMessage.trim(),
                });

            if (error) throw error;
            setNewMessage("");

            // Update ticket status to in_progress if it was open
            if (selectedTicket.status === 'open') {
                await updateTicketStatus(selectedTicket.id, 'in_progress');
            }
        } catch (error) {
            console.error('Error sending message:', error);
            toast.error('Failed to send message');
        } finally {
            setIsSending(false);
        }
    };

    const updateTicketStatus = async (ticketId: string, status: SupportTicket['status']) => {
        try {
            const { error } = await supabase
                .from('support_tickets')
                .update({
                    status,
                    resolved_at: status === 'resolved' ? new Date().toISOString() : null
                })
                .eq('id', ticketId);

            if (error) throw error;

            // Update local state
            setTickets(prev => prev.map(t =>
                t.id === ticketId ? { ...t, status } : t
            ));
            if (selectedTicket?.id === ticketId) {
                setSelectedTicket(prev => prev ? { ...prev, status } : null);
            }

            toast.success(`Ticket marked as ${status}`);
        } catch (error) {
            console.error('Error updating ticket status:', error);
            toast.error('Failed to update ticket status');
        }
    };

    return (
        <div className="flex h-[calc(100vh-100px)] bg-gray-50 rounded-lg overflow-hidden border border-gray-200">
            {/* Sidebar - Ticket List */}
            <div className="w-1/3 border-r border-gray-200 bg-white flex flex-col">
                <div className="p-4 border-b border-gray-200">
                    <h2 className="text-lg font-semibold text-gray-800 mb-4">Support Tickets</h2>
                    <div className="flex gap-2">
                        <button
                            onClick={() => setFilterStatus('all')}
                            className={`px-3 py-1.5 text-sm rounded-full transition-colors ${filterStatus === 'all'
                                ? 'bg-[#F53F7A] text-white'
                                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                                }`}
                        >
                            All
                        </button>
                        <button
                            onClick={() => setFilterStatus('open')}
                            className={`px-3 py-1.5 text-sm rounded-full transition-colors ${filterStatus === 'open'
                                ? 'bg-[#F53F7A] text-white'
                                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                                }`}
                        >
                            Open
                        </button>
                        <button
                            onClick={() => setFilterStatus('resolved')}
                            className={`px-3 py-1.5 text-sm rounded-full transition-colors ${filterStatus === 'resolved'
                                ? 'bg-[#F53F7A] text-white'
                                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                                }`}
                        >
                            Resolved
                        </button>
                    </div>
                </div>

                <div className="flex-1 overflow-y-auto">
                    {isLoadingTickets ? (
                        <div className="flex justify-center items-center h-full">
                            <Loader2 className="w-6 h-6 animate-spin text-[#F53F7A]" />
                        </div>
                    ) : tickets.length === 0 ? (
                        <div className="flex flex-col items-center justify-center h-full text-gray-500">
                            <p>No tickets found</p>
                        </div>
                    ) : (
                        <div className="divide-y divide-gray-100">
                            {tickets.map((ticket) => (
                                <div
                                    key={ticket.id}
                                    onClick={() => setSelectedTicket(ticket)}
                                    className={`p-4 cursor-pointer hover:bg-gray-50 transition-colors ${selectedTicket?.id === ticket.id ? 'bg-[#F53F7A]/5 border-l-4 border-[#F53F7A]' : 'border-l-4 border-transparent'
                                        }`}
                                >
                                    <div className="flex justify-between items-start mb-1">
                                        <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${ticket.status === 'open' ? 'bg-green-100 text-green-700' :
                                            ticket.status === 'in_progress' ? 'bg-blue-100 text-blue-700' :
                                                'bg-gray-100 text-gray-700'
                                            }`}>
                                            {ticket.status.replace('_', ' ')}
                                        </span>
                                        <span className="text-xs text-gray-400">
                                            {format(new Date(ticket.last_message_at), 'MMM d, HH:mm')}
                                        </span>
                                    </div>
                                    <h3 className="font-medium text-gray-900 truncate mb-1">
                                        {ticket.subject || 'No Subject'}
                                    </h3>
                                    <p className="text-sm text-gray-500 truncate">
                                        User: {ticket.user?.name || ticket.user?.email || 'Unknown User'}
                                    </p>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>

            {/* Main Chat Area */}
            <div className="flex-1 flex flex-col bg-gray-50">
                {selectedTicket ? (
                    <>
                        {/* Chat Header */}
                        <div className="p-4 bg-white border-b border-gray-200 flex justify-between items-center shadow-sm">
                            <div>
                                <h3 className="font-semibold text-gray-800">
                                    {selectedTicket.subject || 'Support Request'}
                                </h3>
                                <p className="text-sm text-gray-500">
                                    Ticket #{selectedTicket.id.slice(0, 8)} • {selectedTicket.user?.email}
                                </p>
                            </div>
                            <div className="flex gap-2">
                                {selectedTicket.status !== 'resolved' && (
                                    <button
                                        onClick={() => updateTicketStatus(selectedTicket.id, 'resolved')}
                                        className="flex items-center gap-2 px-3 py-1.5 text-sm font-medium text-green-700 bg-green-50 hover:bg-green-100 rounded-lg transition-colors"
                                    >
                                        <CheckCircle size={16} />
                                        Mark Resolved
                                    </button>
                                )}
                                {selectedTicket.status === 'resolved' && (
                                    <button
                                        onClick={() => updateTicketStatus(selectedTicket.id, 'open')}
                                        className="flex items-center gap-2 px-3 py-1.5 text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
                                    >
                                        <XCircle size={16} />
                                        Reopen
                                    </button>
                                )}
                            </div>
                        </div>

                        {/* Messages Area */}
                        <div className="flex-1 overflow-y-auto p-4 space-y-4">
                            {isLoadingMessages ? (
                                <div className="flex justify-center items-center h-full">
                                    <Loader2 className="w-6 h-6 animate-spin text-[#F53F7A]" />
                                </div>
                            ) : messages.length === 0 ? (
                                <div className="flex flex-col items-center justify-center h-full text-gray-400">
                                    <p>No messages yet</p>
                                </div>
                            ) : (
                                messages.map((msg) => (
                                    <div
                                        key={msg.id}
                                        className={`flex ${msg.sender_type === 'admin' ? 'justify-end' : 'justify-start'}`}
                                    >
                                        <div
                                            className={`max-w-[70%] rounded-2xl px-4 py-2 shadow-sm ${msg.sender_type === 'admin'
                                                ? 'bg-[#F53F7A] text-white rounded-br-none'
                                                : 'bg-white text-gray-800 border border-gray-200 rounded-bl-none'
                                                }`}
                                        >
                                            <p className="text-sm whitespace-pre-wrap">{msg.message}</p>
                                            <p className={`text-[10px] mt-1 ${msg.sender_type === 'admin' ? 'text-white/80' : 'text-gray-400'
                                                }`}>
                                                {format(new Date(msg.created_at), 'HH:mm')}
                                            </p>
                                        </div>
                                    </div>
                                ))
                            )}
                            <div ref={messagesEndRef} />
                        </div>

                        {/* Input Area */}
                        <div className="p-4 bg-white border-t border-gray-200">
                            <form onSubmit={handleSendMessage} className="flex gap-2">
                                <input
                                    type="text"
                                    value={newMessage}
                                    onChange={(e) => setNewMessage(e.target.value)}
                                    placeholder="Type your reply..."
                                    className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#F53F7A] focus:border-transparent"
                                    disabled={isSending}
                                />
                                <button
                                    type="submit"
                                    disabled={!newMessage.trim() || isSending}
                                    className="px-4 py-2 bg-[#F53F7A] text-white rounded-lg hover:bg-[#d63368] disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center gap-2"
                                >
                                    {isSending ? (
                                        <Loader2 className="w-5 h-5 animate-spin" />
                                    ) : (
                                        <Send size={20} />
                                    )}
                                </button>
                            </form>
                        </div>
                    </>
                ) : (
                    <div className="flex-1 flex flex-col items-center justify-center text-gray-400 bg-gray-50">
                        <MessageCircle size={48} className="mb-4 opacity-20" />
                        <p className="text-lg font-medium">Select a ticket to start chatting</p>
                    </div>
                )}
            </div>
        </div>
    );
}

function MessageCircle({ size, className }: { size: number, className?: string }) {
    return (
        <svg
            xmlns="http://www.w3.org/2000/svg"
            width={size}
            height={size}
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            className={className}
        >
            <path d="M7.9 20A9 9 0 1 0 4 16.1L2 22Z" />
        </svg>
    );
}
