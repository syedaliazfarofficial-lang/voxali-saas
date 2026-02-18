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
    PowerOff
} from 'lucide-react';
import { supabase } from '../lib/supabase';
import { TENANT_ID } from '../config/constants';
import { showToast } from './ui/ToastNotification';

interface AgentConfig {
    id: string;
    system_prompt: string;
    announcements: string;
    is_active: boolean;
    updated_at: string;
}

export const BellaAI: React.FC = () => {
    const [config, setConfig] = useState<AgentConfig | null>(null);
    const [editPrompt, setEditPrompt] = useState('');
    const [editAnnouncements, setEditAnnouncements] = useState('');
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [hasChanges, setHasChanges] = useState(false);

    const fetchConfig = useCallback(async () => {
        if (!TENANT_ID) return;
        setLoading(true);
        const { data, error } = await supabase
            .from('ai_agent_config')
            .select('*')
            .eq('tenant_id', TENANT_ID)
            .single();
        if (!error && data) {
            const c = data as AgentConfig;
            setConfig(c);
            setEditPrompt(c.system_prompt);
            setEditAnnouncements(c.announcements || '');
        }
        setLoading(false);
    }, []);

    useEffect(() => { fetchConfig(); }, [fetchConfig]);

    useEffect(() => {
        if (!config) return;
        setHasChanges(editPrompt !== config.system_prompt || editAnnouncements !== (config.announcements || ''));
    }, [editPrompt, editAnnouncements, config]);

    const handleSave = async () => {
        if (!config) return;
        setSaving(true);
        const { error } = await supabase
            .from('ai_agent_config')
            .update({
                system_prompt: editPrompt,
                announcements: editAnnouncements,
                updated_at: new Date().toISOString(),
            })
            .eq('id', config.id);
        if (!error) {
            setConfig(prev => prev ? { ...prev, system_prompt: editPrompt, announcements: editAnnouncements } : prev);
            setHasChanges(false);
            showToast('Saved successfully!');
        }
        setSaving(false);
    };

    const handleToggle = async () => {
        if (!config) return;
        const newVal = !config.is_active;
        const { error } = await supabase
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
        setEditPrompt(config.system_prompt);
        setEditAnnouncements(config.announcements || '');
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center h-64">
                <Loader2 className="w-8 h-8 text-luxe-gold animate-spin" />
            </div>
        );
    }

    if (!config) {
        return (
            <div className="glass-panel p-16 flex flex-col items-center justify-center text-center">
                <Bot className="w-12 h-12 text-white/10 mb-4" />
                <h4 className="font-bold text-lg text-white/50">No AI config found</h4>
                <p className="text-white/30 text-sm mt-1">Run the SQL migration to create the ai_agent_config table and seed data.</p>
            </div>
        );
    }

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
        </div>
    );
};
