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
    Phone,
    BookOpen,
    Globe,
    UserCircle,
    Volume2,
    Square,
    Copy,
    CheckCheck,
    Code2
} from 'lucide-react';
import { supabaseAdmin } from '../lib/supabase';
import { useTenant } from '../context/TenantContext';
import { showToast } from './ui/ToastNotification';
import Vapi from '@vapi-ai/web';
import { VapiChatBox } from './VapiChatBox';
import { PageSkeleton } from './ui/Skeleton';

interface AgentConfig {
    id: string;
    system_prompt: string;
    announcements: string;
    is_active: boolean;
    escalation_phone?: string;
    first_message?: string;
    voice_id?: string;
    language?: string;
    custom_knowledge?: string;
    updated_at: string;
}

const AVAILABLE_VOICES = [
    { id: 'jBpfuIE2acCO8z3wKNLl', name: 'Bella (Friendly Female)', previewUrl: 'https://storage.googleapis.com/eleven-public-prod/premade/voices/EXAVITQu4vr4xnSDxMaL/04365bce-98cc-4e99-9f10-56b60bfdfbd9.mp3' },
    { id: 'pNInz6obpgDQGcFmaJcg', name: 'Adam (Professional Male)', previewUrl: 'https://storage.googleapis.com/eleven-public-prod/premade/voices/pNInz6obpgDQGcFmaJcg/df6788f9-5c96-470d-8312-e5286fa84ef5.mp3' },
    { id: 'EXAVITQu4vr4xnSDxMaL', name: 'Rachel (Enthusiastic Female)', previewUrl: 'https://storage.googleapis.com/eleven-public-prod/premade/voices/EXAVITQu4vr4xnSDxMaL/04365bce-98cc-4e99-9f10-56b60bfdfbd9.mp3' },
    { id: 'ErXwobaYiN019PkySvjV', name: 'Antoni (Calm Male)', previewUrl: 'https://storage.googleapis.com/eleven-public-prod/premade/voices/ErXwobaYiN019PkySvjV/a4d3cf22-accc-47ab-a6ee-39fd2fc3081e.mp3' },
    { id: 'MF3mGyEYCl7XYWbV9V6O', name: 'Elli (Young Female)', previewUrl: 'https://storage.googleapis.com/eleven-public-prod/premade/voices/MF3mGyEYCl7XYWbV9V6O/2f77da8c-eab5-4ca3-b673-c15c54eab2bb.mp3' },
    { id: 'TxGEqnHWrfWFTfGW9XjX', name: 'Josh (Deep Male)', previewUrl: 'https://storage.googleapis.com/eleven-public-prod/premade/voices/TxGEqnHWrfWFTfGW9XjX/c6bfe616-2fd1-432d-886f-2364024479e4.mp3' },
    { id: 'VR6AewLTigWG4xSOukaG', name: 'Arnold (Husky Male)', previewUrl: 'https://storage.googleapis.com/eleven-public-prod/premade/voices/VR6AewLTigWG4xSOukaG/05634567-27e1-4bd2-95bd-bc697116743b.mp3' }
];

