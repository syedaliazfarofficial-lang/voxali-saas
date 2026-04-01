import React, { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { useTenant } from '../context/TenantContext';
import { X, MessageSquare, Loader2, Send, Package, Plus } from 'lucide-react';
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
    const [activeTab, setActiveTab] = useState<'overview' | 'comms' | 'packages'>('comms');
    const [messages, setMessages] = useState<ThreadMessage[]>([]);
    const [activePackages, setActivePackages] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [newMessage, setNewMessage] = useState('');
    const [sending, setSending] = useState(false);

    // Package assignment state
    const [templates, setTemplates] = useState<any[]>([]);
    const [isAssigning, setIsAssigning] = useState(false);
    const [selectedTemplate, setSelectedTemplate] = useState<string>('');

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

        // Fetch packages
        const { data: pkgData } = await supabase
            .from('client_active_packages')
            .select(`
                *,
                template:client_package_templates(name, total_uses)
            `)
            .eq('client_id', clientId);
        if (pkgData) setActivePackages(pkgData);

        // Fetch templates for assignment
        const { data: tmplData } = await supabase
            .from('client_package_templates')
            .select('id, name, total_uses')
            .eq('tenant_id', tenantId)
            .eq('is_active', true);
        if (tmplData) setTemplates(tmplData);

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

    const handleAssignPackage = async () => {
        if (!selectedTemplate || !client || !tenantId) return;
        setSending(true);

        const tmpl = templates.find(t => t.id === selectedTemplate);
        if (!tmpl) return;

        const { error } = await supabase.from('client_active_packages').insert({
            tenant_id: tenantId,
            client_id: client.id,
            template_id: tmpl.id,
            remaining_uses: tmpl.total_uses,
            status: 'active'
        });

        if (!error) {
            showToast('Package assigned to client!', 'success');
            setIsAssigning(false);
            setSelectedTemplate('');
            fetchData();
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
                    <button 
                        onClick={() => setActiveTab('packages')} 
                        className={`px-4 py-4 text-sm font-bold border-b-2 transition-all flex items-center gap-2 \${activeTab === 'packages' ? 'border-luxe-gold text-luxe-gold' : 'border-transparent text-white/50 hover:text-white'}`}
                    >
                        <Package className="w-4 h-4" />
                        Packages
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

                            {activeTab === 'packages' && (
                                <div className="space-y-6">
                                    <div className="flex justify-between items-center mb-4">
                                        <div>
                                            <h3 className="font-bold text-lg text-white">Active Packages</h3>
                                            <p className="text-xs text-white/40">Manage client's pre-paid bundles.</p>
                                        </div>
                                        <button 
                                            title="Assign New Package"
                                            onClick={() => setIsAssigning(!isAssigning)}
                                            className="px-4 py-2 bg-gold-gradient text-luxe-obsidian rounded-xl text-xs font-bold flex items-center gap-2 hover:opacity-90 transition-all shadow-lg"
                                        >
                                            <Plus className="w-4 h-4" /> {isAssigning ? 'Cancel' : 'Assign Package'}
                                        </button>
                                    </div>

                                    {isAssigning && (
                                        <div className="p-4 bg-white/5 border border-luxe-gold/30 rounded-xl flex items-end gap-3 animate-fade-in mb-6">
                                            <div className="flex-1">
                                                <label className="text-xs font-bold text-luxe-gold uppercase tracking-wider mb-2 block">Select Package Template</label>
                                                <select
                                                    value={selectedTemplate}
                                                    onChange={(e) => setSelectedTemplate(e.target.value)}
                                                    className="w-full bg-black/40 border border-white/10 rounded-xl p-3 text-sm text-white focus:outline-none focus:border-luxe-gold"
                                                >
                                                    <option value="">-- Choose a Package --</option>
                                                    {templates.map(t => (
                                                        <option key={t.id} value={t.id}>{t.name} ({t.total_uses} uses)</option>
                                                    ))}
                                                </select>
                                            </div>
                                            <button 
                                                onClick={handleAssignPackage}
                                                disabled={!selectedTemplate || sending}
                                                className="px-6 py-3 bg-luxe-gold text-black font-bold rounded-xl disabled:opacity-50 hover:bg-yellow-400 transition-colors h-[46px] flex items-center"
                                            >
                                                {sending ? <Loader2 className="w-5 h-5 animate-spin"/> : 'Confirm'}
                                            </button>
                                        </div>
                                    )}

                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        {activePackages.length === 0 ? (
                                            <div className="col-span-full text-center text-white/40 py-12 border border-dashed border-white/10 rounded-xl bg-white/5">
                                                <Package className="w-8 h-8 opacity-20 mx-auto mb-2" />
                                                <p>No active packages.</p>
                                                <p className="text-xs mt-1">Assign a package from the Point of Sale.</p>
                                            </div>
                                        ) : (
                                            activePackages.map(p => (
                                                <div key={p.id} className="p-5 bg-white/5 border border-white/10 hover:border-luxe-gold/30 transition-colors rounded-xl flex items-center justify-between">
                                                    <div>
                                                        <h4 className="font-bold text-luxe-gold mb-1 text-lg">{p.template?.name || 'Bundle'}</h4>
                                                        <p className="text-xs text-white/40 font-mono tracking-wider">Purchased: {new Date(p.created_at).toLocaleDateString()}</p>
                                                        <span className={`mt-2 inline-block text-[10px] font-bold uppercase px-2 py-0.5 rounded \${p.remaining_uses > 0 ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-500'}`}>
                                                            {p.remaining_uses > 0 ? 'ACTIVE' : 'EXHAUSTED'}
                                                        </span>
                                                    </div>
                                                    <div className="text-center bg-luxe-obsidian p-3 rounded-xl border border-white/5 min-w-[70px]">
                                                        <p className="text-3xl font-black text-white">{p.remaining_uses}</p>
                                                        <p className="text-[9px] uppercase tracking-widest text-white/40 mt-1">Left</p>
                                                    </div>
                                                </div>
                                            ))
                                        )}
                                    </div>
                                </div>
                            )}
                        </>
                    )}
                </div>
            </div>
        </div>
    );
};
