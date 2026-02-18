import React, { useState, useEffect, useCallback } from 'react';
import {
    PhoneCall, Search, Play, Clock, Calendar, CheckCircle2,
    MessageSquare, ChevronRight, Bot, Loader2, X, Filter,
    FileText, Volume2
} from 'lucide-react';
import { supabase } from '../lib/supabase';
import { TENANT_ID } from '../config/constants';
import { showToast } from './ui/ToastNotification';

interface CallLog {
    id: string; caller_phone: string; call_duration: number;
    transcript: string; action_taken: string; created_at: string;
    booking_id: string | null; recording_url?: string | null;
}

export const CallLogs: React.FC = () => {
    const [logs, setLogs] = useState<CallLog[]>([]);
    const [loading, setLoading] = useState(true);
    const [selectedLog, setSelectedLog] = useState<CallLog | null>(null);
    const [search, setSearch] = useState('');
    const [showTranscript, setShowTranscript] = useState(false);

    // Date range filter
    const [dateFrom, setDateFrom] = useState('');
    const [dateTo, setDateTo] = useState('');

    const fetchLogs = useCallback(async () => {
        if (!TENANT_ID) return;
        setLoading(true);

        let query = supabase
            .from('call_logs')
            .select('*')
            .eq('tenant_id', TENANT_ID)
            .order('created_at', { ascending: false })
            .limit(50);

        if (dateFrom) {
            query = query.gte('created_at', new Date(dateFrom).toISOString());
        }
        if (dateTo) {
            const endDate = new Date(dateTo);
            endDate.setHours(23, 59, 59, 999);
            query = query.lte('created_at', endDate.toISOString());
        }

        const { data } = await query;
        if (data) {
            setLogs(data);
            if (data.length > 0) setSelectedLog(data[0]);
            else setSelectedLog(null);
        }
        setLoading(false);
    }, [dateFrom, dateTo]);

    useEffect(() => { fetchLogs(); }, [fetchLogs]);

    const formatDuration = (seconds: number) => {
        if (!seconds) return '0:00';
        const m = Math.floor(seconds / 60);
        const s = seconds % 60;
        return `${m}:${String(s).padStart(2, '0')}`;
    };

    const formatTime = (iso: string) => {
        const d = new Date(iso);
        const now = new Date();
        const diff = now.getTime() - d.getTime();
        if (diff < 86400000) return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        if (diff < 172800000) return 'Yesterday';
        return d.toLocaleDateString();
    };

    const getStatus = (log: CallLog): 'Booked' | 'Inquiry' | 'Missed' => {
        if (log.booking_id) return 'Booked';
        if (log.action_taken?.toLowerCase().includes('miss') || !log.transcript) return 'Missed';
        return 'Inquiry';
    };

    const filtered = logs.filter(l =>
        l.caller_phone?.includes(search) ||
        l.transcript?.toLowerCase().includes(search.toLowerCase()) ||
        l.action_taken?.toLowerCase().includes(search.toLowerCase())
    );

    const clearFilters = () => {
        setDateFrom('');
        setDateTo('');
    };

    if (loading) {
        return <div className="flex items-center justify-center h-64"><Loader2 className="w-8 h-8 text-luxe-gold animate-spin" /></div>;
    }

    return (
        <div className="h-full flex flex-col space-y-6 animate-in fade-in duration-500 overflow-hidden">
            {/* Header */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div className="flex items-center gap-3">
                    <div className="p-3 bg-luxe-gold/10 rounded-2xl border border-luxe-gold/20">
                        <PhoneCall className="w-6 h-6 text-luxe-gold" />
                    </div>
                    <div>
                        <h3 className="text-xl font-bold">Bella Call Logs</h3>
                        <p className="text-xs text-white/40 uppercase tracking-widest">Live Voice Agent Activity</p>
                    </div>
                </div>
                <div className="flex items-center gap-3 flex-wrap">
                    {/* Date Range Filter */}
                    <div className="flex items-center gap-2 bg-white/5 border border-white/10 rounded-xl px-3 py-1.5">
                        <Filter className="w-3.5 h-3.5 text-white/30" />
                        <input
                            type="date" value={dateFrom}
                            onChange={e => setDateFrom(e.target.value)}
                            className="bg-transparent text-xs outline-none text-white/60 w-28"
                            title="From date"
                        />
                        <span className="text-white/20 text-xs">→</span>
                        <input
                            type="date" value={dateTo}
                            onChange={e => setDateTo(e.target.value)}
                            className="bg-transparent text-xs outline-none text-white/60 w-28"
                            title="To date"
                        />
                        {(dateFrom || dateTo) && (
                            <button onClick={clearFilters} className="p-0.5 hover:bg-white/10 rounded transition-all" title="Clear dates">
                                <X className="w-3.5 h-3.5 text-white/40" />
                            </button>
                        )}
                    </div>
                    <div className="relative">
                        <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-white/30" />
                        <input
                            type="text" placeholder="Search logs..." value={search}
                            onChange={e => setSearch(e.target.value)}
                            className="bg-white/5 border border-white/10 rounded-xl pl-10 pr-4 py-2 text-xs outline-none focus:border-luxe-gold/50 w-64"
                        />
                    </div>
                    <button
                        onClick={fetchLogs}
                        className="bg-gold-gradient text-luxe-obsidian px-6 py-2 rounded-xl font-bold flex items-center gap-2 shadow-lg shadow-luxe-gold/20 hover:scale-[1.02] active:scale-[0.98] transition-all"
                    >
                        REFRESH
                    </button>
                </div>
            </div>

            <div className="flex-1 grid grid-cols-1 lg:grid-cols-3 gap-6 overflow-hidden">
                {/* Logs List */}
                <div className="lg:col-span-1 glass-panel flex flex-col overflow-hidden border border-white/5">
                    <div className="p-4 border-b border-white/5 bg-white/5 flex items-center justify-between">
                        <span className="text-[10px] font-black uppercase tracking-[0.2em] text-white/30">Recent Conversations</span>
                        <span className="text-[10px] bg-luxe-gold/20 text-luxe-gold px-2 py-0.5 rounded-full font-bold">{filtered.length} CALLS</span>
                    </div>
                    <div className="flex-1 overflow-y-auto custom-scrollbar">
                        {filtered.length === 0 && (
                            <div className="p-8 text-center text-white/30 text-sm">No call logs found</div>
                        )}
                        {filtered.map(log => {
                            const status = getStatus(log);
                            return (
                                <button
                                    key={log.id}
                                    onClick={() => setSelectedLog(log)}
                                    className={`w-full p-5 text-left border-b border-white/5 transition-all hover:bg-white/[0.03] group relative ${selectedLog?.id === log.id ? 'bg-white/[0.05]' : ''}`}
                                >
                                    <div className="flex justify-between items-start mb-1">
                                        <h4 className={`font-bold text-sm ${selectedLog?.id === log.id ? 'text-luxe-gold' : ''}`}>
                                            {log.caller_phone || 'Unknown'}
                                        </h4>
                                        <span className="text-[10px] text-white/30">{formatTime(log.created_at)}</span>
                                    </div>
                                    <p className="text-[11px] text-white/40 truncate">{log.action_taken || log.transcript || 'No details'}</p>
                                    <div className="flex items-center gap-3 mt-3">
                                        <span className={`text-[9px] font-bold px-2 py-0.5 rounded ${status === 'Booked' ? 'bg-green-500/10 text-green-400' :
                                            status === 'Inquiry' ? 'bg-blue-500/10 text-blue-400' :
                                                'bg-red-500/10 text-red-400'
                                            }`}>{status.toUpperCase()}</span>
                                        <span className="text-[9px] text-white/20 flex items-center gap-1 font-bold">
                                            <Clock className="w-2.5 h-2.5" /> {formatDuration(log.call_duration)}
                                        </span>
                                        {log.recording_url && (
                                            <span className="text-[9px] text-luxe-gold/60 flex items-center gap-1 font-bold">
                                                <Volume2 className="w-2.5 h-2.5" /> REC
                                            </span>
                                        )}
                                    </div>
                                    {selectedLog?.id === log.id && (
                                        <div className="absolute left-0 top-0 bottom-0 w-1 bg-luxe-gold shadow-[0_0_10px_#D4AF37]" />
                                    )}
                                </button>
                            );
                        })}
                    </div>
                </div>

                {/* Call Detail */}
                <div className="lg:col-span-2 flex flex-col gap-6 overflow-hidden">
                    {selectedLog ? (
                        <>
                            <div className="glass-panel p-8 flex flex-col relative overflow-hidden">
                                <div className="absolute top-0 right-0 p-8 opacity-[0.03]">
                                    <PhoneCall className="w-48 h-48 -mr-12 -mt-12" />
                                </div>
                                <div className="flex justify-between items-start mb-10 relative z-10">
                                    <div className="flex items-center gap-6">
                                        <div className="w-20 h-20 rounded-3xl bg-gold-gradient flex items-center justify-center shadow-xl shadow-luxe-gold/20">
                                            <Bot className="w-10 h-10 text-luxe-obsidian" />
                                        </div>
                                        <div>
                                            <div className="flex items-center gap-3 mb-1">
                                                <h2 className="text-2xl font-black tracking-tight">{selectedLog.caller_phone || 'Unknown'}</h2>
                                                <span className={`text-[9px] font-bold px-2 py-0.5 rounded ${getStatus(selectedLog) === 'Booked' ? 'bg-green-500/10 text-green-400' :
                                                    getStatus(selectedLog) === 'Inquiry' ? 'bg-blue-500/10 text-blue-400' :
                                                        'bg-red-500/10 text-red-400'
                                                    }`}>{getStatus(selectedLog).toUpperCase()}</span>
                                            </div>
                                            <p className="text-white/40 text-sm flex items-center gap-2">
                                                <Calendar className="w-4 h-4" />
                                                {new Date(selectedLog.created_at).toLocaleString()} • {formatDuration(selectedLog.call_duration)}
                                            </p>
                                        </div>
                                    </div>
                                    {/* Action Buttons */}
                                    <div className="flex items-center gap-2 relative z-10">
                                        {selectedLog.recording_url && (
                                            <button
                                                onClick={() => window.open(selectedLog.recording_url!, '_blank')}
                                                className="flex items-center gap-2 px-4 py-2 rounded-xl bg-green-500/10 text-green-400 border border-green-500/20 text-xs font-bold hover:bg-green-500/20 transition-all"
                                            >
                                                <Play className="w-4 h-4" /> Play Recording
                                            </button>
                                        )}
                                        {selectedLog.transcript && (
                                            <button
                                                onClick={() => setShowTranscript(true)}
                                                className="flex items-center gap-2 px-4 py-2 rounded-xl bg-blue-500/10 text-blue-400 border border-blue-500/20 text-xs font-bold hover:bg-blue-500/20 transition-all"
                                            >
                                                <FileText className="w-4 h-4" /> View Transcript
                                            </button>
                                        )}
                                    </div>
                                </div>

                                {/* Action Taken */}
                                {selectedLog.action_taken && (
                                    <div className="bg-luxe-gold/5 border border-luxe-gold/10 rounded-3xl p-6 mb-6 relative z-10">
                                        <div className="flex items-center gap-2 mb-3 text-luxe-gold">
                                            <CheckCircle2 className="w-4 h-4" />
                                            <span className="text-[10px] font-black uppercase tracking-widest">Action Taken</span>
                                        </div>
                                        <p className="text-white/80 text-sm">{selectedLog.action_taken}</p>
                                    </div>
                                )}

                                {/* Transcript Preview */}
                                {selectedLog.transcript && (
                                    <div className="bg-white/[0.03] border border-white/5 rounded-3xl p-6 relative z-10">
                                        <div className="flex items-center gap-2 mb-4 text-luxe-gold">
                                            <MessageSquare className="w-4 h-4" />
                                            <span className="text-[10px] font-black uppercase tracking-widest">AI Conversation Transcript</span>
                                        </div>
                                        <p className="text-white/70 text-sm leading-relaxed italic whitespace-pre-wrap line-clamp-6">
                                            "{selectedLog.transcript}"
                                        </p>
                                        {selectedLog.transcript.length > 300 && (
                                            <button
                                                onClick={() => setShowTranscript(true)}
                                                className="mt-3 text-luxe-gold text-xs font-bold hover:underline"
                                            >
                                                Read full transcript →
                                            </button>
                                        )}
                                    </div>
                                )}
                            </div>

                            {/* Info Cards */}
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div className="glass-panel p-6 flex items-center gap-4 group hover:gold-border transition-all">
                                    <div className="w-10 h-10 rounded-xl bg-green-500/10 flex items-center justify-center">
                                        <CheckCircle2 className="w-5 h-5 text-green-400" />
                                    </div>
                                    <div>
                                        <p className="text-[10px] text-white/30 uppercase font-bold">Status</p>
                                        <p className="text-sm font-bold">{getStatus(selectedLog)}</p>
                                    </div>
                                    <ChevronRight className="w-4 h-4 ml-auto text-white/10" />
                                </div>
                                <div className="glass-panel p-6 flex items-center gap-4 group hover:gold-border transition-all">
                                    <div className="w-10 h-10 rounded-xl bg-blue-500/10 flex items-center justify-center">
                                        <Clock className="w-5 h-5 text-blue-400" />
                                    </div>
                                    <div>
                                        <p className="text-[10px] text-white/30 uppercase font-bold">Duration</p>
                                        <p className="text-sm font-bold">{formatDuration(selectedLog.call_duration)}</p>
                                    </div>
                                    <ChevronRight className="w-4 h-4 ml-auto text-white/10" />
                                </div>
                            </div>
                        </>
                    ) : (
                        <div className="glass-panel flex-1 flex flex-col items-center justify-center text-center p-20">
                            <Bot className="w-16 h-16 text-white/5 mb-6 animate-pulse" />
                            <h3 className="text-xl font-bold">No call logs yet</h3>
                            <p className="text-white/30 mt-2">Bella's conversations will appear here</p>
                        </div>
                    )}
                </div>
            </div>

            {/* Transcript Modal */}
            {showTranscript && selectedLog?.transcript && (
                <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={() => setShowTranscript(false)}>
                    <div className="bg-luxe-obsidian border border-white/10 rounded-2xl p-8 w-full max-w-2xl shadow-2xl max-h-[80vh] flex flex-col" onClick={e => e.stopPropagation()}>
                        <div className="flex justify-between items-center mb-6">
                            <h3 className="text-xl font-bold flex items-center gap-2">
                                <MessageSquare className="w-6 h-6 text-luxe-gold" />
                                Full Transcript
                            </h3>
                            <div className="flex items-center gap-3">
                                <span className="text-xs text-white/30">{selectedLog.caller_phone} • {new Date(selectedLog.created_at).toLocaleString()}</span>
                                <button onClick={() => setShowTranscript(false)} className="p-2 hover:bg-white/10 rounded-xl transition-all">
                                    <X className="w-5 h-5" />
                                </button>
                            </div>
                        </div>
                        <div className="flex-1 overflow-y-auto custom-scrollbar bg-white/[0.02] border border-white/5 rounded-2xl p-6">
                            <p className="text-white/80 text-sm leading-relaxed whitespace-pre-wrap">
                                {selectedLog.transcript}
                            </p>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};
