import React, { useState, useRef, useEffect } from 'react';
import { MessageSquare, X, Send, Loader2, Bot, User } from 'lucide-react';
import { supabaseAdmin } from '../lib/supabase'; // only used if we need auth, but we can just use anon key or fetch direct

interface VapiChatBoxProps {
    assistantId: string;
    isOpen: boolean;
    onClose: () => void;
    firstMessage?: string;
}

export const VapiChatBox: React.FC<VapiChatBoxProps> = ({ assistantId, isOpen, onClose, firstMessage }) => {
    const [messages, setMessages] = useState<{ role: string; content: string }[]>([
        { role: 'assistant', content: firstMessage || 'Hi there! I am Aria, your AI receptionist. How can I help you today?' }
    ]);
    const [input, setInput] = useState('');
    const [loading, setLoading] = useState(false);
    const inputRef = useRef<HTMLTextAreaElement>(null);
    const messagesEndRef = useRef<HTMLDivElement>(null);

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    };

    useEffect(() => {
        if (!loading && isOpen) {
            setTimeout(() => {
                inputRef.current?.focus();
            }, 50);
        }
    }, [loading, isOpen]);

    useEffect(() => {
        if (isOpen) {
            scrollToBottom();
        }
    }, [messages, isOpen]);

    const handleSend = async () => {
        if (!input.trim() || !assistantId) return;

        const userMsg = input.trim();
        setInput('');

        const newMessages = [...messages, { role: 'user', content: userMsg }];
        setMessages(newMessages);
        setLoading(true);

        try {
            const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
            const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

            const res = await fetch(`${supabaseUrl}/functions/v1/vapi-text-chat`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${supabaseAnonKey}`,
                    'apikey': supabaseAnonKey
                },
                body: JSON.stringify({
                    assistantId,
                    messages: newMessages.map(m => ({ role: m.role, content: m.content }))
                })
            });

            if (!res.ok) {
                throw new Error("Failed to send message");
            }

            const data = await res.json();
            const rawContent = data?.choices?.[0]?.message?.content || data?.message;
            let aiResponse = "Sorry, I couldn't process that.";
            
            if (typeof rawContent === 'string') {
                aiResponse = rawContent;
            } else if (Array.isArray(rawContent) && rawContent.length > 0) {
                // If Vapi returns an array of messages
                aiResponse = rawContent[0].content || JSON.stringify(rawContent);
            } else if (rawContent && typeof rawContent === 'object') {
                // Usually Vapi returns an object inside 'message' when an error happens
                aiResponse = rawContent.message || rawContent.error || JSON.stringify(rawContent);
            }

            setMessages(prev => [...prev, { role: 'assistant', content: aiResponse }]);

        } catch (error) {
            console.error("Chat error:", error);
            setMessages(prev => [...prev, { role: 'assistant', content: "🚨 Error connecting to the AI. Please try again." }]);
        } finally {
            setLoading(false);
        }
    };

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            handleSend();
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed bottom-6 right-6 w-[380px] h-[550px] max-h-[80vh] bg-[#1A1A1A] border border-white/10 rounded-2xl shadow-2xl flex flex-col z-50 animate-in slide-in-from-bottom-5 fade-in duration-300 overflow-hidden">
            {/* Header */}
            <div className="bg-white/5 border-b border-white/10 p-4 flex justify-between items-center relative overflow-hidden">
                <div className="absolute inset-0 bg-gold-gradient opacity-10 pointer-events-none"></div>

                <div className="flex items-center gap-3 relative z-10">
                    <div className="w-10 h-10 rounded-full bg-luxe-gold/20 border border-luxe-gold/30 flex items-center justify-center">
                        <Bot className="w-5 h-5 text-luxe-gold" />
                    </div>
                    <div>
                        <h3 className="font-bold text-sm text-white flex items-center gap-2">
                            Chat with Bella
                            <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></span>
                        </h3>
                        <p className="text-[10px] text-white/50">Vapi Text Interface</p>
                    </div>
                </div>

                <button
                    onClick={onClose}
                    className="p-2 rounded-full hover:bg-white/10 transition-colors relative z-10 text-white/60 hover:text-white"
                >
                    <X className="w-4 h-4" />
                </button>
            </div>

            {/* Messages Area */}
            <div className="flex-1 p-4 overflow-y-auto flex flex-col gap-4 relative">
                <div className="absolute inset-0 bg-texture-pattern opacity-5 pointer-events-none"></div>

                {messages.map((msg, i) => (
                    <div key={i} className={`flex gap-3 max-w-[85%] ${msg.role === 'user' ? 'ml-auto flex-row-reverse' : ''}`}>
                        <div className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center mt-1 z-10 ${msg.role === 'user' ? 'bg-white/10 border border-white/20' : 'bg-luxe-gold/20 border border-luxe-gold/30'
                            }`}>
                            {msg.role === 'user' ? <User className="w-4 h-4 text-white/70" /> : <Bot className="w-4 h-4 text-luxe-gold" />}
                        </div>
                        <div className={`p-3 rounded-2xl text-sm leading-relaxed whitespace-pre-wrap z-10 ${msg.role === 'user'
                            ? 'bg-white/10 border border-white/10 text-white rounded-tr-sm'
                            : 'bg-luxe-gold/10 border border-luxe-gold/20 text-white/90 rounded-tl-sm'
                            }`}>
                            {msg.content}
                        </div>
                    </div>
                ))}

                {loading && (
                    <div className="flex gap-3 max-w-[85%]">
                        <div className="flex-shrink-0 w-8 h-8 rounded-full bg-luxe-gold/20 border border-luxe-gold/30 flex items-center justify-center mt-1">
                            <Bot className="w-4 h-4 text-luxe-gold" />
                        </div>
                        <div className="p-3 bg-luxe-gold/10 border border-luxe-gold/20 rounded-2xl rounded-tl-sm text-sm">
                            <div className="flex gap-1">
                                <span className="w-1.5 h-1.5 bg-luxe-gold/60 rounded-full animate-bounce"></span>
                                <span className="w-1.5 h-1.5 bg-luxe-gold/60 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></span>
                                <span className="w-1.5 h-1.5 bg-luxe-gold/60 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></span>
                            </div>
                        </div>
                    </div>
                )}
                <div ref={messagesEndRef} />
            </div>

            {/* Input Area */}
            <div className="p-4 bg-white/5 border-t border-white/10">
                <div className="relative flex items-center">
                    <textarea
                        ref={inputRef}
                        value={input}
                        onChange={(e) => setInput(e.target.value)}
                        onKeyDown={handleKeyDown}
                        placeholder="Type a message to book..."
                        className="w-full bg-[#1A1A1A] border border-white/10 rounded-xl pl-4 pr-12 py-3 text-sm text-white placeholder-white/30 focus:outline-none focus:border-luxe-gold/50 resize-none h-[46px] overflow-hidden"
                        rows={1}
                        disabled={loading}
                        autoFocus
                    />
                    <button
                        onClick={handleSend}
                        disabled={!input.trim() || loading}
                        className="absolute right-2 p-2 rounded-lg bg-luxe-gold text-[#1A1A1A] hover:bg-luxe-gold/90 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                    </button>
                </div>
                <div className="text-[10px] text-white/30 text-center mt-2 font-medium">
                    Test your AI Receptionist booking flow
                </div>
            </div>
        </div>
    );
};
