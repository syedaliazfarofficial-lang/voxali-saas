import React, { useState, useEffect, useMemo } from 'react';
import { supabase } from '../lib/supabase';
import { useTenant } from '../context/TenantContext';
import { 
    Star, MessageSquare, AlertCircle, 
    ThumbsUp, CalendarClock, Filter,
    CheckCircle2
} from 'lucide-react';
import { Loader2 } from 'lucide-react';

interface ReviewItem {
    id: string;
    source: 'public' | 'booking';
    clientName: string;
    rating: number;
    text: string | null;
    date: Date;
    serviceName?: string;
    isPublic?: boolean;
    bookingId?: string;
}

export const Reviews: React.FC = () => {
    const { tenantId } = useTenant();
    const [reviews, setReviews] = useState<ReviewItem[]>([]);
    const [loading, setLoading] = useState(true);
    const [filter, setFilter] = useState<'all' | 'positive' | 'needs_attention'>('all');

    useEffect(() => {
        const fetchReviews = async () => {
            if (!tenantId) return;
            setLoading(true);

            try {
                // 1. Fetch Booking Reviews
                const { data: bookingsData, error: err1 } = await supabase
                    .from('bookings')
                    .select(`
                        id, start_time, rating, review_text,
                        client:client_id(name),
                        service:service_id(name)
                    `)
                    .eq('tenant_id', tenantId)
                    .not('rating', 'is', null)
                    .order('start_time', { ascending: false });

                // 2. Fetch Public Reviews (salon_reviews)
                const { data: publicData, error: err2 } = await supabase
                    .from('salon_reviews')
                    .select('*')
                    .eq('tenant_id', tenantId)
                    .order('created_at', { ascending: false });

                if (err1) console.error("Error fetching booking reviews:", err1);
                if (err2) console.error("Error fetching public reviews:", err2);

                const merged: ReviewItem[] = [];

                if (bookingsData) {
                    bookingsData.forEach((b: any) => {
                        merged.push({
                            id: `booking-${b.id}`,
                            source: 'booking',
                            clientName: b.client?.name || 'Unknown Client',
                            rating: b.rating,
                            text: b.review_text,
                            date: new Date(b.start_time),
                            serviceName: b.service?.name || 'Unknown Service',
                            bookingId: b.id
                        });
                    });
                }

                if (publicData) {
                    publicData.forEach((r: any) => {
                        merged.push({
                            id: `public-${r.id}`,
                            source: 'public',
                            clientName: r.client_name,
                            rating: r.rating,
                            text: r.review_text,
                            date: new Date(r.created_at),
                            isPublic: r.is_public
                        });
                    });
                }

                // Sort purely by date descending
                merged.sort((a, b) => b.date.getTime() - a.date.getTime());
                setReviews(merged);
            } catch (err) {
                console.error("Failed to load reviews:", err);
            } finally {
                setLoading(false);
            }
        };

        fetchReviews();
    }, [tenantId]);

    const stats = useMemo(() => {
        if (reviews.length === 0) return { total: 0, average: 0, fiveStarPct: 0, needsAttention: 0 };
        const total = reviews.length;
        const avg = reviews.reduce((acc, r) => acc + r.rating, 0) / total;
        const fiveStars = reviews.filter(r => r.rating === 5).length;
        const needsAttention = reviews.filter(r => r.rating <= 3).length;
        return {
            total,
            average: avg.toFixed(1),
            fiveStarPct: Math.round((fiveStars / total) * 100),
            needsAttention
        };
    }, [reviews]);

    const filteredReviews = useMemo(() => {
        if (filter === 'positive') return reviews.filter(r => r.rating >= 4);
        if (filter === 'needs_attention') return reviews.filter(r => r.rating <= 3);
        return reviews;
    }, [reviews, filter]);

    const renderStars = (rating: number) => {
        return (
            <div className="flex items-center gap-1">
                {[1, 2, 3, 4, 5].map((star) => (
                    <Star 
                        key={star} 
                        className={`w-4 h-4 ${star <= rating ? 'fill-luxe-gold text-luxe-gold' : 'text-white/10'}`} 
                    />
                ))}
            </div>
        );
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center h-64">
                <Loader2 className="w-8 h-8 text-luxe-gold animate-spin" />
            </div>
        );
    }

    return (
        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
            {/* Header */}
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div className="flex items-center gap-3">
                    <div className="p-3 bg-luxe-gold/10 rounded-2xl border border-luxe-gold/20 flex-shrink-0">
                        <Star className="w-6 h-6 text-luxe-gold fill-luxe-gold" />
                    </div>
                    <div>
                        <h3 className="text-xl font-bold">Review Management</h3>
                        <p className="text-xs text-white/40 uppercase tracking-widest">Client Feedback & Ratings</p>
                    </div>
                </div>
            </div>

            {/* Stats Overview */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div className="glass-panel p-5 border border-white/5 relative overflow-hidden group">
                    <div className="absolute top-0 right-0 w-32 h-32 bg-luxe-gold/10 rounded-full blur-3xl group-hover:bg-luxe-gold/20 transition-all"></div>
                    <div className="flex justify-between items-start relative z-10">
                        <div>
                            <p className="text-xs font-bold text-white/50 uppercase tracking-wider mb-1">Avg Rating</p>
                            <h4 className="text-3xl font-black text-white">{stats.average}</h4>
                        </div>
                        <div className="p-2 bg-white/5 rounded-lg border border-white/10">
                            <Star className="w-5 h-5 text-luxe-gold fill-luxe-gold" />
                        </div>
                    </div>
                </div>

                <div className="glass-panel p-5 border border-white/5 relative overflow-hidden group">
                    <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-500/10 rounded-full blur-3xl group-hover:bg-emerald-500/20 transition-all"></div>
                    <div className="flex justify-between items-start relative z-10">
                        <div>
                            <p className="text-xs font-bold text-white/50 uppercase tracking-wider mb-1">Total Reviews</p>
                            <h4 className="text-3xl font-black text-white">{stats.total}</h4>
                        </div>
                        <div className="p-2 bg-white/5 rounded-lg border border-white/10">
                            <MessageSquare className="w-5 h-5 text-emerald-400" />
                        </div>
                    </div>
                </div>

                <div className="glass-panel p-5 border border-white/5 relative overflow-hidden group">
                    <div className="absolute top-0 right-0 w-32 h-32 bg-blue-500/10 rounded-full blur-3xl group-hover:bg-blue-500/20 transition-all"></div>
                    <div className="flex justify-between items-start relative z-10">
                        <div>
                            <p className="text-xs font-bold text-white/50 uppercase tracking-wider mb-1">5-Star Rating</p>
                            <h4 className="text-3xl font-black text-white">{stats.fiveStarPct}%</h4>
                        </div>
                        <div className="p-2 bg-white/5 rounded-lg border border-white/10">
                            <ThumbsUp className="w-5 h-5 text-blue-400" />
                        </div>
                    </div>
                </div>

                <div className="glass-panel p-5 border border-white/5 relative overflow-hidden group">
                    <div className="absolute top-0 right-0 w-32 h-32 bg-red-500/10 rounded-full blur-3xl group-hover:bg-red-500/20 transition-all"></div>
                    <div className="flex justify-between items-start relative z-10">
                        <div>
                            <p className="text-xs font-bold text-white/50 uppercase tracking-wider mb-1">Needs Attention</p>
                            <h4 className="text-3xl font-black text-red-400">{stats.needsAttention}</h4>
                        </div>
                        <div className="p-2 bg-red-500/10 rounded-lg border border-red-500/20">
                            <AlertCircle className="w-5 h-5 text-red-400" />
                        </div>
                    </div>
                </div>
            </div>

            {/* Filter & List */}
            <div className="glass-panel overflow-hidden border border-white/5 flex flex-col">
                {/* Toolbar */}
                <div className="p-4 border-b border-white/5 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white/[0.02]">
                    <div className="flex items-center gap-2">
                        <Filter className="w-4 h-4 text-white/40" />
                        <span className="text-sm font-bold text-white/60">Filter by:</span>
                    </div>
                    <div className="flex bg-black/40 p-1 rounded-xl border border-white/5">
                        <button 
                            onClick={() => setFilter('all')}
                            className={`px-4 py-1.5 text-xs font-bold rounded-lg transition-all ${filter === 'all' ? 'bg-white/10 text-white shadow-sm' : 'text-white/40 hover:text-white/80'}`}
                        >
                            All
                        </button>
                        <button 
                            onClick={() => setFilter('positive')}
                            className={`px-4 py-1.5 text-xs font-bold rounded-lg transition-all ${filter === 'positive' ? 'bg-emerald-500/20 text-emerald-400 shadow-sm' : 'text-white/40 hover:text-white/80'}`}
                        >
                            Positive (4-5 ★)
                        </button>
                        <button 
                            onClick={() => setFilter('needs_attention')}
                            className={`px-4 py-1.5 text-xs font-bold rounded-lg transition-all ${filter === 'needs_attention' ? 'bg-red-500/20 text-red-400 shadow-sm' : 'text-white/40 hover:text-white/80'}`}
                        >
                            Needs Attention (1-3 ★)
                        </button>
                    </div>
                </div>

                {/* Reviews List */}
                <div className="divide-y divide-white/5">
                    {filteredReviews.length === 0 ? (
                        <div className="p-12 text-center flex flex-col items-center">
                            <MessageSquare className="w-12 h-12 text-white/5 mb-4" />
                            <p className="font-bold text-white/40">No reviews found.</p>
                        </div>
                    ) : (
                        filteredReviews.map((r) => (
                            <div key={r.id} className="p-5 hover:bg-white/[0.02] transition-colors group flex gap-4">
                                {/* Rating Badge */}
                                <div className="flex-shrink-0 pt-1">
                                    <div className={`flex flex-col items-center justify-center w-12 h-12 rounded-2xl border ${
                                        r.rating >= 4 ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400' :
                                        r.rating === 3 ? 'bg-yellow-500/10 border-yellow-500/20 text-yellow-400' :
                                        'bg-red-500/10 border-red-500/20 text-red-400'
                                    }`}>
                                        <span className="text-xl font-black">{r.rating}</span>
                                    </div>
                                </div>
                                
                                {/* Content */}
                                <div className="flex-1 min-w-0">
                                    <div className="flex flex-col sm:flex-row justify-between items-start gap-2 mb-2">
                                        <div>
                                            <div className="flex items-center gap-3">
                                                <h4 className="font-bold text-white tracking-wide truncate">{r.clientName}</h4>
                                                {r.source === 'booking' ? (
                                                    <span className="text-[10px] font-bold uppercase tracking-widest px-2 py-0.5 rounded-md bg-blue-500/10 text-blue-400 border border-blue-500/20 flex items-center gap-1">
                                                        <CheckCircle2 className="w-3 h-3" /> Verified Client
                                                    </span>
                                                ) : (
                                                    <span className="text-[10px] font-bold uppercase tracking-widest px-2 py-0.5 rounded-md bg-white/5 text-white/40 border border-white/10 flex items-center gap-1">
                                                        Public Link
                                                    </span>
                                                )}
                                            </div>
                                            {r.source === 'booking' && r.serviceName && (
                                                <p className="text-xs text-white/50 flex items-center gap-1 mt-1">
                                                    <CalendarClock className="w-3 h-3 text-white/30" /> 
                                                    {r.serviceName}
                                                </p>
                                            )}
                                        </div>
                                        <div className="text-right flex-shrink-0">
                                            {renderStars(r.rating)}
                                            <p className="text-[10px] text-white/30 uppercase tracking-widest mt-1">
                                                {r.date.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}
                                            </p>
                                        </div>
                                    </div>
                                    
                                    {r.text ? (
                                        <p className="text-sm text-white/70 leading-relaxed bg-black/20 p-4 rounded-xl border border-white/5 mt-3">
                                            "{r.text}"
                                        </p>
                                    ) : (
                                        <p className="text-xs text-white/30 italic mt-2">No written feedback provided.</p>
                                    )}

                                    {/* Action buttons could go here (e.g. "Reply publicly", "Contact Client") */}
                                </div>
                            </div>
                        ))
                    )}
                </div>
            </div>
        </div>
    );
};
