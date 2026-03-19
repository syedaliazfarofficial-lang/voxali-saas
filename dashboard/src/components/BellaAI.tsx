import React, { useState, useEffect, useCallback } from 'react';
import {
    Bot,
    ShieldAlert,
    ShieldCheck,
    Save,
    Loader2,
    RotateCcw,
    Megaphone,
    Power,
    PowerOff,
    Mic,
    PhoneOff,
    MessageSquare,
    Wrench,
    Phone
} from 'lucide-react';
import { supabaseAdmin } from '../lib/supabase';
import { useTenant } from '../context/TenantContext';
import { showToast } from './ui/ToastNotification';
import Vapi from '@vapi-ai/web';
import { VapiChatBox } from './VapiChatBox';

interface AgentConfig {
    id: string;
    system_prompt: string;
    announcements: string;
    is_active: boolean;
    escalation_phone?: string;
    updated_at: string;
}

export const BellaAI: React.FC = () => {
    const [config, setConfig] = useState<AgentConfig | null>(null);
    const { tenantId } = useTenant();
    const [editPrompt, setEditPrompt] = useState('');
    const [editAnnouncements, setEditAnnouncements] = useState('');
    const [editEscalationPhone, setEditEscalationPhone] = useState('');
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [hasChanges, setHasChanges] = useState(false);

    // Vapi Web SDK State
    const [assistantId, setAssistantId] = useState<string | null>(null);
    const [callStatus, setCallStatus] = useState<'inactive' | 'loading' | 'active'>('inactive');
    const [vapi, setVapi] = useState<InstanceType<typeof Vapi> | null>(null);

    // New Text Chat & Provisioning State
    const [isChatOpen, setIsChatOpen] = useState(false);
    const [provisioning, setProvisioning] = useState(false);

    // Initialize Vapi SDK Client
    useEffect(() => {
        const vapiKey = import.meta.env.VITE_VAPI_PUBLIC_KEY;
        if (vapiKey) {
            const vapiInstance = new Vapi(vapiKey);
            setVapi(vapiInstance);

            vapiInstance.on('call-start', () => setCallStatus('active'));
            vapiInstance.on('call-end', () => setCallStatus('inactive'));
            vapiInstance.on('error', (e: unknown) => {
                console.error("Vapi Error:", e);
                setCallStatus('inactive');
                showToast("Failed to connect to AI");
            });

            return () => {
                vapiInstance.stop();
            };
        }
    }, []);

    const toggleCall = async () => {
        if (!vapi || !assistantId) {
            showToast("AI Agent not fully configured yet.");
            return;
        }
        if (callStatus === 'active' || callStatus === 'loading') {
            vapi.stop();
            setCallStatus('inactive');
        } else {
            setCallStatus('loading');
            try {
                await vapi.start(assistantId);
            } catch (e) {
                console.error(e);
                setCallStatus('inactive');
                showToast("Failed to start call");
            }
        }
    };

    const fetchConfig = useCallback(async () => {
        if (!tenantId) return;
        setLoading(true);
        const { data, error } = await supabaseAdmin
            .from('ai_agent_config')
            .select('*')
            .eq('tenant_id', tenantId)
            .single();

        // Fetch specific vapi_assistant_id linked to the tenant
        const { data: tenantData } = await supabaseAdmin
            .from('tenants')
            .select('vapi_assistant_id')
            .eq('id', tenantId)
            .single();

        let activeConfig = data;

        // Auto-create config if it doesn't exist
        if (error && error.code === 'PGRST116') {
            const { data: newConf } = await supabaseAdmin
                .from('ai_agent_config')
                .insert({
                    tenant_id: tenantId,
                    system_prompt: 'You are Aria, the AI receptionist. Please assist the customer in booking an appointment.',
                    announcements: '',
                    escalation_phone: null,
                    is_active: true
                })
                .select()
                .single();
            activeConfig = newConf;
        }

        if (activeConfig) {
            const c = activeConfig as AgentConfig;
            setConfig(c);
            setEditPrompt(c.system_prompt || '');
            setEditAnnouncements(c.announcements || '');
            setEditEscalationPhone(c.escalation_phone || '');
        }

        if (tenantData?.vapi_assistant_id) {
            setAssistantId(tenantData.vapi_assistant_id);
        }
        setLoading(false);
    }, [tenantId]);

    useEffect(() => { fetchConfig(); }, [fetchConfig]);

    const handleProvisionAgent = async () => {
        if (!tenantId) return;
        setProvisioning(true);
        try {
            const { data: tenantProfile } = await supabaseAdmin.from('tenants').select('name').eq('id', tenantId).single();
            const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;

            const res = await fetch(`${supabaseUrl}/functions/v1/provision-vapi-agent`, {
                method: 'POST',
                headers: {
                    "Content-Type": "application/json",
                    "X-TOOLS-KEY": "LUXE-AUREA-SECRET-2026"
                },
                body: JSON.stringify({
                    tenantId: tenantId,
                    salonName: tenantProfile?.name || 'My Salon',
                    countryCode: 'US'
                })
            });

            if (res.ok) {
                showToast("AI Agent Setup Complete! 🎉");
                fetchConfig(); // refresh to get the new assistant_id
            } else {
                throw new Error("Provisioning failed");
            }
        } catch (error) {
            console.error(error);
            showToast("Failed to setup AI Agent. Please contact support.", "error");
        } finally {
            setProvisioning(false);
        }
    };

    useEffect(() => {
        if (!config) return;
        setHasChanges(
            editPrompt !== config.system_prompt || 
            editAnnouncements !== (config.announcements || '') ||
            editEscalationPhone !== (config.escalation_phone || '')
        );
    }, [editPrompt, editAnnouncements, editEscalationPhone, config]);

    const handleSave = async () => {
        if (!config) return;
        setSaving(true);
        const { error } = await supabaseAdmin
            .from('ai_agent_config')
            .update({
                system_prompt: editPrompt,
                announcements: editAnnouncements,
                escalation_phone: editEscalationPhone || null,
                updated_at: new Date().toISOString(),
            })
            .eq('id', config.id);
        if (!error) {
            setConfig(prev => prev ? { ...prev, system_prompt: editPrompt, announcements: editAnnouncements, escalation_phone: editEscalationPhone || undefined } : prev);
            setHasChanges(false);
            showToast('Saved successfully!');
        }
        setSaving(false);
    };

    const handleToggle = async () => {
        if (!config) return;
        const newVal = !config.is_active;
        const { error } = await supabaseAdmin
            .from('ai_agent_config')
            .update({ is_active: newVal, updated_at: new Date().toISOString() })
            .eq('id', config.id);
        if (!error) {
            setConfig(prev => prev ? { ...prev, is_active: newVal } : prev);
            showToast(newVal ? 'Bella is now ONLINE' : 'Bella is now OFFLINE');
        }
    };

    const handleReset = () => {
        if (!config) return;
        setEditPrompt(config.system_prompt || '');
        setEditAnnouncements(config.announcements || '');
        setEditEscalationPhone(config.escalation_phone || '');
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center h-64">
                <Loader2 className="w-8 h-8 text-luxe-gold animate-spin" />
            </div>
        );
    }

    if (!config) return null;

    return (
        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">


            {/* Header */}
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div className="flex items-center gap-3">
                    <div className="p-3 bg-luxe-gold/10 rounded-2xl border border-luxe-gold/20">
                        <Bot className="w-6 h-6 text-luxe-gold" />
                    </div>
                    <div>
                        <h3 className="text-xl font-bold">Bella AI Configuration</h3>
                        <p className="text-xs text-white/40 uppercase tracking-widest">System Prompt & Controls</p>
                    </div>
                </div>

                <div className="flex items-center gap-3">
                    {/* Vapi Web SDK Call Button */}
                    <button
                        onClick={toggleCall}
                        disabled={callStatus === 'loading' || !config.is_active}
                        className={`p-2.5 rounded-xl border transition-all flex items-center gap-2 text-xs font-bold ${callStatus === 'active'
                            ? 'bg-red-500/20 text-red-400 border-red-500/30 shadow-[0_0_15px_rgba(239,68,68,0.3)] hover:bg-red-500/30'
                            : 'bg-luxe-gold/10 text-luxe-gold border-luxe-gold/20 hover:bg-luxe-gold/20'
                            } disabled:opacity-50 disabled:cursor-not-allowed`}
                    >
                        {callStatus === 'loading' ? (
                            <Loader2 className="w-4 h-4 animate-spin" />
                        ) : callStatus === 'active' ? (
                            <PhoneOff className="w-4 h-4" />
                        ) : (
                            <Mic className="w-4 h-4" />
                        )}
                        <span className="hidden sm:inline">
                            {callStatus === 'loading' ? 'CONNECTING...' : callStatus === 'active' ? 'END CALL' : 'TALK TO BELLA'}
                        </span>
                    </button>

                    {/* Chat with Bella Button */}
                    <button
                        onClick={() => setIsChatOpen(true)}
                        disabled={!config.is_active || !assistantId}
                        className="p-2.5 rounded-xl border transition-all flex items-center gap-2 text-xs font-bold bg-blue-500/10 text-blue-400 border-blue-500/20 hover:bg-blue-500/20 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        <MessageSquare className="w-4 h-4" />
                        <span className="hidden sm:inline">CHAT VIA TEXT</span>
                    </button>

                    {/* Status Badge */}
                    <div className={`flex items-center gap-2 px-4 py-2 rounded-full border ${config.is_active
                        ? 'bg-green-500/10 text-green-400 border-green-500/20'
                        : 'bg-red-500/10 text-red-400 border-red-500/20'
                        }`}>
                        <div className={`w-2 h-2 rounded-full ${config.is_active ? 'bg-green-500 animate-pulse' : 'bg-red-500'}`} />
                        <span className="text-xs font-bold uppercase tracking-wider">{config.is_active ? 'ONLINE' : 'OFFLINE'}</span>
                    </div>

                    {/* Toggle Button */}
                    <button
                        onClick={handleToggle}
                        className={`p-2.5 rounded-xl border transition-all flex items-center gap-2 text-xs font-bold ${config.is_active
                            ? 'bg-red-500/10 text-red-400 border-red-500/20 hover:bg-red-500/20'
                            : 'bg-green-500/10 text-green-400 border-green-500/20 hover:bg-green-500/20'
                            }`}
                    >
                        {config.is_active ? <PowerOff className="w-4 h-4" /> : <Power className="w-4 h-4" />}
                        {config.is_active ? 'STOP' : 'START'}
                    </button>
                </div>
            </div>

            {/* Emergency Banner */}
            {!config.is_active && (
                <div className="bg-red-500/10 border border-red-500/20 rounded-2xl p-4 flex items-center gap-3">
                    <ShieldAlert className="w-6 h-6 text-red-400 flex-shrink-0" />
                    <div>
                        <p className="font-bold text-red-400 text-sm">Bella is currently OFFLINE</p>
                        <p className="text-red-400/60 text-xs mt-0.5">All incoming calls will go to voicemail. Click START to resume.</p>
                    </div>
                </div>
            )}

            {/* Agent Not Provisioned Warning */}
            {!assistantId && config.is_active && (
                <div className="bg-amber-500/10 border border-amber-500/20 rounded-2xl p-4 flex items-center justify-between gap-4">
                    <div className="flex gap-3">
                        <ShieldAlert className="w-6 h-6 text-amber-400 flex-shrink-0" />
                        <div>
                            <p className="font-bold text-amber-400 text-sm">AI Agent Not Fully Setup</p>
                            <p className="text-amber-400/60 text-xs mt-0.5">Your Voice/Chat logic is missing. Click the Setup button to fix it in 5 seconds.</p>
                        </div>
                    </div>
                    <button
                        onClick={handleProvisionAgent}
                        disabled={provisioning}
                        className="flex-shrink-0 bg-gold-gradient text-[#1A1A1A] px-4 py-2 font-bold text-xs rounded-xl flex items-center gap-2"
                    >
                        {provisioning ? <Loader2 className="w-4 h-4 animate-spin" /> : <Wrench className="w-4 h-4" />}
                        FIX AGENT
                    </button>
                </div>
            )}

            {/* System Prompt Editor */}
            <div className="glass-panel p-6 border border-white/5">
                <div className="flex justify-between items-center mb-4">
                    <h4 className="font-bold flex items-center gap-2">
                        <ShieldCheck className="w-5 h-5 text-luxe-gold" />
                        System Prompt
                    </h4>
                    <span className="text-[10px] text-white/30">
                        Last updated: {new Date(config.updated_at).toLocaleString()}
                    </span>
                </div>
                <textarea
                    value={editPrompt}
                    onChange={(e) => setEditPrompt(e.target.value)}
                    className="w-full bg-white/5 border border-white/10 rounded-xl p-4 text-sm outline-none focus:border-luxe-gold/50 h-[400px] resize-y transition-all font-mono leading-relaxed"
                    spellCheck={false}
                />
                <p className="text-[10px] text-white/30 mt-2">{editPrompt.length} characters</p>
            </div>

            {/* Announcements */}
            <div className="glass-panel p-6 border border-white/5">
                <h4 className="font-bold flex items-center gap-2 mb-4">
                    <Megaphone className="w-5 h-5 text-luxe-gold" />
                    Shop Announcements
                </h4>
                <p className="text-xs text-white/40 mb-3">Bella will mention these to callers. e.g. "We're closing early today at 3 PM."</p>
                <textarea
                    value={editAnnouncements}
                    onChange={(e) => setEditAnnouncements(e.target.value)}
                    placeholder="Enter any temporary announcements here..."
                    className="w-full bg-white/5 border border-white/10 rounded-xl p-4 text-sm outline-none focus:border-luxe-gold/50 h-32 resize-none transition-all"
                />
            </div>

            {/* Human Handoff Number */}
            <div className="glass-panel p-6 border border-white/5">
                <h4 className="font-bold flex items-center gap-2 mb-4">
                    <Phone className="w-5 h-5 text-luxe-gold" />
                    Human Handoff Number
                </h4>
                <p className="text-xs text-white/40 mb-3">If Bella encounters an issue she cannot resolve, or if a caller explicitly requests a human, she will send an emergency SMS to this number with the caller's details.</p>
                <input
                    type="tel"
                    value={editEscalationPhone}
                    onChange={(e) => setEditEscalationPhone(e.target.value)}
                    placeholder="e.g. +1234567890"
                    title="Human Handoff Number"
                    aria-label="Human Handoff Number"
                    className="w-full bg-white/5 border border-white/10 rounded-xl p-4 text-sm outline-none focus:border-luxe-gold/50 transition-all font-mono"
                />
            </div>

            {/* Action Bar */}
            <div className="flex justify-end gap-3 sticky bottom-4">
                {hasChanges && (
                    <button
                        onClick={handleReset}
                        className="flex items-center gap-2 px-6 py-3 rounded-xl border border-white/10 text-white/60 hover:text-white hover:bg-white/5 transition-all text-sm font-bold"
                    >
                        <RotateCcw className="w-4 h-4" />
                        DISCARD
                    </button>
                )}
                <button
                    onClick={handleSave}
                    disabled={saving || !hasChanges}
                    className="flex items-center gap-2 bg-gold-gradient text-luxe-obsidian px-8 py-3 rounded-xl font-bold shadow-lg shadow-luxe-gold/20 hover:scale-[1.02] active:scale-[0.98] transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                >
                    {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                    SAVE CHANGES
                </button>
            </div>

            {/* Internal Chat UI */}
            {assistantId && (
                <VapiChatBox
                    assistantId={assistantId}
                    isOpen={isChatOpen}
                    onClose={() => setIsChatOpen(false)}
                />
            )}
        </div>
    );
};
