import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
    PhoneCall, Search, Play, Pause, Clock, Calendar, CheckCircle2,
    MessageSquare, Bot, Loader2, X, Filter,
    FileText, Volume2, RefreshCw, Wifi, MessageCircle, Phone, AlertCircle
} from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useTenant } from '../context/TenantContext';
import { showToast } from './ui/ToastNotification';
import { Skeleton } from './ui/Skeleton';

interface CallLog {
    id?: string;
    conversation_id: string;
    caller_phone: string;
    call_duration: number;       // seconds
    transcript: string;
    transcript_summary: string;
    action_taken: string;
    created_at: string;
    call_ended_at?: string;
    recording_url?: string | null;
    call_type?: string;          // webCall | inboundPhoneCall | outboundPhoneCall
    status?: string;
}

// Derive call type from stored data
function resolveCallType(log: CallLog): string {
    if (log.call_type) return log.call_type;
    if (log.caller_phone === 'Web Chat' || !log.caller_phone) return 'webCall';
    if (log.caller_phone?.startsWith('+') || log.caller_phone?.match(/^\d/)) return 'inboundPhoneCall';
    return 'webCall';
}

export const CallLogs: React.FC = () => {
    const [logs, setLogs] = useState<CallLog[]>([]);
    const { tenantId, timezone } = useTenant();
    const [loading, setLoading] = useState(true);
    const [syncing, setSyncing] = useState(false);
    const [selectedLog, setSelectedLog] = useState<CallLog | null>(null);
    const [search, setSearch] = useState('');
    const [showTranscript, setShowTranscript] = useState(false);
    const [showPlayer, setShowPlayer] = useState(false);
    const [isPlaying, setIsPlaying] = useState(false);
    const [dateFrom, setDateFrom] = useState('');
    const [dateTo, setDateTo] = useState('');
    const audioRef = useRef<HTMLAudioElement>(null);

    // Helper to parse transcript text into chat bubble blocks
    const parseTranscript = (text: string) => {
        if (!text) return [];
        return text.split('\n').map((line, idx) => {
            const cleaned = line.trim();
            if (!cleaned) return null;
            const match = cleaned.match(/^(Bella|AI|Client|User|Agent|Caller|Customer|System|Unknown):\s*(.*)/i);
            if (match) {
                return {
                    id: idx,
                    sender: match[1].toLowerCase(),
                    senderName: match[1],
                    message: match[2]
                };
            }
            return {
                id: idx,
                sender: 'unknown',
                senderName: 'Message',
                message: cleaned
            };
        }).filter(Boolean) as { id: number; sender: string; senderName: string; message: string }[];
    };

    // Format seconds → m:ss
    const formatDuration = (seconds: number) => {
        if (!seconds || seconds <= 0) return '—';
        const m = Math.floor(seconds / 60);
        const s = Math.floor(seconds % 60);
        return `${m}:${String(s).padStart(2, '0')}`;
    };

    const formatTime = (iso: string) => {
        if (!iso) return '—';
        const d = new Date(iso);
        const now = new Date();
        const diff = now.getTime() - d.getTime();
        const tz = timezone || 'America/New_York';
        if (diff < 86400000) return d.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', timeZone: tz });
        if (diff < 604800000) return d.toLocaleDateString('en-US', { weekday: 'short', hour: '2-digit', minute: '2-digit', timeZone: tz });
        return d.toLocaleDateString('en-US', { timeZone: tz });
    };

    const getStatus = (log: CallLog): 'Booked' | 'Inquiry' | 'Web Chat' | 'Missed' => {
        if (log.action_taken?.includes('booking_created')) return 'Booked';
        const ct = resolveCallType(log);
        if (ct === 'webCall') return 'Web Chat';
        if (!log.transcript || log.call_duration === 0) return 'Missed';
        return 'Inquiry';
    };

    const statusStyle: Record<string, string> = {
        'Booked':    'bg-green-500/10 text-green-400 border border-green-500/20',
        'Inquiry':   'bg-blue-500/10 text-blue-400 border border-blue-500/20',
        'Web Chat':  'bg-purple-500/10 text-purple-400 border border-purple-500/20',
        'Missed':    'bg-red-500/10 text-red-400 border border-red-500/20',
    };

    // Apply date filter to logs array
    const applyDateFilter = (allLogs: CallLog[]) => {
        if (!dateFrom && !dateTo) return allLogs;
        return allLogs.filter(log => {
            const logDate = new Date(log.created_at);
            if (dateFrom && logDate < new Date(dateFrom)) return false;
            if (dateTo) {
                const end = new Date(dateTo);
                end.setHours(23, 59, 59, 999);
                if (logDate > end) return false;
            }
            return true;
        });
    };

    // Fetch from DB (fast, instant)
    const fetchFromDB = useCallback(async () => {
        if (!tenantId) return;
        setLoading(true);
        const { data } = await supabase
            .from('call_logs')
            .select('*')
            .eq('tenant_id', tenantId)
            .order('created_at', { ascending: false })
            .limit(200);

        if (data && data.length > 0) {
            const filtered = applyDateFilter(data);
            setLogs(filtered);
        }
        setLoading(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [tenantId]);

    // Sync from Vapi API
    const syncFromVapi = useCallback(async (showSuccessToast = true) => {
        if (!tenantId) return;
        setSyncing(true);
        try {
            const res = await fetch(
                `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/get-vapi-logs`,
                {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ tenant_id: tenantId }),
                }
            );

            if (!res.ok) {
                const err = await res.json().catch(() => ({}));
                throw new Error(err.error || `HTTP ${res.status}`);
            }

            const result = await res.json();

            if (result.logs && result.logs.length > 0) {
                const sorted = [...result.logs].sort(
                    (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
                );
                const filtered = applyDateFilter(sorted);
                setLogs(filtered);
                if (filtered.length > 0) {
                    setSelectedLog(prev =>
                        prev ? filtered.find(l => l.conversation_id === prev.conversation_id) || prev : null
                    );
                }

                if (showSuccessToast) {
                    const msg = result.synced > 0
                        ? `✅ ${result.synced} new calls synced. ${result.minutes_billed} mins billed.`
                        : `${result.total} calls loaded (all up to date)`;
                    showToast(msg);
                }
            } else if (result.message && showSuccessToast) {
                showToast(result.message, 'error');
            }
        } catch (e: any) {
            if (showSuccessToast) showToast('Sync failed: ' + e.message, 'error');
        }
        setSyncing(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [tenantId, dateFrom, dateTo]);

    useEffect(() => {
        if (!tenantId) return;
        fetchFromDB().then(() => syncFromVapi(false));
    }, [tenantId]);

    // Re-apply date filter when dates change
    useEffect(() => {
        fetchFromDB();
    }, [dateFrom, dateTo]);

    // Audio player controls
    const handlePlayPause = () => {
        const audio = audioRef.current;
        if (!audio) return;
        if (isPlaying) {
            audio.pause();
            setIsPlaying(false);
        } else {
            audio.play().then(() => setIsPlaying(true)).catch(() => setIsPlaying(false));
        }
    };

    const clearFilters = () => { setDateFrom(''); setDateTo(''); };

    const filtered = logs.filter(l =>
        !search ||
        l.caller_phone?.toLowerCase().includes(search.toLowerCase()) ||
        l.transcript?.toLowerCase().includes(search.toLowerCase()) ||
        l.action_taken?.toLowerCase().includes(search.toLowerCase()) ||
        l.transcript_summary?.toLowerCase().includes(search.toLowerCase())
    );

    // Calculate quick stats after helper functions (like getStatus) are defined
    const totalCallsCount = logs.length;
    const webChatsCount = logs.filter(l => resolveCallType(l) === 'webCall').length;
    const phoneCallsCount = logs.filter(l => resolveCallType(l) !== 'webCall').length;
    const missedCallsCount = logs.filter(l => getStatus(l) === 'Missed').length;

    return (
        <div className="h-full flex flex-col space-y-4 animate-in fade-in duration-500 overflow-hidden">
            {/* Header */}
            <div className="flex items-center justify-between gap-4 border-b border-white/5 pb-3 mb-3">
                <div className="flex items-center gap-2.5 flex-shrink-0">
                    <div className="p-2 bg-luxe-gold/10 rounded-xl border border-luxe-gold/20">
                        <PhoneCall className="w-5 h-5 text-luxe-gold" />
                    </div>
                    <div>
                        <h3 className="text-base font-bold whitespace-nowrap text-white">Bella Call Logs</h3>
                        <p className="text-[9px] text-white/40 uppercase tracking-widest whitespace-nowrap">Live Voice + Chat Activity</p>
                    </div>
                </div>
                <div className="flex items-center gap-2 flex-shrink-0">
                    <div className="flex items-center gap-2 bg-white/5 border border-white/10 rounded-full px-3.5 py-1.5">
                        <Filter className="w-3.5 h-3.5 text-white/30" />
                        <input type="date" value={dateFrom} onChange={e => setDateFrom(e.target.value)}
                            className="bg-transparent text-xs outline-none text-white/60 w-28" />
                        <span className="text-white/20 text-xs">→</span>
                        <input type="date" value={dateTo} onChange={e => setDateTo(e.target.value)}
                            className="bg-transparent text-xs outline-none text-white/60 w-28" />
                        {(dateFrom || dateTo) && (
                            <button onClick={clearFilters} className="p-0.5 hover:bg-white/10 rounded">
                                <X className="w-3.5 h-3.5 text-white/40" />
                            </button>
                        )}
                    </div>
                    <div className="relative">
                        <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-white/30" />
                        <input type="text" placeholder="Search logs..." value={search}
                            onChange={e => setSearch(e.target.value)}
                            className="bg-white/5 border border-white/10 rounded-full pl-9 pr-4 py-1.5 text-xs outline-none focus:border-white/20 w-44 transition-all text-white placeholder-white/30" />
                    </div>
                    <button onClick={() => syncFromVapi(true)} disabled={syncing}
                        className="bg-gold-gradient text-luxe-obsidian px-3.5 py-1.5 rounded-full text-xs font-bold flex items-center gap-1.5 hover:bg-white/90 active:scale-[0.98] transition-all disabled:opacity-60 whitespace-nowrap">
                        {syncing ? <><Loader2 className="w-3.5 h-3.5 animate-spin" /> Syncing...</> : <><RefreshCw className="w-3.5 h-3.5" /> Refresh</>}
                    </button>
                </div>
            </div>

            {/* Top Row Stats Summary Cards */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-2 shrink-0">
                <div className="glass-panel p-4 flex items-center gap-3 border border-white/5">
                    <div className="p-2.5 bg-white/5 rounded-xl border border-white/10 text-white/60">
                        <PhoneCall className="w-4 h-4" />
                    </div>
                    <div>
                        <p className="text-[9px] text-white/35 font-bold uppercase tracking-wider">Total Interactions</p>
                        <p className="text-lg font-black text-white">{totalCallsCount}</p>
                    </div>
                </div>
                <div className="glass-panel p-4 flex items-center gap-3 border border-white/5">
                    <div className="p-2.5 bg-purple-500/10 rounded-xl border border-purple-500/20 text-purple-400">
                        <MessageCircle className="w-4 h-4" />
                    </div>
                    <div>
                        <p className="text-[9px] text-purple-400/60 font-bold uppercase tracking-wider">Web Chats</p>
                        <p className="text-lg font-black text-white">{webChatsCount}</p>
                    </div>
                </div>
                <div className="glass-panel p-4 flex items-center gap-3 border border-white/5">
                    <div className="p-2.5 bg-green-500/10 rounded-xl border border-green-500/20 text-green-400">
                        <Phone className="w-4 h-4" />
                    </div>
                    <div>
                        <p className="text-[9px] text-green-400/60 font-bold uppercase tracking-wider">Voice Calls</p>
                        <p className="text-lg font-black text-white">{phoneCallsCount}</p>
                    </div>
                </div>
                <div className="glass-panel p-4 flex items-center gap-3 border border-white/5">
                    <div className="p-2.5 bg-red-500/10 rounded-xl border border-red-500/20 text-red-400">
                        <AlertCircle className="w-4 h-4" />
                    </div>
                    <div>
                        <p className="text-[9px] text-red-400/60 font-bold uppercase tracking-wider">Missed Calls</p>
                        <p className="text-lg font-black text-white">{missedCallsCount}</p>
                    </div>
                </div>
            </div>

            <div className="flex-1 glass-panel flex flex-col overflow-hidden border border-white/5">
                <div className="py-3.5 px-4 border-b border-white/5 bg-white/[0.02] flex items-center justify-between shrink-0">
                    <span className="text-[10px] font-black uppercase tracking-[0.2em] text-white/30">Recent Conversations</span>
                    <span className="text-[10px] bg-luxe-gold/20 text-luxe-gold px-2.5 py-0.5 rounded-full font-bold">{filtered.length} CALLS</span>
                </div>
                
                <div className="flex-1 overflow-y-auto custom-scrollbar divide-y divide-white/[0.04]">
                    {loading ? (
                        [1,2,3,4,5].map(i => (
                            <div key={i} className="p-4 flex items-center justify-between gap-6">
                                <div className="flex items-center gap-3 flex-1">
                                    <Skeleton variant="rect" width={32} height={32} className="rounded-lg" />
                                    <div className="space-y-1.5 flex-1">
                                        <Skeleton variant="text" width="25%" height={12} />
                                        <Skeleton variant="text" width="60%" height={10} />
                                    </div>
                                </div>
                                <Skeleton variant="rect" width={80} height={20} className="rounded-full" />
                                <Skeleton variant="rect" width={60} height={20} className="rounded-full" />
                            </div>
                        ))
                    ) : filtered.length === 0 ? (
                        <div className="p-16 text-center">
                            <Bot className="w-12 h-12 text-white/10 mx-auto mb-4" />
                            <h4 className="text-white/40 text-sm font-bold">No call logs found</h4>
                            <p className="text-white/20 text-xs mt-1">{dateFrom || dateTo ? 'Try clearing the date filter' : 'Click Refresh to sync from Vapi'}</p>
                        </div>
                    ) : (
                        filtered.map(log => {
                            const status = getStatus(log);
                            const ct = resolveCallType(log);
                            return (
                                <div
                                    key={log.conversation_id}
                                    onClick={() => { setSelectedLog(log); setShowTranscript(false); setShowPlayer(false); setIsPlaying(false); }}
                                    className={`w-full p-4 text-left transition-all hover:bg-white/[0.02] flex flex-col md:flex-row md:items-center justify-between gap-4 cursor-pointer relative group
                                        ${selectedLog?.conversation_id === log.conversation_id ? 'bg-white/[0.04]' : ''}`}
                                >
                                    <div className="flex items-center gap-3.5 flex-1 min-w-0">
                                        <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 border
                                            ${ct === 'webCall' 
                                                ? 'bg-purple-500/10 border-purple-500/20 text-purple-400' 
                                                : 'bg-luxe-gold/10 border-luxe-gold/20 text-luxe-gold'}`}>
                                            {ct === 'webCall' ? <MessageCircle className="w-4 h-4" /> : <Phone className="w-4 h-4" />}
                                        </div>
                                        <div className="min-w-0 flex-1">
                                            <div className="flex items-center gap-2.5 mb-1.5 flex-wrap">
                                                <h4 className="font-bold text-sm text-white">{log.caller_phone || 'Unknown'}</h4>
                                                <span className="text-[10px] text-white/30">{formatTime(log.created_at)}</span>
                                            </div>
                                            <p className="text-[11px] text-white/50 truncate max-w-[90%]">
                                                {log.transcript_summary || log.transcript?.substring(0, 120) || log.action_taken || 'No conversation details available'}
                                            </p>
                                        </div>
                                    </div>

                                    <div className="flex items-center gap-4 shrink-0 justify-between md:justify-end">
                                        <div className="flex items-center gap-2">
                                            <span className={`text-[9px] font-bold px-2 py-0.5 rounded ${statusStyle[status]}`}>{status.toUpperCase()}</span>
                                            {log.call_duration > 0 && (
                                                <span className="text-[9px] bg-white/5 border border-white/10 text-white/50 px-2 py-0.5 rounded flex items-center gap-1">
                                                    <Clock className="w-2.5 h-2.5" /> {formatDuration(log.call_duration)}
                                                </span>
                                            )}
                                            {log.recording_url && (
                                                <span className="text-[9px] bg-green-500/10 border border-green-500/20 text-green-400 px-2 py-0.5 rounded flex items-center gap-1">
                                                    <Volume2 className="w-2.5 h-2.5" /> REC
                                                </span>
                                            )}
                                        </div>
                                        <button className="bg-white/5 border border-white/10 hover:border-luxe-gold/30 hover:bg-luxe-gold/10 text-white text-xs font-bold px-3 py-1.5 rounded-xl transition-all active:scale-[0.98]">
                                            Details
                                        </button>
                                    </div>
                                    {selectedLog?.conversation_id === log.conversation_id && (
                                        <div className="absolute left-0 top-0 bottom-0 w-0.5 bg-luxe-gold shadow-[0_0_8px_#D4AF37]" />
                                    )}
                                </div>
                            );
                        })
                    )}
                </div>
            </div>

            {/* Centered Modal Detail View Overlay */}
            {selectedLog && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-200" onClick={() => setSelectedLog(null)}>
                    <div 
                        className="w-full max-w-2xl bg-luxe-obsidian border border-white/10 rounded-2xl max-h-[90vh] flex flex-col shadow-2xl relative overflow-hidden animate-in zoom-in-95 duration-200"
                        onClick={e => e.stopPropagation()}
                    >
                        {/* Modal Header */}
                        <div className="p-5 border-b border-white/5 flex items-center justify-between shrink-0 bg-white/[0.01]">
                            <div className="flex items-center gap-3">
                                <div className={`w-9 h-9 rounded-xl flex items-center justify-center border
                                    ${resolveCallType(selectedLog) === 'webCall'
                                        ? 'bg-purple-500/10 border-purple-500/20 text-purple-400'
                                        : 'bg-luxe-gold/10 border-luxe-gold/20 text-luxe-gold'}`}>
                                    {resolveCallType(selectedLog) === 'webCall' ? <MessageCircle className="w-4 h-4" /> : <Phone className="w-4 h-4" />}
                                </div>
                                <div>
                                    <h3 className="text-sm font-bold text-white flex items-center gap-2">
                                        {selectedLog.caller_phone || 'Unknown'}
                                        <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded ${statusStyle[getStatus(selectedLog)]}`}>
                                            {getStatus(selectedLog).toUpperCase()}
                                        </span>
                                    </h3>
                                    <p className="text-[10px] text-white/40 mt-0.5">
                                        {new Date(selectedLog.created_at).toLocaleString('en-US', { timeZone: timezone || 'America/New_York', dateStyle: 'medium', timeStyle: 'short' })}
                                    </p>
                                </div>
                            </div>
                            <button onClick={() => setSelectedLog(null)} className="p-2 hover:bg-white/5 rounded-xl border border-white/10 text-white/40 hover:text-white transition-all cursor-pointer">
                                <X className="w-4 h-4" />
                            </button>
                        </div>

                        {/* Modal Scrollable Body */}
                        <div className="flex-1 overflow-y-auto p-5 space-y-4 custom-scrollbar">
                            {/* Inline Audio Player */}
                            {selectedLog.recording_url && (
                                <div className="bg-white/[0.02] border border-white/5 rounded-xl p-4">
                                    <div className="flex items-center justify-between mb-2.5">
                                        <div className="flex items-center gap-2 text-luxe-gold">
                                            <Volume2 className="w-4 h-4" />
                                            <span className="text-[9px] font-bold uppercase tracking-widest">Recording</span>
                                        </div>
                                        {selectedLog.call_duration > 0 && (
                                            <span className="text-[10px] text-white/30 font-bold">{formatDuration(selectedLog.call_duration)}</span>
                                        )}
                                    </div>
                                    <audio
                                        key={selectedLog.conversation_id}
                                        ref={audioRef}
                                        controls
                                        src={selectedLog.recording_url}
                                        className="w-full h-8"
                                        onPlay={() => setIsPlaying(true)}
                                        onPause={() => setIsPlaying(false)}
                                        onEnded={() => setIsPlaying(false)}
                                        onError={() => { setIsPlaying(false); showToast('Recording not available', 'error'); }}
                                        preload="metadata"
                                    >
                                        Your browser does not support audio.
                                    </audio>
                                </div>
                            )}

                            {/* AI Summary */}
                            {selectedLog.transcript_summary && (
                                <div className="bg-luxe-gold/5 border border-luxe-gold/15 rounded-xl p-4">
                                    <div className="flex items-center gap-2 mb-2 text-luxe-gold">
                                        <CheckCircle2 className="w-4 h-4" />
                                        <span className="text-[9px] font-bold uppercase tracking-widest">AI Summary</span>
                                    </div>
                                    <p className="text-white/80 text-xs leading-relaxed">{selectedLog.transcript_summary}</p>
                                </div>
                            )}

                            {/* Action Taken */}
                            {selectedLog.action_taken && !['web_chat', 'inquiry'].includes(selectedLog.action_taken) && (
                                <div className="bg-white/[0.02] border border-white/5 rounded-xl p-4">
                                    <p className="text-[9px] text-white/35 uppercase font-bold tracking-wider mb-2">Action Taken</p>
                                    <div className="flex flex-wrap gap-1.5">
                                        {selectedLog.action_taken.split(',').map(a => a.trim()).filter(Boolean).map(a => (
                                            <span key={a} className="text-[10px] px-2.5 py-0.5 rounded bg-luxe-gold/10 text-luxe-gold border border-luxe-gold/20 font-bold">
                                                {a.replace(/_/g, ' ')}
                                            </span>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {/* Conversation Timeline */}
                            <div className="bg-white/[0.01] border border-white/5 rounded-xl p-4 flex flex-col">
                                <div className="flex items-center justify-between mb-4 pb-2 border-b border-white/5">
                                    <div className="flex items-center gap-2 text-luxe-gold">
                                        <MessageSquare className="w-4 h-4" />
                                        <span className="text-[9px] font-bold uppercase tracking-widest">Conversation Transcript</span>
                                    </div>
                                    {selectedLog.transcript && (
                                        <button onClick={() => setShowTranscript(true)} className="text-[10px] text-luxe-gold hover:underline font-bold cursor-pointer">
                                            Full Screen
                                        </button>
                                    )}
                                </div>

                                {selectedLog.transcript ? (
                                    <div className="space-y-3 max-h-[300px] overflow-y-auto pr-1 custom-scrollbar">
                                        {parseTranscript(selectedLog.transcript).map((msg) => {
                                            const isBella = msg.sender === 'bella' || msg.sender === 'agent' || msg.sender === 'ai';
                                            return (
                                                <div key={msg.id} className={`flex flex-col ${isBella ? 'items-start' : 'items-end'}`}>
                                                    <span className="text-[8px] text-white/30 font-bold uppercase tracking-wider mb-0.5 px-1">
                                                        {msg.senderName}
                                                    </span>
                                                    <div className={`max-w-[85%] rounded-2xl px-3.5 py-2 text-xs leading-relaxed ${
                                                        isBella
                                                            ? 'bg-luxe-gold/15 text-white border border-luxe-gold/25 rounded-tl-none'
                                                            : 'bg-white/5 text-white/90 border border-white/10 rounded-tr-none'
                                                    }`}>
                                                        {msg.message}
                                                    </div>
                                                </div>
                                            );
                                        })}
                                    </div>
                                ) : (
                                    <div className="flex items-center gap-2 text-white/30 py-4 text-xs italic justify-center">
                                        <AlertCircle className="w-4 h-4" />
                                        No transcript available
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Modal Bottom Info Panel */}
                        <div className="p-4 border-t border-white/5 bg-white/[0.01] grid grid-cols-2 gap-3 shrink-0">
                            <div className="bg-white/5 border border-white/10 rounded-xl p-2.5 flex items-center gap-2.5">
                                <Clock className="w-4 h-4 text-blue-400" />
                                <div>
                                    <p className="text-[8px] text-white/30 uppercase font-bold">Duration</p>
                                    <p className="text-xs font-bold text-white">{selectedLog.call_duration > 0 ? formatDuration(selectedLog.call_duration) : '—'}</p>
                                </div>
                            </div>
                            <div className="bg-white/5 border border-white/10 rounded-xl p-2.5 flex items-center gap-2.5">
                                <Wifi className="w-4 h-4 text-purple-400" />
                                <div>
                                    <p className="text-[8px] text-white/30 uppercase font-bold">Channel</p>
                                    <p className="text-xs font-bold text-white">
                                        {resolveCallType(selectedLog) === 'webCall' ? 'Web Chat' : 'Voice Call'}
                                    </p>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Full Transcript Modal */}
            {showTranscript && selectedLog?.transcript && (
                <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4"
                    onClick={() => setShowTranscript(false)}>
                    <div className="bg-luxe-obsidian border border-white/10 rounded-2xl p-7 w-full max-w-2xl shadow-2xl max-h-[80vh] flex flex-col"
                        onClick={e => e.stopPropagation()}>
                        <div className="flex justify-between items-center mb-5 shrink-0">
                            <h3 className="text-lg font-bold flex items-center gap-2">
                                <MessageSquare className="w-5 h-5 text-luxe-gold" /> Full Transcript
                            </h3>
                            <div className="flex items-center gap-3">
                                <span className="text-xs text-white/30">{selectedLog.caller_phone} • {new Date(selectedLog.created_at).toLocaleString('en-US', { timeZone: timezone || 'America/New_York', dateStyle: 'medium', timeStyle: 'short' })}</span>
                                <button onClick={() => setShowTranscript(false)} className="p-2 hover:bg-white/10 rounded-xl transition-all">
                                    <X className="w-5 h-5" />
                                </button>
                            </div>
                        </div>
                        <div className="flex-1 overflow-y-auto custom-scrollbar bg-white/[0.02] border border-white/5 rounded-2xl p-5">
                            <pre className="text-white/80 text-sm leading-relaxed whitespace-pre-wrap font-sans">
                                {selectedLog.transcript}
                            </pre>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};
