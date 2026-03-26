import React, { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { useTenant } from '../context/TenantContext';
import { X, MessageSquare, Loader2, Send } from 'lucide-react';
import { showToast } from './ui/ToastNotification';

interface ClientProfileModalProps {
    clientId: string | null;
    onClose: () => void;
}

interface ThreadMessage {
    id: string;
    type: string;
    direction: string;
    status: string;
    content: string;
    created_at: string;
}

interface ClientData {
    id: string;
    name: string;
    phone: string;
    email: string | null;
    total_spend: number;
    total_visits: number;
    loyalty_points: number;
    notes: string | null;
}

export const ClientProfileModal: React.FC<ClientProfileModalProps> = ({ clientId, onClose }) => {
    const { tenantId } = useTenant();
    const [client, setClient] = useState<ClientData | null>(null);
    const [activeTab, setActiveTab] = useState<'overview' | 'comms'>('comms');
    const [messages, setMessages] = useState<ThreadMessage[]>([]);
    const [loading, setLoading] = useState(true);
    const [newMessage, setNewMessage] = useState('');
    const [sending, setSending] = useState(false);

    const fetchData = useCallback(async () => {
        setLoading(true);
        // Fetch client details
        const { data: cData } = await supabase
            .from('clients')
            .select('*')
            .eq('id', clientId)
            .single();
        if (cData) setClient(cData as ClientData);

        // Fetch comms
        const { data: msgData } = await supabase
            .from('communications')
            .select('*')
            .eq('client_id', clientId)
            .order('created_at', { ascending: false });
        if (msgData) setMessages(msgData);

        setLoading(false);
    }, [clientId]);

    useEffect(() => {
        if (!clientId || !tenantId) return;
        fetchData();
    }, [clientId, tenantId, fetchData]);

    const handleSendMessage = async () => {
        if (!newMessage.trim() || !client) return;
        setSending(true);

        // 1. Save to DB
        const { error } = await supabase.from('communications').insert({
            tenant_id: tenantId,
            client_id: client.id,
            type: 'sms',
            direction: 'outbound',
            status: 'sent',
            content: newMessage,
        });

        if (!error) {
            showToast('Message sent successfully!');
            setNewMessage('');
            fetchData();
            // TODO: In production, trigger Edge Function here for Bulk SMS / Twilio API
        } else {
            showToast(error.message, 'error');
        }
        setSending(false);
    };

    if (!clientId) return null;

    return (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 lg:p-10 text-white" onClick={onClose}>
            <div className="bg-luxe-obsidian border border-white/10 rounded-2xl w-full max-w-4xl h-full max-h-[90vh] shadow-2xl overflow-hidden flex flex-col" onClick={e => e.stopPropagation()}>
                
                {/* Header */}
                <div className="p-6 border-b border-white/5 flex justify-between items-center bg-white/[0.02]">
                    <div className="flex items-center gap-4">
                        <div className="w-12 h-12 rounded-xl bg-luxe-gold/10 text-luxe-gold flex items-center justify-center font-bold text-xl border border-luxe-gold/20">
                            {client?.name?.charAt(0) || <Loader2 className="animate-spin w-5 h-5"/>}
                        </div>
                        <div>
                            <h2 className="text-xl font-bold">{client?.name || 'Loading...'}</h2>
                            <p className="text-xs text-white/50">{client?.phone} • {client?.email || 'No email'}</p>
                        </div>
                    </div>
                    <button onClick={onClose} className="p-2 hover:bg-white/10 rounded-xl transition-all"><X className="w-6 h-6" /></button>
                </div>

                {/* Tabs */}
                <div className="flex px-6 border-b border-white/5 bg-white/[0.01]">
                    <button 
                        onClick={() => setActiveTab('overview')} 
                        className={`px-4 py-4 text-sm font-bold border-b-2 transition-all ${activeTab === 'overview' ? 'border-luxe-gold text-luxe-gold' : 'border-transparent text-white/50 hover:text-white'}`}
                    >
                        Overview
                    </button>
                    <button 
                        onClick={() => setActiveTab('comms')} 
                        className={`px-4 py-4 text-sm font-bold border-b-2 transition-all flex items-center gap-2 ${activeTab === 'comms' ? 'border-luxe-gold text-luxe-gold' : 'border-transparent text-white/50 hover:text-white'}`}
                    >
                        <MessageSquare className="w-4 h-4" />
                        Communication Hub
                    </button>
                </div>

                {/* Body */}
                <div className="flex-1 overflow-y-auto p-6 relative">
                    {loading ? (
                        <div className="absolute inset-0 flex items-center justify-center"><Loader2 className="w-8 h-8 animate-spin text-luxe-gold" /></div>
                    ) : (
                        <>
                            {activeTab === 'overview' && (
                                <div className="space-y-6">
                                    <div className="grid grid-cols-3 gap-4">
                                        <div className="p-4 bg-white/5 rounded-xl border border-white/5">
                                            <p className="text-[10px] text-white/40 uppercase font-black tracking-widest mb-1">Total Spent</p>
                                            <p className="text-xl font-bold text-green-400">${client?.total_spend || 0}</p>
                                        </div>
                                        <div className="p-4 bg-white/5 rounded-xl border border-white/5">
                                            <p className="text-[10px] text-white/40 uppercase font-black tracking-widest mb-1">Total Visits</p>
                                            <p className="text-xl font-bold">{client?.total_visits || 0}</p>
                                        </div>
                                        <div className="p-4 bg-luxe-gold/10 rounded-xl border border-luxe-gold/20">
                                            <p className="text-[10px] text-luxe-gold/60 uppercase font-black tracking-widest mb-1">Loyalty Points</p>
                                            <p className="text-xl font-black text-luxe-gold">{client?.loyalty_points || 0}</p>
                                        </div>
                                    </div>
                                    
                                    {client?.notes && (
                                        <div>
                                            <h4 className="text-sm font-bold mb-2">Remarks / Notes</h4>
                                            <div className="p-4 bg-white/5 rounded-xl border border-white/10 text-sm text-white/70 italic">
                                                "{client.notes}"
                                            </div>
                                        </div>
                                    )}
                                </div>
                            )}

                            {activeTab === 'comms' && (
                                <div className="flex flex-col h-full space-y-4">
                                    {/* Message History */}
                                    <div className="flex-1 bg-white/[0.02] border border-white/5 rounded-xl p-4 overflow-y-auto space-y-4 min-h-[400px]">
                                        {messages.length === 0 ? (
                                            <div className="h-full flex flex-col items-center justify-center text-white/30 text-center">
                                                <MessageSquare className="w-12 h-12 mb-2 opacity-20" />
                                                <p>No messages yet.</p>
                                                <p className="text-xs">Send an SMS below to start the conversation.</p>
                                            </div>
                                        ) : (
                                            <div className="flex flex-col-reverse gap-4">
                                                {messages.map(msg => {
                                                    const isOutbound = msg.direction === 'outbound';
                                                    return (
                                                        <div key={msg.id} className={`flex ${isOutbound ? 'justify-end' : 'justify-start'}`}>
                                                            <div className={`max-w-[70%] p-3 rounded-2xl text-sm ${
                                                                isOutbound 
                                                                ? 'bg-luxe-gold text-luxe-obsidian rounded-br-sm' 
                                                                : 'bg-white/10 text-white rounded-bl-sm border border-white/10'
                                                            }`}>
                                                                <p className="whitespace-pre-wrap">{msg.content}</p>
                                                                <div className={`text-[9px] mt-1 flex justify-end gap-1 font-bold ${isOutbound ? 'text-luxe-obsidian/60' : 'text-white/40'}`}>
                                                                    {new Date(msg.created_at).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                                                                    • {msg.type.toUpperCase()} 
                                                                    {isOutbound && ` • ${msg.status}`}
                                                                </div>
                                                            </div>
                                                        </div>
                                                    );
                                                })}
                                            </div>
                                        )}
                                    </div>

                                    {/* Composer */}
                                    <div className="flex items-end gap-2 bg-white/5 p-2 rounded-xl border border-white/10">
                                        <textarea
                                            value={newMessage}
                                            onChange={e => setNewMessage(e.target.value)}
                                            placeholder={`Message ${client?.name}...`}
                                            className="flex-1 bg-transparent border-none outline-none resize-none text-sm p-3 min-h-[50px] max-h-[150px]"
                                            rows={2}
                                        />
                                        <button 
                                            onClick={handleSendMessage}
                                            disabled={sending || !newMessage.trim()}
                                            className="p-3 bg-gold-gradient text-luxe-obsidian rounded-xl hover:scale-105 transition-all disabled:opacity-50 disabled:scale-100 mb-1 mr-1"
                                        >
                                            {sending ? <Loader2 className="w-5 h-5 animate-spin"/> : <Send className="w-5 h-5" />}
                                        </button>
                                    </div>
                                    <p className="text-[10px] text-white/30 text-center">Messages will be sent as SMS to {client?.phone}</p>
                                </div>
                            )}
                        </>
                    )}
                </div>
            </div>
        </div>
    );
};
