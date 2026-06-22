import React, { useState, useEffect, useMemo } from 'react';
import { supabase } from '../lib/supabase';
import { useTenant } from '../context/TenantContext';
import { 
    Star, MessageSquare, AlertCircle, 
    ThumbsUp, CalendarClock, CheckCircle2, Share2, Search, ArrowUpDown
} from 'lucide-react';
import { showToast } from './ui/ToastNotification';
import { Skeleton } from './ui/Skeleton';

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
    const [searchQuery, setSearchQuery] = useState('');
    const [sortBy, setSortBy] = useState<'newest' | 'highest' | 'lowest'>('newest');

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

    const processedReviews = useMemo(() => {
        let list = [...reviews];
        
        // 1. Filter
        if (filter === 'positive') list = list.filter(r => r.rating >= 4);
        else if (filter === 'needs_attention') list = list.filter(r => r.rating <= 3);

        // 2. Search
        if (searchQuery.trim()) {
            const query = searchQuery.toLowerCase().trim();
            list = list.filter(r => 
                r.clientName.toLowerCase().includes(query) || 
                (r.text && r.text.toLowerCase().includes(query)) ||
                (r.serviceName && r.serviceName.toLowerCase().includes(query))
            );
        }

        // 3. Sort
        if (sortBy === 'highest') {
            list.sort((a, b) => b.rating - a.rating || b.date.getTime() - a.date.getTime());
        } else if (sortBy === 'lowest') {
            list.sort((a, b) => a.rating - b.rating || b.date.getTime() - a.date.getTime());
        } else {
            list.sort((a, b) => b.date.getTime() - a.date.getTime());
        }

        return list;
    }, [reviews, filter, searchQuery, sortBy]);

    const copyShareLink = () => {
        const reviewUrl = `${window.location.origin}/app/?salon_review=${tenantId}`;
        navigator.clipboard.writeText(reviewUrl);
        showToast('Review invite link copied to clipboard! 🚀');
    };

    const renderStars = (rating: number, sizeClass = "w-3.5 h-3.5") => {
        return (
            <div className="flex items-center gap-0.5">
                {[1, 2, 3, 4, 5].map((star) => (
                    <Star 
                        key={star} 
                        className={`${sizeClass} ${star <= rating ? 'fill-luxe-gold text-luxe-gold' : 'text-white/10'}`} 
                    />
                ))}
            </div>
        );
    };

    return (
        <div className="space-y-5 animate-in fade-in slide-in-from-bottom-4 duration-500 pb-10">
            {/* Header */}
            <div className="flex items-center justify-between gap-4 border-b border-white/5 pb-3 mb-2">
                <div className="flex items-center gap-2.5 flex-shrink-0">
                    <div className="p-2 bg-luxe-gold/10 rounded-xl border border-luxe-gold/20">
                        <Star className="w-5 h-5 text-luxe-gold fill-luxe-gold" />
                    </div>
                    <div>
                        <h3 className="text-base font-bold whitespace-nowrap text-white">Review Management</h3>
                        <p className="text-[9px] text-white/40 uppercase tracking-widest whitespace-nowrap">Client Feedback & Ratings</p>
                    </div>
                </div>

                <button
                    onClick={copyShareLink}
                    className="flex items-center gap-1.5 bg-white/5 border border-white/10 hover:border-luxe-gold/30 hover:bg-luxe-gold/10 text-white px-3.5 py-1.5 rounded-full text-xs font-bold transition-all active:scale-[0.98] cursor-pointer"
                >
                    <Share2 className="w-3.5 h-3.5 text-luxe-gold" />
                    SHARE REVIEW LINK
                </button>
            </div>

            {/* Symmetrical 4-Card Overview Row */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                {loading ? (
                    [1,2,3,4].map(i => (
                        <div key={i} className="glass-panel p-4.5 border border-white/5">
                            <Skeleton variant="text" width="60%" height={10} className="mb-2" />
                            <Skeleton variant="text" width="40%" height={28} />
                        </div>
                    ))
                ) : (
                    <>
                        <div className="glass-panel p-4.5 border border-white/5 flex justify-between items-center group relative overflow-hidden">
                            <div className="absolute top-0 right-0 w-24 h-24 bg-luxe-gold/5 rounded-full blur-2xl"></div>
                            <div>
                                <p className="text-[9px] font-bold text-white/30 uppercase tracking-wider mb-1">Avg Rating</p>
                                <h4 className="text-2xl font-black text-white">{stats.average}</h4>
                            </div>
                            <div className="p-2 bg-white/5 rounded-lg border border-white/10 text-luxe-gold">
                                <Star className="w-4 h-4 fill-luxe-gold" />
                            </div>
                        </div>

                        <div className="glass-panel p-4.5 border border-white/5 flex justify-between items-center group relative overflow-hidden">
                            <div className="absolute top-0 right-0 w-24 h-24 bg-emerald-500/5 rounded-full blur-2xl"></div>
                            <div>
                                <p className="text-[9px] font-bold text-white/30 uppercase tracking-wider mb-1">Total Reviews</p>
                                <h4 className="text-2xl font-black text-white">{stats.total}</h4>
                            </div>
                            <div className="p-2 bg-white/5 rounded-lg border border-white/10 text-emerald-400">
                                <MessageSquare className="w-4 h-4" />
                            </div>
                        </div>

                        <div className="glass-panel p-4.5 border border-white/5 flex justify-between items-center group relative overflow-hidden">
                            <div className="absolute top-0 right-0 w-24 h-24 bg-blue-500/5 rounded-full blur-2xl"></div>
                            <div>
                                <p className="text-[9px] font-bold text-white/30 uppercase tracking-wider mb-1">5-Star Ratio</p>
                                <h4 className="text-2xl font-black text-white">{stats.fiveStarPct}%</h4>
                            </div>
                            <div className="p-2 bg-white/5 rounded-lg border border-white/10 text-blue-400">
                                <ThumbsUp className="w-4 h-4" />
                            </div>
                        </div>

                        <div className="glass-panel p-4.5 border border-white/5 flex justify-between items-center group relative overflow-hidden">
                            <div className="absolute top-0 right-0 w-24 h-24 bg-red-500/5 rounded-full blur-2xl"></div>
                            <div>
                                <p className="text-[9px] font-bold text-white/30 uppercase tracking-wider mb-1">Needs Attention</p>
                                <h4 className={`text-2xl font-black ${stats.needsAttention > 0 ? 'text-red-400' : 'text-white'}`}>{stats.needsAttention}</h4>
                            </div>
                            <div className={`p-2 rounded-lg border ${stats.needsAttention > 0 ? 'bg-red-500/10 border-red-500/20 text-red-400' : 'bg-white/5 border-white/10 text-white/30'}`}>
                                <AlertCircle className="w-4 h-4" />
                            </div>
                        </div>
                    </>
                )}
            </div>

            {/* Cohesive Controls Toolbar */}
            <div className="glass-panel p-3 border border-white/5 flex flex-col md:flex-row items-center justify-between gap-3 bg-white/[0.01]">
                {/* Filter tabs */}
                <div className="flex bg-black/45 p-1 rounded-xl border border-white/5 w-full md:w-auto overflow-x-auto custom-scrollbar">
                    <button 
                        onClick={() => setFilter('all')}
                        className={`px-4.5 py-1.5 text-[10px] font-black uppercase tracking-wider rounded-lg transition-all cursor-pointer ${filter === 'all' ? 'bg-white/10 text-white shadow-sm' : 'text-white/40 hover:text-white/70'}`}
                    >
                        All
                    </button>
                    <button 
                        onClick={() => setFilter('positive')}
                        className={`px-4.5 py-1.5 text-[10px] font-black uppercase tracking-wider rounded-lg transition-all cursor-pointer ${filter === 'positive' ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/15' : 'text-white/40 hover:text-white/70'}`}
                    >
                        Positive (4-5 ★)
                    </button>
                    <button 
                        onClick={() => setFilter('needs_attention')}
                        className={`px-4.5 py-1.5 text-[10px] font-black uppercase tracking-wider rounded-lg transition-all cursor-pointer ${filter === 'needs_attention' ? 'bg-red-500/10 text-red-400 border border-red-500/15' : 'text-white/40 hover:text-white/70'}`}
                    >
                        Needs Attention (1-3 ★)
                    </button>
                </div>

                {/* Search & Sort */}
                <div className="flex flex-col sm:flex-row items-center gap-2.5 w-full md:w-auto">
                    <div className="relative w-full sm:w-56">
                        <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-white/30" />
                        <input
                            type="text"
                            placeholder="Search reviews..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="w-full bg-white/5 border border-white/10 rounded-xl pl-9 pr-4 py-1.5 text-xs outline-none focus:border-white/20 transition-all text-white placeholder-white/30"
                        />
                    </div>

                    <div className="relative w-full sm:w-40">
                        <ArrowUpDown className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-white/30 pointer-events-none" />
                        <select
                            aria-label="Sort reviews"
                            value={sortBy}
                            onChange={(e) => setSortBy(e.target.value as any)}
                            className="w-full bg-white/5 border border-white/10 rounded-xl pl-9 pr-4 py-2 text-xs outline-none focus:border-white/20 text-white/75 cursor-pointer appearance-none"
                        >
                            <option value="newest" className="bg-luxe-obsidian text-white">Newest First</option>
                            <option value="highest" className="bg-luxe-obsidian text-white">Highest Rated</option>
                            <option value="lowest" className="bg-luxe-obsidian text-white">Lowest Rated</option>
                        </select>
                    </div>
                </div>
            </div>

            {/* Full-width List of Review Items */}
            <div className="space-y-3.5">
                {loading ? (
                    [1,2,3].map(i => (
                        <div key={i} className="glass-panel p-5 flex gap-4 border border-white/5">
                            <Skeleton variant="rect" width={36} height={36} className="rounded-xl flex-shrink-0" />
                            <div className="flex-1 space-y-2">
                                <Skeleton variant="text" width="20%" />
                                <Skeleton variant="text" width="60%" />
                            </div>
                        </div>
                    ))
                ) : processedReviews.length === 0 ? (
                    <div className="glass-panel p-16 flex flex-col items-center justify-center text-center">
                        <MessageSquare className="w-12 h-12 text-white/10 mb-4" />
                        <h4 className="font-bold text-base text-white/40">No reviews found</h4>
                        <p className="text-white/25 text-xs mt-1">Try resetting the filters or search query</p>
                    </div>
                ) : (
                    processedReviews.map((r) => (
                        <div 
                            key={r.id} 
                            className="glass-panel p-4.5 flex gap-4 border border-white/5 hover:border-luxe-gold/25 transition-all duration-300 group"
                        >
                            {/* Rating Circle Badge */}
                            <div className="flex-shrink-0">
                                <div className={`w-10 h-10 rounded-xl border flex items-center justify-center font-bold text-sm ${
                                    r.rating >= 4 ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400' :
                                    r.rating === 3 ? 'bg-yellow-500/10 border-yellow-500/20 text-yellow-400' :
                                    'bg-red-500/10 border-red-500/20 text-red-400'
                                }`}>
                                    {r.rating}
                                </div>
                            </div>

                            {/* Review Content */}
                            <div className="flex-1 min-w-0">
                                {/* Top Line: Client Info, Tags, Stars and Date */}
                                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1.5 mb-2.5">
                                    <div className="flex items-center gap-2 flex-wrap">
                                        <h4 className="font-bold text-white text-xs tracking-wide">{r.clientName}</h4>
                                        
                                        {r.source === 'booking' ? (
                                            <span className="text-[8px] font-black uppercase tracking-[0.15em] px-2 py-0.5 rounded bg-blue-500/10 text-blue-400 border border-blue-500/20 flex items-center gap-0.5">
                                                <CheckCircle2 className="w-2.5 h-2.5" /> Verified Client
                                            </span>
                                        ) : (
                                            <span className="text-[8px] font-black uppercase tracking-[0.15em] px-2 py-0.5 rounded bg-white/5 text-white/35 border border-white/10 flex items-center gap-0.5">
                                                Public Link
                                            </span>
                                        )}

                                        {r.source === 'booking' && r.serviceName && (
                                            <span className="text-[8px] font-black uppercase tracking-[0.15em] px-2 py-0.5 rounded bg-luxe-gold/5 border border-luxe-gold/15 text-luxe-gold flex items-center gap-1">
                                                <CalendarClock className="w-2.5 h-2.5" /> {r.serviceName}
                                            </span>
                                        )}
                                    </div>

                                    <div className="flex items-center gap-2.5 shrink-0">
                                        {renderStars(r.rating, "w-3 h-3")}
                                        <span className="text-[9px] text-white/35 uppercase tracking-widest font-semibold">
                                            {r.date.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}
                                        </span>
                                    </div>
                                </div>

                                {/* Review Text Area */}
                                {r.text ? (
                                    <div className="bg-black/20 p-3.5 rounded-xl border border-white/5 mt-2">
                                        <p className="text-xs text-white/70 leading-relaxed italic">
                                            "{r.text}"
                                        </p>
                                    </div>
                                ) : (
                                    <p className="text-[10px] text-white/30 italic mt-1">No written feedback provided.</p>
                                )}
                            </div>
                        </div>
                    ))
                )}
            </div>
        </div>
    );
};
