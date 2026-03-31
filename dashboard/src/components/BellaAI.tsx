import React, { useState, useEffect, useCallback } from 'react';
import {
    Bot,
    ShieldAlert,
    ShieldCheck,
    Loader2,
    RotateCcw,
    Megaphone,
    Power,
    PowerOff,
    Wrench,
    Phone,
    BookOpen,
    Globe,
    UserCircle,
    Volume2,
    Square,
    Copy,
    CheckCheck,
    Code2,
    Shield,
    AlertTriangle,
    Zap
} from 'lucide-react';
import { supabaseAdmin } from '../lib/supabase';
import { useTenant } from '../context/TenantContext';
import { showToast } from './ui/ToastNotification';
import { PageSkeleton } from './ui/Skeleton';

interface AgentConfig {
    id: string;
    system_prompt: string;
    announcements: string | null;
    is_active: boolean;
    escalation_phone?: string | null;
    transfer_phone?: string | null;
    first_message?: string | null;
    voice_id?: string | null;
    language?: string | null;
    language_override?: string | null;
    custom_knowledge?: string | null;
    knowledge_base?: string | null;
    ai_name?: string | null;
    privacy_policy_text?: string | null;
    updated_at: string;
}

const AVAILABLE_VOICES = [
    { id: 'jBpfuIE2acCO8z3wKNLl', name: 'Sarah (Friendly Female - US)', previewUrl: 'https://storage.googleapis.com/eleven-public-prod/premade/voices/jBpfuIE2acCO8z3wKNLl/04365bce-98cc-4e99-9f10-56b60bfdfbd9.mp3' },
    { id: '29vD33N1CtxCmqQRPOHJ', name: 'Drew (Professional Female - US)', previewUrl: 'https://storage.googleapis.com/eleven-public-prod/premade/voices/29vD33N1CtxCmqQRPOHJ/e542bd16-bb70-4f51-b0db-6e60b1bc89a8.mp3' },
    { id: 'FGY2WhTYpPnrIDTdsKH5', name: 'Laura (Upbeat Female - US)', previewUrl: 'https://storage.googleapis.com/eleven-public-prod/premade/voices/FGY2WhTYpPnrIDTdsKH5/ba3f6b9c-5a9f-43cb-b09e-71701e6aeeef.mp3' },
    { id: 'XrExE9yKIg1WjnnRuSqN', name: 'Matilda (Warm Female - UK)', previewUrl: 'https://storage.googleapis.com/eleven-public-prod/premade/voices/XrExE9yKIg1WjnnRuSqN/e8e6302e-9d2a-4ad5-afdd-f761fc7262f3.mp3' },
    { id: 'EXAVITQu4vr4xnSDxMaL', name: 'Bella (Calm Female - US)', previewUrl: 'https://storage.googleapis.com/eleven-public-prod/premade/voices/EXAVITQu4vr4xnSDxMaL/04365bce-98cc-4e99-9f10-56b60bfdfbd9.mp3' },
    { id: 'MF3mGyEYCl7XYWbV9V6O', name: 'Elli (Youthful Female - US)', previewUrl: 'https://storage.googleapis.com/eleven-public-prod/premade/voices/MF3mGyEYCl7XYWbV9V6O/2f77da8c-eab5-4ca3-b673-c15c54eab2bb.mp3' },
    { id: 'pNInz6obpgDQGcFmaJcg', name: 'Adam (Clear Male - US)', previewUrl: 'https://storage.googleapis.com/eleven-public-prod/premade/voices/pNInz6obpgDQGcFmaJcg/df6788f9-5c96-470d-8312-e5286fa84ef5.mp3' },
    { id: 'ErXwobaYiN019PkySvjV', name: 'Antoni (Smooth Male - US)', previewUrl: 'https://storage.googleapis.com/eleven-public-prod/premade/voices/ErXwobaYiN019PkySvjV/a4d3cf22-accc-47ab-a6ee-39fd2fc3081e.mp3' },
    { id: 'TxGEqnHWrfWFTfGW9XjX', name: 'Josh (Deep Male - US)', previewUrl: 'https://storage.googleapis.com/eleven-public-prod/premade/voices/TxGEqnHWrfWFTfGW9XjX/c6bfe616-2fd1-432d-886f-2364024479e4.mp3' },
    { id: 'VR6AewLTigWG4xSOukaG', name: 'Arnold (Husky Male - UK)', previewUrl: 'https://storage.googleapis.com/eleven-public-prod/premade/voices/VR6AewLTigWG4xSOukaG/05634567-27e1-4bd2-95bd-bc697116743b.mp3' },
    { id: 'cjVigY5qzO86Huf0OWal', name: 'Eric (Confident Male - US)', previewUrl: 'https://storage.googleapis.com/eleven-public-prod/premade/voices/cjVigY5qzO86Huf0OWal/376ffea-e6a3-41a4-9e32-a5ec0c058c49.mp3' },
];

