"use client";

import React, { useState, useRef, useEffect } from "react";
import { Send, Bot, User, Loader2, Sparkles } from "lucide-react";

interface Message {
    role: "user" | "assistant";
    content: string;
}

export default function DataChatPage() {
    const [messages, setMessages] = useState<Message[]>([
        {
            role: "assistant",
            content: "Hello! I'm your Data Assistant. I can help you analyze your dashboard metrics. Ask me about your revenue, orders, or top products.",
        },
    ]);
    const [input, setInput] = useState("");
    const [loading, setLoading] = useState(false);
    const messagesEndRef = useRef<HTMLDivElement>(null);

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    };

    useEffect(() => {
        scrollToBottom();
    }, [messages]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!input.trim() || loading) return;

        const userMessage = input.trim();
        setInput("");
        setMessages((prev) => [...prev, { role: "user", content: userMessage }]);
        setLoading(true);

        try {
            const response = await fetch("/api/data-chat", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    messages: [...messages, { role: "user", content: userMessage }],
                }),
            });

            const data = await response.json();

            if (data.error) {
                throw new Error(data.error);
            }

            setMessages((prev) => [
                ...prev,
                { role: "assistant", content: data.content },
            ]);
        } catch (error) {
            console.error("Chat error:", error);
            setMessages((prev) => [
                ...prev,
                {
                    role: "assistant",
                    content: "Sorry, I encountered an error accessing your data. Please try again later.",
                },
            ]);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="flex flex-col h-[calc(100vh-2rem)] max-w-5xl mx-auto p-4">
            {/* Header */}
            <div className="mb-6">
                <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
                    <Sparkles className="text-[#F53F7A]" />
                    Talk with Data
                </h1>
                <p className="text-gray-500 text-sm mt-1">
                    Ask questions about your sales, users, and product performance.
                </p>
            </div>

            {/* Chat Container */}
            <div className="flex-1 bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden flex flex-col">
                {/* Messages List */}
                <div className="flex-1 overflow-y-auto p-6 space-y-6">
                    {messages.map((msg, idx) => (
                        <div
                            key={idx}
                            className={`flex gap-4 ${msg.role === "user" ? "flex-row-reverse" : "flex-row"
                                }`}
                        >
                            <div
                                className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center ${msg.role === "user"
                                        ? "bg-gray-900 text-white"
                                        : "bg-[#F53F7A]/10 text-[#F53F7A]"
                                    }`}
                            >
                                {msg.role === "user" ? <User size={16} /> : <Bot size={16} />}
                            </div>
                            <div
                                className={`max-w-[80%] rounded-2xl px-5 py-3 text-sm leading-relaxed ${msg.role === "user"
                                        ? "bg-gray-900 text-white rounded-tr-none"
                                        : "bg-gray-50 text-gray-800 rounded-tl-none prose prose-purple max-w-none"
                                    }`}
                            >
                                {/* Simple markdown rendering for now, or just whitespace-pre-wrap */}
                                <div className="whitespace-pre-wrap">{msg.content}</div>
                            </div>
                        </div>
                    ))}
                    {loading && (
                        <div className="flex gap-4">
                            <div className="flex-shrink-0 w-8 h-8 rounded-full bg-[#F53F7A]/10 text-[#F53F7A] flex items-center justify-center">
                                <Bot size={16} />
                            </div>
                            <div className="bg-gray-50 rounded-2xl rounded-tl-none px-5 py-3 flex items-center">
                                <Loader2 className="w-4 h-4 animate-spin text-gray-400" />
                            </div>
                        </div>
                    )}
                    <div ref={messagesEndRef} />
                </div>

                {/* Input Area */}
                <div className="p-4 bg-gray-50 border-t border-gray-100">
                    <form
                        onSubmit={handleSubmit}
                        className="flex items-center gap-3 bg-white p-2 rounded-xl border border-gray-200 shadow-sm focus-within:ring-2 focus-within:ring-[#F53F7A]/20 focus-within:border-[#F53F7A]"
                    >
                        <input
                            type="text"
                            value={input}
                            onChange={(e) => setInput(e.target.value)}
                            placeholder="Ask a question about your data..."
                            className="flex-1 border-none focus:ring-0 text-sm px-3 py-2 bg-transparent"
                            disabled={loading}
                        />
                        <button
                            type="submit"
                            disabled={!input.trim() || loading}
                            className="p-2 rounded-lg bg-[#F53F7A] text-white hover:bg-[#d6336c] disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                        >
                            {loading ? <Loader2 size={18} className="animate-spin" /> : <Send size={18} />}
                        </button>
                    </form>
                </div>
            </div>
        </div>
    );
}
