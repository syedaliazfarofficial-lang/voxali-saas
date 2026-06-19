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
            if (filtered.length > 0 && !selectedLog) setSelectedLog(filtered[0]);
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
                        prev ? filtered.find(l => l.conversation_id === prev.conversation_id) || filtered[0] : filtered[0]
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

    return (
        <div className="h-full flex flex-col space-y-6 animate-in fade-in duration-500 overflow-hidden">
            {/* Header */}
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 border-b border-white/5 pb-4 mb-4">
                <div className="flex items-center gap-2.5 flex-shrink-0">
                    <div className="p-2 bg-luxe-gold/10 rounded-xl border border-luxe-gold/20">
                        <PhoneCall className="w-5 h-5 text-luxe-gold" />
                    </div>
                    <div>
                        <h3 className="text-base font-bold whitespace-nowrap text-white">Bella Call Logs</h3>
                        <p className="text-[9px] text-white/40 uppercase tracking-widest whitespace-nowrap">Live Voice + Chat Activity</p>
                    </div>
                </div>
                <div className="flex items-center gap-3 flex-wrap">
                    <div className="flex items-center gap-2 bg-white/5 border border-white/10 rounded-xl px-3 py-1.5">
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
                        <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-white/30" />
                        <input type="text" placeholder="Search logs..." value={search}
                            onChange={e => setSearch(e.target.value)}
                            className="bg-white/5 border border-white/10 rounded-xl pl-10 pr-4 py-2 text-xs outline-none focus:border-luxe-gold/50 w-48" />
                    </div>
                    <button onClick={() => syncFromVapi(true)} disabled={syncing}
                        className="bg-gold-gradient text-luxe-obsidian px-5 py-2 rounded-xl font-bold flex items-center gap-2 shadow-lg shadow-luxe-gold/20 hover:scale-[1.02] active:scale-[0.98] transition-all disabled:opacity-60">
                        {syncing ? <><Loader2 className="w-4 h-4 animate-spin" /> Syncing...</> : <><RefreshCw className="w-4 h-4" /> Refresh</>}
                    </button>
                </div>
            </div>

            <div className="flex-1 grid grid-cols-1 lg:grid-cols-3 gap-6 overflow-hidden">
                {/* Left: Logs List */}
                <div className="lg:col-span-1 glass-panel flex flex-col overflow-hidden border border-white/5">
                    <div className="p-4 border-b border-white/5 bg-white/5 flex items-center justify-between shrink-0">
                        <span className="text-[10px] font-black uppercase tracking-[0.2em] text-white/30">Recent Conversations</span>
                        <span className="text-[10px] bg-luxe-gold/20 text-luxe-gold px-2 py-0.5 rounded-full font-bold">{filtered.length} CALLS</span>
                    </div>
                    <div className="flex-1 overflow-y-auto custom-scrollbar">
                        {loading ? (
                            [1,2,3,4,5].map(i => (
                                <div key={i} className="p-5 border-b border-white/5">
                                    <div className="flex justify-between mb-2"><Skeleton variant="text" width="55%" /><Skeleton variant="text" width={40} height={10} /></div>
                                    <Skeleton variant="text" width="80%" height={10} />
                                    <div className="flex gap-2 mt-3"><Skeleton variant="rect" width={50} height={16} /><Skeleton variant="rect" width={50} height={16} /></div>
                                </div>
                            ))
                        ) : filtered.length === 0 ? (
                            <div className="p-8 text-center">
                                <Bot className="w-10 h-10 text-white/10 mx-auto mb-3" />
                                <p className="text-white/30 text-sm">No call logs found</p>
                                <p className="text-white/20 text-xs mt-1">{dateFrom || dateTo ? 'Try clearing date filter' : 'Click Refresh to sync from Vapi'}</p>
                            </div>
                        ) : filtered.map(log => {
                            const status = getStatus(log);
                            const ct = resolveCallType(log);
                            return (
                                <button
                                    key={log.conversation_id}
                                    onClick={() => { setSelectedLog(log); setShowTranscript(false); setShowPlayer(false); setIsPlaying(false); }}
                                    className={`w-full p-4 text-left border-b border-white/5 transition-all hover:bg-white/[0.04] group relative
                                        ${selectedLog?.conversation_id === log.conversation_id ? 'bg-white/[0.06]' : ''}`}
                                >
                                    <div className="flex justify-between items-start mb-1">
                                        <h4 className={`font-bold text-sm flex items-center gap-1.5 ${selectedLog?.conversation_id === log.conversation_id ? 'text-luxe-gold' : ''}`}>
                                            {ct === 'webCall' ? <MessageCircle className="w-3.5 h-3.5 shrink-0" /> : <Phone className="w-3.5 h-3.5 shrink-0" />}
                                            <span className="truncate max-w-[140px]">{log.caller_phone || 'Unknown'}</span>
                                        </h4>
                                        <span className="text-[10px] text-white/30 shrink-0">{formatTime(log.created_at)}</span>
                                    </div>
                                    <p className="text-[11px] text-white/40 truncate">
                                        {log.transcript_summary || log.transcript?.substring(0, 70) || log.action_taken || 'No details'}
                                    </p>
                                    <div className="flex items-center gap-2 mt-2 flex-wrap">
                                        <span className={`text-[9px] font-bold px-2 py-0.5 rounded ${statusStyle[status]}`}>{status.toUpperCase()}</span>
                                        {log.call_duration > 0 && (
                                            <span className="text-[9px] text-white/25 flex items-center gap-1">
                                                <Clock className="w-2.5 h-2.5" /> {formatDuration(log.call_duration)}
                                            </span>
                                        )}
                                        {log.recording_url && (
                                            <span className="text-[9px] text-luxe-gold/50 flex items-center gap-1">
                                                <Volume2 className="w-2.5 h-2.5" /> REC
                                            </span>
                                        )}
                                    </div>
                                    {selectedLog?.conversation_id === log.conversation_id && (
                                        <div className="absolute left-0 top-0 bottom-0 w-0.5 bg-luxe-gold shadow-[0_0_8px_#D4AF37]" />
                                    )}
                                </button>
                            );
                        })}
                    </div>
                </div>

                {/* Right: Detail Panel */}
                <div className="lg:col-span-2 flex flex-col gap-5 overflow-y-auto custom-scrollbar">
                    {selectedLog ? (
                        <>
                            <div className="glass-panel p-6 flex flex-col relative overflow-hidden shrink-0">
                                {/* Header row */}
                                <div className="flex justify-between items-start mb-5 relative z-10">
                                    <div className="flex items-center gap-4">
                                        <div className={`w-14 h-14 rounded-2xl flex items-center justify-center shadow-lg shrink-0
                                            ${resolveCallType(selectedLog) === 'webCall'
                                                ? 'bg-purple-500/20 border border-purple-500/30'
                                                : 'bg-gold-gradient'}`}>
                                            {resolveCallType(selectedLog) === 'webCall'
                                                ? <MessageCircle className="w-7 h-7 text-purple-400" />
                                                : <Bot className="w-7 h-7 text-luxe-obsidian" />}
                                        </div>
                                        <div>
                                            <div className="flex items-center gap-2 mb-1 flex-wrap">
                                                <h2 className="text-lg font-black">{selectedLog.caller_phone || 'Unknown'}</h2>
                                                <span className={`text-[9px] font-bold px-2 py-0.5 rounded ${statusStyle[getStatus(selectedLog)]}`}>
                                                    {getStatus(selectedLog).toUpperCase()}
                                                </span>
                                            </div>
                                            <p className="text-white/40 text-xs flex items-center gap-2">
                                                <Calendar className="w-3.5 h-3.5" />
                                                {new Date(selectedLog.created_at).toLocaleString('en-US', { timeZone: timezone || 'America/New_York', dateStyle: 'medium', timeStyle: 'short' })}
                                                {selectedLog.call_duration > 0 && ` • ${formatDuration(selectedLog.call_duration)} min`}
                                            </p>
                                        </div>
                                    </div>
                                    {/* Buttons */}
                                    <div className="flex items-center gap-2 shrink-0">
                                        {selectedLog.recording_url && (
                                            <button
                                                onClick={() => { setShowPlayer(p => !p); setIsPlaying(false); }}
                                                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl border text-xs font-bold transition-all
                                                    ${showPlayer ? 'bg-green-500/20 text-green-300 border-green-500/40' : 'bg-green-500/10 text-green-400 border-green-500/20 hover:bg-green-500/20'}`}
                                            >
                                                <Play className="w-3.5 h-3.5" />
                                                {showPlayer ? 'Hide Player' : 'Play Recording'}
                                            </button>
                                        )}
                                        {selectedLog.transcript && (
                                            <button onClick={() => setShowTranscript(true)}
                                                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-blue-500/10 text-blue-400 border border-blue-500/20 text-xs font-bold hover:bg-blue-500/20 transition-all">
                                                <FileText className="w-3.5 h-3.5" /> Full Transcript
                                            </button>
                                        )}
                                    </div>
                                </div>

                                {/* ✅ Inline Audio Player — key forces remount on log change */}
                                {showPlayer && selectedLog.recording_url && (
                                    <div className="mb-5 bg-black/50 border border-green-500/20 rounded-2xl p-4 relative z-10">
                                        <div className="flex items-center justify-between mb-3">
                                            <div className="flex items-center gap-2">
                                                <Volume2 className="w-4 h-4 text-green-400" />
                                                <span className="text-[10px] font-black uppercase tracking-widest text-green-400">Call Recording</span>
                                            </div>
                                            {selectedLog.call_duration > 0 && (
                                                <span className="text-xs text-white/30">{formatDuration(selectedLog.call_duration)}</span>
                                            )}
                                        </div>
                                        {/* ✅ key prop forces audio element to remount when log changes */}
                                        <audio
                                            key={selectedLog.conversation_id}
                                            ref={audioRef}
                                            controls
                                            src={selectedLog.recording_url}
                                            className="w-full"
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
                                    <div className="bg-luxe-gold/5 border border-luxe-gold/15 rounded-2xl p-4 mb-4 relative z-10">
                                        <div className="flex items-center gap-2 mb-2 text-luxe-gold">
                                            <CheckCircle2 className="w-4 h-4" />
                                            <span className="text-[10px] font-black uppercase tracking-widest">AI Summary</span>
                                        </div>
                                        <p className="text-white/80 text-sm leading-relaxed">{selectedLog.transcript_summary}</p>
                                    </div>
                                )}

                                {/* Action Taken */}
                                {selectedLog.action_taken && !['web_chat', 'inquiry'].includes(selectedLog.action_taken) && (
                                    <div className="bg-white/[0.03] border border-white/8 rounded-2xl p-4 mb-4 relative z-10">
                                        <p className="text-[10px] text-white/30 uppercase font-bold mb-1">Action Taken</p>
                                        <div className="flex flex-wrap gap-1.5">
                                            {selectedLog.action_taken.split(',').map(a => a.trim()).filter(Boolean).map(a => (
                                                <span key={a} className="text-xs px-2 py-0.5 rounded bg-luxe-gold/10 text-luxe-gold border border-luxe-gold/20">
                                                    {a.replace(/_/g, ' ')}
                                                </span>
                                            ))}
                                        </div>
                                    </div>
                                )}

                                {/* ✅ Transcript Preview — no system prompt */}
                                {selectedLog.transcript ? (
                                    <div className="bg-white/[0.02] border border-white/5 rounded-2xl p-4 relative z-10">
                                        <div className="flex items-center gap-2 mb-3 text-luxe-gold">
                                            <MessageSquare className="w-4 h-4" />
                                            <span className="text-[10px] font-black uppercase tracking-widest">Conversation Preview</span>
                                        </div>
                                        <pre className="text-white/60 text-xs leading-relaxed whitespace-pre-wrap line-clamp-8 font-sans">
                                            {selectedLog.transcript}
                                        </pre>
                                        {selectedLog.transcript.length > 400 && (
                                            <button onClick={() => setShowTranscript(true)}
                                                className="mt-2 text-luxe-gold text-xs font-bold hover:underline">
                                                Read full transcript →
                                            </button>
                                        )}
                                    </div>
                                ) : (
                                    <div className="bg-white/[0.02] border border-white/5 rounded-2xl p-4 relative z-10 flex items-center gap-3 text-white/30">
                                        <AlertCircle className="w-4 h-4" />
                                        <span className="text-sm">No transcript available for this call</span>
                                    </div>
                                )}
                            </div>

                            {/* ✅ Bottom 4 Info Cards */}
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 shrink-0">
                                {/* Status */}
                                <div className="glass-panel p-4 flex items-center gap-3 hover:gold-border transition-all">
                                    <div className="w-9 h-9 rounded-xl bg-green-500/10 flex items-center justify-center shrink-0">
                                        <CheckCircle2 className="w-5 h-5 text-green-400" />
                                    </div>
                                    <div className="min-w-0">
                                        <p className="text-[9px] text-white/30 uppercase font-bold">Status</p>
                                        <p className="text-sm font-bold truncate">{getStatus(selectedLog)}</p>
                                    </div>
                                </div>
                                {/* Duration */}
                                <div className="glass-panel p-4 flex items-center gap-3 hover:gold-border transition-all">
                                    <div className="w-9 h-9 rounded-xl bg-blue-500/10 flex items-center justify-center shrink-0">
                                        <Clock className="w-5 h-5 text-blue-400" />
                                    </div>
                                    <div className="min-w-0">
                                        <p className="text-[9px] text-white/30 uppercase font-bold">Duration</p>
                                        <p className="text-sm font-bold">
                                            {selectedLog.call_duration > 0
                                                ? formatDuration(selectedLog.call_duration)
                                                : '< 1 sec'}
                                        </p>
                                    </div>
                                </div>
                                {/* Type */}
                                <div className="glass-panel p-4 flex items-center gap-3 hover:gold-border transition-all">
                                    <div className="w-9 h-9 rounded-xl bg-purple-500/10 flex items-center justify-center shrink-0">
                                        <Wifi className="w-5 h-5 text-purple-400" />
                                    </div>
                                    <div className="min-w-0">
                                        <p className="text-[9px] text-white/30 uppercase font-bold">Type</p>
                                        <p className="text-sm font-bold truncate">
                                            {resolveCallType(selectedLog) === 'webCall' ? 'Web Chat'
                                                : resolveCallType(selectedLog) === 'outboundPhoneCall' ? 'Outbound'
                                                : 'Phone Call'}
                                        </p>
                                    </div>
                                </div>
                                {/* Recording */}
                                <div className="glass-panel p-4 flex items-center gap-3 hover:gold-border transition-all">
                                    <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${selectedLog.recording_url ? 'bg-luxe-gold/10' : 'bg-white/5'}`}>
                                        <Volume2 className={`w-5 h-5 ${selectedLog.recording_url ? 'text-luxe-gold' : 'text-white/20'}`} />
                                    </div>
                                    <div className="min-w-0">
                                        <p className="text-[9px] text-white/30 uppercase font-bold">Recording</p>
                                        <p className={`text-sm font-bold ${selectedLog.recording_url ? 'text-luxe-gold' : 'text-white/30'}`}>
                                            {selectedLog.recording_url ? 'Available' : 'None'}
                                        </p>
                                    </div>
                                </div>
                            </div>
                        </>
                    ) : (
                        <div className="glass-panel flex-1 flex flex-col items-center justify-center text-center p-20 min-h-[400px]">
                            <Bot className="w-16 h-16 text-white/5 mb-6 animate-pulse" />
                            <h3 className="text-xl font-bold">No call logs yet</h3>
                            <p className="text-white/30 mt-2">Click Refresh to fetch Bella's conversations</p>
                            <button onClick={() => syncFromVapi(true)} disabled={syncing}
                                className="mt-6 bg-gold-gradient text-luxe-obsidian px-6 py-2 rounded-xl font-bold flex items-center gap-2 mx-auto">
                                {syncing ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
                                Sync Now
                            </button>
                        </div>
                    )}
                </div>
            </div>

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