const AI_LANGUAGES = [
    { value: 'en', label: 'English (US, UK, CA, AU)' },
    { value: 'ur', label: 'Roman Urdu / Urdu (اردو)' },
    { value: 'ar', label: 'Arabic (عربي)' },
    { value: 'hi', label: 'Hindi (हिन्दी)' },
    { value: 'fr', label: 'French (Français)' },
    { value: 'de', label: 'German (Deutsch)' },
    { value: 'es', label: 'Spanish (Español)' },
    { value: 'pt', label: 'Portuguese (Português)' },
    { value: 'tr', label: 'Turkish (Türkçe)' },
    { value: 'id', label: 'Indonesian (Bahasa)' },
    { value: 'ru', label: 'Russian (Русский)' },
    { value: 'it', label: 'Italian (Italiano)' },
    { value: 'nl', label: 'Dutch (Nederlands)' },
    { value: 'ja', label: 'Japanese (日本語)' },
    { value: 'ko', label: 'Korean (한국어)' },
    { value: 'zh', label: 'Chinese (中文)' },
];

const SUPABASE_FUNCTIONS_URL = import.meta.env.VITE_SUPABASE_URL + '/functions/v1';

export const BellaAI: React.FC = () => {
    const [config, setConfig] = useState<AgentConfig | null>(null);
    const { tenantId, salonName: tenantSalonName } = useTenant();

    // Editable fields
    const [editAiName, setEditAiName] = useState('Aria');
    const [editFirstMessage, setEditFirstMessage] = useState('');
    const [editVoiceId, setEditVoiceId] = useState('');
    const [editLanguage, setEditLanguage] = useState('en');
    const [editKnowledge, setEditKnowledge] = useState('');
    const [editPrivacyPolicy, setEditPrivacyPolicy] = useState('');
    const [editAnnouncements, setEditAnnouncements] = useState('');
    const [editTransferPhone, setEditTransferPhone] = useState('');

    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [hasChanges, setHasChanges] = useState(false);

    // Vapi State
    const [assistantId, setAssistantId] = useState<string | null>(null);
    const [provisioning, setProvisioning] = useState(false);

    // Audio Preview
    const [isPlayingPreview, setIsPlayingPreview] = useState(false);
    const audioRef = React.useRef<HTMLAudioElement | null>(null);

    // Embed snippet copy
    const [copiedSnippet, setCopiedSnippet] = useState(false);

    const fetchConfig = useCallback(async () => {
        if (!tenantId) return;
        setLoading(true);

        const { data, error } = await supabaseAdmin
            .from('ai_agent_config')
            .select('*')
            .eq('tenant_id', tenantId)
            .single();

        const { data: tenantData } = await supabaseAdmin
            .from('tenants')
            .select('vapi_assistant_id, salon_name')
            .eq('id', tenantId)
            .single();

        let activeConfig = data;

        if (error && error.code === 'PGRST116') {
            const { data: newConf } = await supabaseAdmin
                .from('ai_agent_config')
                .insert({
                    tenant_id: tenantId,
                    system_prompt: '',
                    first_message: `Hi, welcome to ${tenantData?.salon_name || 'our salon'}! How may I assist you today?`,
                    voice_id: 'jBpfuIE2acCO8z3wKNLl',
                    language: 'en',
                    ai_name: 'Aria',
                    custom_knowledge: '',
                    knowledge_base: '',
                    announcements: '',
                    escalation_phone: null,
                    transfer_phone: null,
                    is_active: true
                })
                .select()
                .single();
            activeConfig = newConf;
        }

        if (activeConfig) {
            const c = activeConfig as AgentConfig;
            setConfig(c);
            setEditAiName(c.ai_name || 'Aria');
            setEditFirstMessage(c.first_message || '');
            setEditVoiceId(c.voice_id || 'jBpfuIE2acCO8z3wKNLl');
            setEditLanguage(c.language_override || c.language || 'en');
            setEditKnowledge(c.knowledge_base || c.custom_knowledge || '');
            setEditPrivacyPolicy(c.privacy_policy_text || '');
            setEditAnnouncements(c.announcements || '');
            setEditTransferPhone(c.transfer_phone || c.escalation_phone || '');
        }

        if (tenantData?.vapi_assistant_id) {
            setAssistantId(tenantData.vapi_assistant_id);
        }
        setLoading(false);
    }, [tenantId]);

    useEffect(() => { fetchConfig(); }, [fetchConfig]);

    useEffect(() => {
        if (!config) return;
        setHasChanges(
            editAiName !== (config.ai_name || 'Aria') ||
            editFirstMessage !== (config.first_message || '') ||
            editVoiceId !== (config.voice_id || 'jBpfuIE2acCO8z3wKNLl') ||
            editLanguage !== (config.language_override || config.language || 'en') ||
            editKnowledge !== (config.knowledge_base || config.custom_knowledge || '') ||
            editPrivacyPolicy !== (config.privacy_policy_text || '') ||
            editAnnouncements !== (config.announcements || '') ||
            editTransferPhone !== (config.transfer_phone || config.escalation_phone || '')
        );
    }, [editAiName, editFirstMessage, editVoiceId, editLanguage, editKnowledge, editPrivacyPolicy, editAnnouncements, editTransferPhone, config]);

    const handleProvisionAgent = async () => {
        if (!tenantId) return;
        setProvisioning(true);
        try {
            const res = await fetch(`${SUPABASE_FUNCTIONS_URL}/provision-vapi-agent`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'X-TOOLS-KEY': 'LUXE-AUREA-SECRET-2026' },
                body: JSON.stringify({
                    tenantId,
                    salonName: tenantSalonName || 'My Salon',
                    countryCode: 'US'
                })
            });
            if (res.ok) {
                showToast('AI Agent Setup Complete! 🎉');
                fetchConfig();
            } else {
                throw new Error('Provisioning failed');
            }
        } catch {
            showToast('Failed to setup AI Agent. Please contact support.', 'error');
        } finally {
            setProvisioning(false);
        }
    };

    const handleSave = async () => {
        if (!config || !tenantId) return;
        if (!assistantId) {
            showToast('AI assistant not provisioned yet. Click FIX AGENT first.', 'error');
            return;
        }

        // Validate & normalize phone number to E.164 before saving
        let normalizedPhone = editTransferPhone.trim();
        if (normalizedPhone) {
            // Strip spaces, dashes, parentheses
            normalizedPhone = normalizedPhone.replace(/[\s\-().]/g, '');
            // Ensure starts with +
            if (!normalizedPhone.startsWith('+')) {
                showToast('⚠️ Human Handoff Number must start with + and country code (e.g. +923311234567)', 'error');
                setSaving(false);
                return;
            }
        }

        setSaving(true);


        const dbPayload = {
            ai_name: editAiName.trim() || 'Aria',
            first_message: editFirstMessage.trim() || null,
            voice_id: editVoiceId,
            language: editLanguage,
            language_override: editLanguage,
            knowledge_base: editKnowledge.trim() || null,
            custom_knowledge: editKnowledge.trim() || null,
            privacy_policy_text: editPrivacyPolicy.trim() || null,
            announcements: editAnnouncements.trim() || null,
            transfer_phone: normalizedPhone || null,
            escalation_phone: normalizedPhone || null,
            updated_at: new Date().toISOString(),
        };

        const { error } = await supabaseAdmin
            .from('ai_agent_config')
            .update(dbPayload)
            .eq('id', config.id);

        if (error) {
            console.error('[BellaAI] Save error:', error);
            showToast(`Save failed: ${error.message}`, 'error');
            setSaving(false);
            return;
        }

        // Sync to Vapi
        try {
            const serviceKey = import.meta.env.VITE_SUPABASE_SERVICE_KEY;
            const res = await fetch(`${SUPABASE_FUNCTIONS_URL}/sync-vapi-agent`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${serviceKey}`,
                },
                body: JSON.stringify({
                    tenantId,
                    assistantId,
                    config: {
                        ai_name: editAiName.trim() || 'Aria',
                        salon_name: tenantSalonName || 'the salon',
                        language: editLanguage,
                        language_override: editLanguage,
                        knowledge_base: editKnowledge.trim() || null,
                        privacy_policy_text: editPrivacyPolicy.trim() || null,
                        announcements: editAnnouncements.trim() || null,
                        transfer_phone: editTransferPhone.trim() || null,
                        escalation_phone: editTransferPhone.trim() || null,
                        first_message: editFirstMessage.trim() || null,
                        voice_id: editVoiceId,
                    }
                })
            });

            const result = await res.json();
            if (result.success) {
                setConfig(prev => prev ? ({ ...prev, ...dbPayload } as AgentConfig) : prev);
                setHasChanges(false);
                const transferNote = result.transfer_phone_configured ? ' | Call Transfer: Active ✅' : '';
                showToast(`✅ ${editAiName || 'Aria'} saved & synced!${transferNote}`);
            } else {
                showToast(`Saved to DB, but sync failed: ${result.error}`, 'error');
            }
        } catch {
            showToast('Saved to DB, but failed to reach sync server.', 'error');
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
            showToast(newVal ? `${editAiName || 'Aria'} is now ONLINE` : `${editAiName || 'Aria'} is now OFFLINE`);
        }
    };

    const handleReset = () => {
        if (!config) return;
        setEditAiName(config.ai_name || 'Aria');
        setEditFirstMessage(config.first_message || '');
        setEditVoiceId(config.voice_id || 'jBpfuIE2acCO8z3wKNLl');
        setEditLanguage(config.language_override || config.language || 'en');
        setEditKnowledge(config.knowledge_base || config.custom_knowledge || '');
        setEditPrivacyPolicy(config.privacy_policy_text || '');
        setEditAnnouncements(config.announcements || '');
        setEditTransferPhone(config.transfer_phone || config.escalation_phone || '');
    };

    const toggleAudioPreview = () => {
        if (isPlayingPreview && audioRef.current) {
            audioRef.current.pause();
            audioRef.current.currentTime = 0;
            setIsPlayingPreview(false);
            return;
        }
        const selectedVoice = AVAILABLE_VOICES.find(v => v.id === editVoiceId);
        if (!selectedVoice?.previewUrl) { showToast('Preview not available for this voice'); return; }
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
        assistant: "${assistantId as string}",
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

    if (loading) return <PageSkeleton />;
    if (!config) return null;

    const displayName = editAiName || 'Aria';

    return (
        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">

            {/* Header */}
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div className="flex items-center gap-3">
                    <div className="p-3 bg-luxe-gold/10 rounded-2xl border border-luxe-gold/20">
                        <Bot className="w-6 h-6 text-luxe-gold" />
                    </div>
                    <div>
                        <h3 className="text-xl font-bold">AI Receptionist</h3>
                        <p className="text-xs text-white/40 uppercase tracking-widest">Configure {displayName} — Your AI Concierge</p>
                    </div>
                </div>

                <div className="flex items-center gap-3">
                    <div className={`flex items-center gap-2 px-4 py-2 rounded-full border ${config.is_active
                        ? 'bg-green-500/10 text-green-400 border-green-500/20'
                        : 'bg-red-500/10 text-red-400 border-red-500/20'}`}>
                        <div className={`w-2 h-2 rounded-full ${config.is_active ? 'bg-green-500 animate-pulse' : 'bg-red-500'}`} />
                        <span className="text-xs font-bold uppercase tracking-wider">{config.is_active ? 'ONLINE' : 'OFFLINE'}</span>
                    </div>
                    <button
                        onClick={handleToggle}
                        className={`p-2.5 rounded-xl border transition-all flex items-center gap-2 text-xs font-bold ${config.is_active
                            ? 'bg-red-500/10 text-red-400 border-red-500/20 hover:bg-red-500/20'
                            : 'bg-green-500/10 text-green-400 border-green-500/20 hover:bg-green-500/20'}`}
                        title={config.is_active ? `Stop ${displayName}` : `Start ${displayName}`}
                        aria-label={config.is_active ? `Stop ${displayName}` : `Start ${displayName}`}
                    >
                        {config.is_active ? <PowerOff className="w-4 h-4" /> : <Power className="w-4 h-4" />}
                        {config.is_active ? 'STOP' : 'START'}
                    </button>
                </div>
            </div>

            {/* Offline Banner */}
            {!config.is_active && (
                <div className="bg-red-500/10 border border-red-500/20 rounded-2xl p-4 flex items-center gap-3">
                    <ShieldAlert className="w-6 h-6 text-red-400 flex-shrink-0" />
                    <div>
                        <p className="font-bold text-red-400 text-sm">{displayName} is currently OFFLINE</p>
                        <p className="text-red-400/60 text-xs mt-0.5">All incoming calls will go to voicemail. Click START to resume.</p>
                    </div>
                </div>
            )}

            {/* Not Provisioned Banner */}
            {!assistantId && config.is_active && (
                <div className="bg-amber-500/10 border border-amber-500/20 rounded-2xl p-4 flex items-center justify-between gap-4">
                    <div className="flex gap-3">
                        <ShieldAlert className="w-6 h-6 text-amber-400 flex-shrink-0" />
                        <div>
                            <p className="font-bold text-amber-400 text-sm">AI Agent Not Provisioned</p>
                            <p className="text-amber-400/60 text-xs mt-0.5">Voice logic is missing. Click FIX AGENT to provision in a few seconds.</p>
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

            {/* ===== SECTION 1: Identity ===== */}
            <div className="glass-panel p-6 border border-white/5">
                <h4 className="font-bold flex items-center gap-2 mb-5">
                    <Bot className="w-5 h-5 text-luxe-gold" />
                    Receptionist Identity
                </h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-5 mb-5">
                    {/* AI Name */}
                    <div>
                        <label className="text-xs font-bold text-white/50 uppercase tracking-wider mb-2 block">AI Name</label>
                        <input
                            type="text"
                            value={editAiName}
                            onChange={e => setEditAiName(e.target.value)}
                            placeholder="Aria"
                            title="AI Receptionist Name"
                            aria-label="AI Receptionist Name"
                            className="w-full bg-white/5 border border-white/10 rounded-xl p-3 text-sm outline-none focus:border-luxe-gold/50 transition-all"
                        />
                        <p className="text-[10px] text-white/30 mt-1.5">Clients hear: "This is {displayName}, your personal beauty concierge."</p>
                    </div>

                    {/* Custom Greeting */}
                    <div>
                        <label className="text-xs font-bold text-white/50 uppercase tracking-wider mb-2 block">Custom Greeting (optional)</label>
                        <input
                            type="text"
                            value={editFirstMessage}
                            onChange={e => setEditFirstMessage(e.target.value)}
                            placeholder={`Hi! Welcome to ${tenantSalonName || 'our salon'}! I'm ${displayName}. How may I help you today?`}
                            title="Custom Greeting"
                            aria-label="Custom Greeting"
                            className="w-full bg-white/5 border border-white/10 rounded-xl p-3 text-sm outline-none focus:border-luxe-gold/50 transition-all"
                        />
                        <p className="text-[10px] text-white/30 mt-1.5">Leave empty to use the default warm greeting.</p>
                    </div>
                </div>

                {/* Voice + Language */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                    {/* Voice */}
                    <div>
                        <label className="text-xs font-bold text-white/50 uppercase tracking-wider mb-2 block">
                            <UserCircle className="w-3.5 h-3.5 inline mr-1" />Voice Model
                        </label>
                        <div className="flex bg-white/5 border border-white/10 rounded-xl focus-within:border-luxe-gold/50 transition-all overflow-hidden [color-scheme:dark]">
                            <select
                                value={editVoiceId}
                                onChange={e => {
                                    setEditVoiceId(e.target.value);
                                    if (isPlayingPreview && audioRef.current) { audioRef.current.pause(); setIsPlayingPreview(false); }
                                }}
                                title="Voice Selection"
                                aria-label="Voice Selection"
                                className="flex-1 bg-transparent p-3 text-sm outline-none border-none"
                            >
                                {AVAILABLE_VOICES.map(v => <option key={v.id} value={v.id}>{v.name}</option>)}
                            </select>
                            <button
                                onClick={toggleAudioPreview}
                                className={`px-4 border-l border-white/10 hover:bg-white/10 transition-all ${isPlayingPreview ? 'text-luxe-gold' : 'text-white/60 hover:text-white'}`}
                                title={isPlayingPreview ? 'Stop Preview' : 'Play Preview'}
                                aria-label="Preview Voice"
                            >
                                {isPlayingPreview ? <Square className="w-4 h-4 fill-current" /> : <Volume2 className="w-4 h-4" />}
                            </button>
                        </div>
                    </div>

                    {/* Language */}
                    <div>
                        <label className="text-xs font-bold text-white/50 uppercase tracking-wider mb-2 block">
                            <Globe className="w-3.5 h-3.5 inline mr-1" />Primary Language
                        </label>
                        <select
                            value={editLanguage}
                            onChange={e => setEditLanguage(e.target.value)}
                            title="Language Selection"
                            aria-label="Language Selection"
                            className="w-full bg-zinc-900 text-white border border-white/10 rounded-xl p-3 text-sm outline-none focus:border-luxe-gold/50 transition-all"
                        >
                            {AI_LANGUAGES.map(l => <option key={l.value} value={l.value} className="bg-zinc-900">{l.label}</option>)}
                        </select>
                        <p className="text-[10px] text-white/30 mt-1.5">Auto-detected from your country. Override here if needed.</p>
                    </div>
                </div>
            </div>

            {/* ===== SECTION 2: Human Transfer ===== */}
            <div className="glass-panel p-6 border border-white/5">
                <h4 className="font-bold flex items-center gap-2 mb-2">
                    <Phone className="w-5 h-5 text-luxe-gold" />
                    Human Transfer
                </h4>
                <p className="text-xs text-white/40 mb-4">
                    When {displayName} cannot help, your client's call is forwarded to this number in real-time — this is an <strong className="text-white/70">actual phone call transfer</strong>, not an SMS.
                </p>
                <label className="text-xs font-bold text-white/50 uppercase tracking-wider mb-2 block">Transfer Phone Number</label>
                <input
                    type="tel"
                    value={editTransferPhone}
                    onChange={e => setEditTransferPhone(e.target.value)}
                    placeholder="+92 300 000 0000"
                    title="Human Transfer Number"
                    aria-label="Human Transfer Number"
                    className="w-full bg-white/5 border border-white/10 rounded-xl p-3 text-sm outline-none focus:border-luxe-gold/50 transition-all font-mono"
                />
                <p className="text-[10px] text-white/30 mt-1.5">Include country code (e.g. +92... for Pakistan, +1... for US). {displayName} will hand off the live call directly.</p>
                <div className="mt-4 bg-luxe-gold/5 border border-luxe-gold/15 rounded-xl p-4">
                    <p className="text-xs text-luxe-gold/80 font-bold mb-1">When does {displayName} transfer?</p>
                    <ul className="text-[11px] text-white/50 space-y-0.5">
                        <li>• Client says "manager", "owner", "human", or "real person"</li>
                        <li>• Client is upset or frustrated after 2 exchanges</li>
                        <li>• {displayName} cannot resolve the issue after 2 genuine attempts</li>
                    </ul>
                </div>
            </div>

            {/* ===== SECTION 3: Knowledge Base ===== */}
            <div className="glass-panel p-6 border border-white/5">
                <h4 className="font-bold flex items-center gap-2 mb-2">
                    <BookOpen className="w-5 h-5 text-luxe-gold" />
                    Custom Knowledge Base
                </h4>

                {/* Safety Warning */}
                <div className="mb-4 bg-amber-500/10 border border-amber-500/25 rounded-xl p-4">
                    <div className="flex items-start gap-2">
                        <AlertTriangle className="w-4 h-4 text-amber-400 mt-0.5 shrink-0" />
                        <div>
                            <p className="text-xs font-bold text-amber-400 mb-1.5">Only add info NOT already in your system</p>
                            <p className="text-[11px] text-white/60 mb-2">
                                Your hours, services, pricing & staff come automatically from your dashboard — <strong className="text-amber-400">do not repeat them here</strong>. If this conflicts with system data, system data always wins.
                            </p>
                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <p className="text-[10px] text-green-400 font-bold mb-1">✅ Good to add:</p>
                                    <ul className="text-[10px] text-white/50 space-y-0.5">
                                        <li>• Parking instructions</li>
                                        <li>• Dress code</li>
                                        <li>• Late arrival policy</li>
                                        <li>• Walk-in rules</li>
                                        <li>• Custom FAQs</li>
                                    </ul>
                                </div>
                                <div>
                                    <p className="text-[10px] text-red-400 font-bold mb-1">❌ Do NOT add:</p>
                                    <ul className="text-[10px] text-white/50 space-y-0.5">
                                        <li>• Business hours</li>
                                        <li>• Service prices</li>
                                        <li>• Staff names/hours</li>
                                        <li>• Service descriptions</li>
                                    </ul>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                <textarea
                    value={editKnowledge}
                    onChange={e => setEditKnowledge(e.target.value)}
                    placeholder={"Example:\n• Free parking behind the building\n• Clients arriving 10+ min late may need to reschedule\n• We use vegan, cruelty-free products only\n• No children under 12 permitted in the salon"}
                    rows={5}
                    title="Custom Knowledge Base"
                    aria-label="Custom Knowledge Base"
                    className="w-full bg-white/5 border border-white/10 rounded-xl p-3 text-sm outline-none focus:border-luxe-gold/50 transition-all resize-none leading-relaxed"
                />
            </div>

            {/* ===== SECTION 4: Privacy Policy ===== */}
            <div className="glass-panel p-6 border border-white/5">
                <h4 className="font-bold flex items-center gap-2 mb-2">
                    <Shield className="w-5 h-5 text-luxe-gold" />
                    Privacy Policy Statement
                </h4>
                <p className="text-xs text-white/40 mb-4">
                    What {displayName} says if a client asks about their data or call recording. Kept completely separate from the knowledge base.
                </p>
                <textarea
                    value={editPrivacyPolicy}
                    onChange={e => setEditPrivacyPolicy(e.target.value)}
                    placeholder={`Default: "Your personal information is used only to manage your appointments and will never be shared with third parties. This call may be recorded for quality purposes."`}
                    rows={3}
                    title="Privacy Policy Statement"
                    aria-label="Privacy Policy Statement"
                    className="w-full bg-white/5 border border-white/10 rounded-xl p-3 text-sm outline-none focus:border-luxe-gold/50 transition-all resize-none leading-relaxed"
                />
                <p className="text-[10px] text-white/30 mt-1.5">Leave empty to use the default privacy statement above.</p>
            </div>

            {/* ===== SECTION 5: Announcements ===== */}
            <div className="glass-panel p-6 border border-white/5">
                <h4 className="font-bold flex items-center gap-2 mb-2">
                    <Megaphone className="w-5 h-5 text-luxe-gold" />
                    Announcements & Offers
                </h4>
                <p className="text-xs text-white/40 mb-4">
                    {displayName} will naturally mention these during calls — especially after booking confirmation.
                </p>
                <textarea
                    value={editAnnouncements}
                    onChange={e => setEditAnnouncements(e.target.value)}
                    placeholder={"Example:\n• 20% off all hair colour services in April\n• Now open on Sundays — limited slots!\n• Gift vouchers available — perfect for Mother's Day"}
                    rows={4}
                    title="Shop Announcements"
                    aria-label="Shop Announcements"
                    className="w-full bg-white/5 border border-white/10 rounded-xl p-3 text-sm outline-none focus:border-luxe-gold/50 transition-all resize-none leading-relaxed"
                />
            </div>

            {/* ===== EMBED SNIPPET ===== */}
            {assistantId && (
                <div className="glass-panel p-6 border border-white/5">
                    <h4 className="font-bold flex items-center gap-2 mb-3">
                        <Code2 className="w-5 h-5 text-luxe-gold" />
                        Website Chat Widget
                    </h4>
                    <p className="text-xs text-white/40 mb-4">Paste this snippet into your website to activate the AI chat bubble.</p>
                    <div className="flex items-center gap-3">
                        <div className="flex-1 bg-black/30 rounded-xl p-3 font-mono text-xs text-white/50 border border-white/5 truncate">
                            &lt;script src="vapi..."&gt; // assistant: {assistantId.slice(0, 8)}...
                        </div>
                        <button
                            onClick={handleCopySnippet}
                            className="flex items-center gap-2 px-4 py-3 rounded-xl border border-white/10 hover:border-luxe-gold/30 hover:bg-white/5 text-sm font-bold transition-all whitespace-nowrap"
                            title="Copy embed snippet"
                        >
                            {copiedSnippet ? <><CheckCheck className="w-4 h-4 text-green-400" /> COPIED!</> : <><Copy className="w-4 h-4" /> COPY CODE</>}
                        </button>
                    </div>
                    {config.is_active && assistantId && (
                        <div className="mt-3 flex items-center gap-2 text-xs text-green-400/70">
                            <ShieldCheck className="w-4 h-4" />
                            Widget is active and connected to your live AI receptionist.
                        </div>
                    )}
                </div>
            )}

            {/* ===== ACTION BAR ===== */}
            <div className="flex justify-end gap-3">
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
                    {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Zap className="w-4 h-4" />}
                    {saving ? 'SYNCING...' : 'SAVE & SYNC AI ⚡'}
                </button>
            </div>

        </div>
    );
};