export const BellaAI: React.FC = () => {
    const [config, setConfig] = useState<AgentConfig | null>(null);
    const { tenantId } = useTenant();
    const [editPrompt, setEditPrompt] = useState('');
    const [editAnnouncements, setEditAnnouncements] = useState('');
    const [editEscalationPhone, setEditEscalationPhone] = useState('');
    const [editFirstMessage, setEditFirstMessage] = useState('');
    const [editVoiceId, setEditVoiceId] = useState('');
    const [editLanguage, setEditLanguage] = useState('');
    const [editKnowledge, setEditKnowledge] = useState('');
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

    // Audio Preview State
    const [isPlayingPreview, setIsPlayingPreview] = useState(false);
    const audioRef = React.useRef<HTMLAudioElement | null>(null);

    // Copy to clipboard state
    const [copiedSnippet, setCopiedSnippet] = useState(false);

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
                    first_message: 'Hi, welcome! How can I help you today?',
                    voice_id: 'jBpfuIE2acCO8z3wKNLl',
                    language: 'en-US',
                    custom_knowledge: '',
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
            setEditFirstMessage(c.first_message || '');
            setEditVoiceId(c.voice_id || 'jBpfuIE2acCO8z3wKNLl');
            setEditLanguage(c.language || 'en-US');
            setEditKnowledge(c.custom_knowledge || '');
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
            editEscalationPhone !== (config.escalation_phone || '') ||
            editFirstMessage !== (config.first_message || '') ||
            editVoiceId !== (config.voice_id || 'jBpfuIE2acCO8z3wKNLl') ||
            editLanguage !== (config.language || 'en-US') ||
            editKnowledge !== (config.custom_knowledge || '')
        );
    }, [editPrompt, editAnnouncements, editEscalationPhone, editFirstMessage, editVoiceId, editLanguage, editKnowledge, config]);

    const handleSave = async () => {
        if (!config) return;
        setSaving(true);
        const { error } = await supabaseAdmin
            .from('ai_agent_config')
            .update({
                system_prompt: editPrompt,
                announcements: editAnnouncements,
                escalation_phone: editEscalationPhone || null,
                first_message: editFirstMessage,
                voice_id: editVoiceId,
                language: editLanguage,
                custom_knowledge: editKnowledge,
                updated_at: new Date().toISOString(),
            })
            .eq('id', config.id);
        if (!error) {
            setConfig(prev => prev ? { 
                ...prev, 
                system_prompt: editPrompt, 
                announcements: editAnnouncements, 
                escalation_phone: editEscalationPhone || undefined,
                first_message: editFirstMessage,
                voice_id: editVoiceId,
                language: editLanguage,
                custom_knowledge: editKnowledge
            } : prev);
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
        setEditFirstMessage(config.first_message || '');
        setEditVoiceId(config.voice_id || 'jBpfuIE2acCO8z3wKNLl');
        setEditLanguage(config.language || 'en-US');
        setEditKnowledge(config.custom_knowledge || '');
    };

    const toggleAudioPreview = () => {
        if (isPlayingPreview && audioRef.current) {
            audioRef.current.pause();
            audioRef.current.currentTime = 0;
            setIsPlayingPreview(false);
            return;
        }
        const selectedVoice = AVAILABLE_VOICES.find(v => v.id === editVoiceId);
        if (!selectedVoice?.previewUrl) {
            showToast('Preview not available for this voice');
            return;
        }

        if (!audioRef.current) {
            audioRef.current = new Audio(selectedVoice.previewUrl);
            audioRef.current.onended = () => setIsPlayingPreview(false);
        } else {
            audioRef.current.src = selectedVoice.previewUrl;
        }
        
        audioRef.current.play().catch(() => showToast('Failed to play preview', 'error'));
        setIsPlayingPreview(true);
    };

    const handleCopySnippet = () => {
        if (!assistantId) return;
        const vapiKey = import.meta.env.VITE_VAPI_PUBLIC_KEY || 'YOUR_VAPI_PUBLIC_KEY';
        const snippet = `<!-- Voxali AI Chat Widget -->
<script>
  (function (d, t) {
    var g = document.createElement(t), s = d.getElementsByTagName(t)[0];
    g.src = "https://cdn.jsdelivr.net/gh/VapiAI/html-script-tag@latest/dist/assets/index.js";
    g.defer = true; g.async = true; s.parentNode.insertBefore(g, s);
    g.onload = function () {
      window.vapiSDK.run({
        apiKey: "${vapiKey}",
        assistant: "${assistantId}",
        config: { position: "bottom-right", offset: "24px" }
      });
    };
  })(document, "script");
</script>`;
        navigator.clipboard.writeText(snippet);
        setCopiedSnippet(true);
        setTimeout(() => setCopiedSnippet(false), 2000);
        showToast('Widget code copied to clipboard!');
    };

    if (loading) {
        return <PageSkeleton />;
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
                        title={callStatus === 'active' ? 'End Call' : 'Start Voice Call'}
                        aria-label={callStatus === 'active' ? 'End Call' : 'Start Voice Call'}
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
                        title="Chat with AI"
                        aria-label="Chat with AI"
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
                        title={config.is_active ? 'Stop Bella' : 'Start Bella'}
                        aria-label={config.is_active ? 'Stop Bella' : 'Start Bella'}
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

            {/* Basic AI Identity Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="glass-panel p-6 border border-white/5">
                    <h4 className="font-bold flex items-center gap-2 mb-4">
                        <MessageSquare className="w-5 h-5 text-luxe-gold" />
                        First Line (Greeting)
                    </h4>
                    <input
                        type="text"
                        value={editFirstMessage}
                        onChange={(e) => setEditFirstMessage(e.target.value)}
                        placeholder="Hi! How can I help you today?"
                        title="First Message Greeting"
                        aria-label="First Message Greeting"
                        className="w-full bg-white/5 border border-white/10 rounded-xl p-4 text-sm outline-none focus:border-luxe-gold/50 transition-all font-mono"
                    />
                </div>
                
                <div className="glass-panel p-6 border border-white/5 flex gap-4">
                    <div className="flex-1">
                        <h4 className="font-bold flex items-center gap-2 mb-4">
                            <UserCircle className="w-5 h-5 text-luxe-gold" />
                            Voice Model
                        </h4>
                        <div className="flex bg-white/5 border border-white/10 rounded-xl focus-within:border-luxe-gold/50 transition-all overflow-hidden [color-scheme:dark]">
                            <select
                                value={editVoiceId}
                                onChange={(e) => {
                                    setEditVoiceId(e.target.value);
                                    if (isPlayingPreview && audioRef.current) {
                                        audioRef.current.pause();
                                        setIsPlayingPreview(false);
                                    }
                                }}
                                title="Voice Selection"
                                aria-label="Voice Selection"
                                className="flex-1 bg-transparent p-4 text-sm outline-none border-none"
                            >
                                {AVAILABLE_VOICES.map(voice => (
                                    <option key={voice.id} value={voice.id}>{voice.name}</option>
                                ))}
                            </select>
                            <button
                                onClick={toggleAudioPreview}
                                className={`px-4 border-l border-white/10 hover:bg-white/10 transition-all border-none ${isPlayingPreview ? 'text-luxe-gold' : 'text-white/60 hover:text-white'}`}
                                title={isPlayingPreview ? "Stop Preview" : "Play Preview"}
                                aria-label="Preview Voice"
                            >
                                {isPlayingPreview ? <Square className="w-4 h-4 fill-current" /> : <Volume2 className="w-4 h-4" />}
                            </button>
                        </div>
                    </div>
                    <div className="flex-1">
                        <h4 className="font-bold flex items-center gap-2 mb-4">
                            <Globe className="w-5 h-5 text-luxe-gold" />
                            Language
                        </h4>
                        <select
                            value={editLanguage}
                            onChange={(e) => setEditLanguage(e.target.value)}
                            title="Language Selection"
                            aria-label="Language Selection"
                            className="w-full bg-white/5 border border-white/10 rounded-xl p-4 text-sm outline-none focus:border-luxe-gold/50 transition-all [color-scheme:dark]"
                        >
                            <option value="en-US">English (US)</option>
                            <option value="es-ES">Spanish</option>
                            <option value="ur-PK">Roman Urdu</option>
                            <option value="ar-AE">Arabic</option>
                        </select>
                    </div>
                </div>
            </div>

            {/* Custom Knowledge Base */}
            <div className="glass-panel p-6 border border-white/5">
                <h4 className="font-bold flex items-center gap-2 mb-4">
                    <BookOpen className="w-5 h-5 text-luxe-gold" />
                    Custom Knowledge Base
                </h4>
                <p className="text-xs text-white/40 mb-3">Add text about your specific products, hidden fees, or salon history. Bella will reference this automatically.</p>
                <textarea
                    value={editKnowledge}
                    onChange={(e) => setEditKnowledge(e.target.value)}
                    placeholder="e.g., We use L'Oreal Majirel for coloring. Cancellations inside 24 hours incur a $20 fee."
                    className="w-full bg-white/5 border border-white/10 rounded-xl p-4 text-sm outline-none focus:border-luxe-gold/50 h-32 resize-none transition-all"
                    title="Custom Knowledge Base"
                    aria-label="Custom Knowledge Base"
                />
            </div>

            {/* Web Widget Embed Code */}
            {assistantId && (
                <div className="glass-panel p-6 border border-blue-500/20 bg-blue-500/5 relative overflow-hidden group">
                    <div className="absolute inset-0 bg-blue-500/5 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none"></div>
                    <div className="flex justify-between items-start mb-4 relative z-10">
                        <div>
                            <h4 className="font-bold flex items-center gap-2 text-blue-400">
                                <Code2 className="w-5 h-5" />
                                Website Chat Widget Integration
                            </h4>
                            <p className="text-xs text-white/50 mt-1 max-w-2xl">Copy and paste this code snippet right before the closing <code>&lt;/body&gt;</code> tag of your public website (Shopify, WordPress, Webflow, etc.). The floating AI chat bubble will appear instantly.</p>
                        </div>
                        <button
                            onClick={handleCopySnippet}
                            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all ${
                                copiedSnippet 
                                ? 'bg-green-500/20 text-green-400 border border-green-500/30' 
                                : 'bg-white/10 text-white/80 hover:bg-white/20 border border-white/10 hover:text-white'
                            }`}
                        >
                            {copiedSnippet ? <CheckCheck className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                            {copiedSnippet ? 'COPIED' : 'COPY SCRIPT'}
                        </button>
                    </div>
                    
                    <div className="relative">
                        <pre className="bg-[#111] border border-white/10 rounded-xl p-4 overflow-x-auto text-[11px] font-mono text-white/70 leading-relaxed shadow-inner">
                            <span className="text-white/40">&lt;!-- Voxali AI Chat Widget --&gt;</span>{'\n'}
                            <span className="text-blue-400">&lt;script&gt;</span>{'\n'}
                            {'  '}(<span>function</span> (d, t) {'{'}{'\n'}
                            {'    '}<span>var</span> g = d.createElement(t), s = d.getElementsByTagName(t)[0];{'\n'}
                            {'    '}g.src = <span className="text-green-400">"https://cdn.jsdelivr.net/gh/VapiAI/html-script-tag@latest/dist/assets/index.js"</span>;{'\n'}
                            {'    '}g.defer = <span className="text-yellow-400">true</span>; g.async = <span className="text-yellow-400">true</span>; s.parentNode.insertBefore(g, s);{'\n'}
                            {'    '}g.onload = <span>function</span> () {'{'}{'\n'}
                            {'      '}window.vapiSDK.run({'{'}{'\n'}
                            {'        '}apiKey: <span className="text-green-400">"YOUR_SECURE_API_KEY"</span>,{'\n'}
                            {'        '}assistant: <span className="text-green-400">"{assistantId}"</span>,{'\n'}
                            {'        '}config: {'{'} position: <span className="text-green-400">"bottom-right"</span>, offset: <span className="text-green-400">"24px"</span> {'}'}{'\n'}
                            {'      '}{'}'});{'\n'}
                            {'    '}{'}'};{'\n'}
                            {'  '}{'}'})(document, <span className="text-green-400">"script"</span>);{'\n'}
                            <span className="text-blue-400">&lt;/script&gt;</span>
                        </pre>
                    </div>
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
                    title="System Prompt Editor"
                    aria-label="System Prompt Editor"
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
                    title="Shop Announcements Editor"
                    aria-label="Shop Announcements Editor"
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
