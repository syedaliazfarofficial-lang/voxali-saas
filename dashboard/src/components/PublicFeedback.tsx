import React, { useState, useEffect } from 'react';
import { Star, MessageSquare, CheckCircle, Loader2 } from 'lucide-react';
import { supabase } from '../lib/supabase';

interface Props {
    tenantId: string;
}

export const PublicFeedback: React.FC<Props> = ({ tenantId }) => {
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [success, setSuccess] = useState(false);
    
    const [tenant, setTenant] = useState<any>(null);
    const [clientName, setClientName] = useState('');
    const [rating, setRating] = useState<number>(0);
    const [hoverRating, setHoverRating] = useState<number>(0);
    const [reviewText, setReviewText] = useState('');
    const [error, setError] = useState('');

    useEffect(() => {
        const fetchTenant = async () => {
            if (!tenantId) {
                setError('Invalid link. Salon not found.');
                setLoading(false);
                return;
            }

            const { data, error } = await supabase
                .from('tenants')
                .select('salon_name, logo_url')
                .eq('id', tenantId)
                .single();

            if (error || !data) {
                setError('Salon not found.');
            } else {
                setTenant(data);
            }
            setLoading(false);
        };

        fetchTenant();
    }, [tenantId]);

    const submitFeedback = async () => {
        if (!clientName.trim()) {
            setError('Please enter your name.');
            return;
        }
        if (rating < 1) {
            setError('Please select a rating.');
            return;
        }

        setSaving(true);
        setError('');

        const { error: insertError } = await supabase
            .from('salon_reviews')
            .insert({
                tenant_id: tenantId,
                client_name: clientName,
                rating,
                review_text: reviewText
            });

        if (insertError) {
            setError('Failed to submit review. Please try again.');
            setSaving(false);
        } else {
            setSuccess(true);
            setSaving(false);
        }
    };

    if (loading) {
        return (
            <div className="min-h-screen bg-luxe-obsidian flex items-center justify-center">
                <Loader2 className="w-8 h-8 text-luxe-gold animate-spin" />
            </div>
        );
    }

    if (error && !tenant) {
        return (
            <div className="min-h-screen bg-luxe-obsidian flex flex-col items-center justify-center p-6 text-center text-white">
                <div className="w-16 h-16 rounded-full bg-red-500/10 border border-red-500/20 flex items-center justify-center mb-6">
                    <MessageSquare className="w-8 h-8 text-red-400" />
                </div>
                <h2 className="text-2xl font-bold mb-2">Oops!</h2>
                <p className="text-white/60">{error}</p>
            </div>
        );
    }

    if (success) {
        return (
            <div className="min-h-screen bg-luxe-obsidian flex flex-col items-center justify-center p-6 text-center text-white animate-in zoom-in duration-500">
                <div className="w-20 h-20 rounded-full bg-green-500/10 border border-green-500/20 flex items-center justify-center mb-6">
                    <CheckCircle className="w-10 h-10 text-green-400" />
                </div>
                <h2 className="text-3xl font-black mb-2 text-luxe-gold">Thank You!</h2>
                <p className="text-white/60 mb-8 max-w-sm">We appreciate your feedback. It helps us improve our services.</p>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-luxe-obsidian text-white flex flex-col">
            <div className="flex-1 max-w-xl w-full mx-auto p-6 md:p-8 flex flex-col justify-center">
                
                {/* Header Profile */}
                <div className="text-center mb-10">
                    {tenant?.logo_url ? (
                        <div className="w-20 h-20 bg-white/5 rounded-full mx-auto mb-4 border border-white/10 flex items-center justify-center overflow-hidden">
                            <img src={tenant.logo_url} alt="Logo" className="w-full h-full object-cover" />
                        </div>
                    ) : (
                        <div className="w-20 h-20 bg-luxe-gold/20 rounded-full mx-auto mb-4 border border-luxe-gold/30 flex items-center justify-center text-3xl font-black text-luxe-gold uppercase">
                            {tenant?.salon_name?.charAt(0) || 'S'}
                        </div>
                    )}
                    <h1 className="text-2xl font-black text-luxe-gold tracking-tight">{tenant?.salon_name || 'Salon'}</h1>
                    <p className="text-sm text-white/50 mt-1">Leave a Review</p>
                </div>

                {/* Greeting */}
                <div className="glass-panel p-8 text-center relative overflow-hidden">
                    <div className="absolute top-0 inset-x-0 h-1 bg-gradient-to-r from-luxe-gold/0 via-luxe-gold to-luxe-gold/0 opacity-50" />
                    <h2 className="text-xl font-bold mb-6">Rate your experience</h2>

                    {error && (
                        <div className="mb-6 p-4 bg-red-500/10 border border-red-500/20 rounded-xl text-red-400 text-sm">
                            {error}
                        </div>
                    )}

                    {/* Star Rating */}
                    <div className="flex flex-col items-center gap-4 mb-8">
                        <div className="flex items-center gap-2">
                            {[1, 2, 3, 4, 5].map((star) => (
                                <button
                                    key={star}
                                    type="button"
                                    onClick={() => setRating(star)}
                                    onMouseEnter={() => setHoverRating(star)}
                                    onMouseLeave={() => setHoverRating(0)}
                                    className="p-1 transition-transform hover:scale-110 active:scale-95 outline-none"
                                >
                                    <Star 
                                        className={`w-10 h-10 ${
                                            (hoverRating || rating) >= star 
                                                ? 'fill-luxe-gold text-luxe-gold drop-shadow-[0_0_10px_rgba(212,175,55,0.5)]' 
                                                : 'text-white/20'
                                        } transition-all duration-300`} 
                                    />
                                </button>
                            ))}
                        </div>
                        <span className="text-xs font-bold text-white/40 uppercase tracking-widest h-4">
                            {rating === 1 && 'Poor'}
                            {rating === 2 && 'Fair'}
                            {rating === 3 && 'Good'}
                            {rating === 4 && 'Great'}
                            {rating === 5 && 'Exceptional'}
                        </span>
                    </div>

                    <div className="space-y-4 text-left mt-6">
                        <div>
                            <label className="text-xs font-bold text-white/50 uppercase tracking-wider mb-2 block">Your Name *</label>
                            <input
                                value={clientName}
                                onChange={(e) => setClientName(e.target.value)}
                                placeholder="e.g. Ali Khan"
                                className="w-full bg-white/5 border border-white/10 rounded-xl p-4 text-sm outline-none focus:border-luxe-gold/50 transition-all font-bold"
                            />
                        </div>
                        <div>
                            <label className="text-xs font-bold text-white/50 uppercase tracking-wider mb-2 block">Tell us more (optional)</label>
                            <textarea
                                value={reviewText}
                                onChange={(e) => setReviewText(e.target.value)}
                                placeholder="What did you love? How can we improve?"
                                className="w-full h-32 bg-white/5 border border-white/10 rounded-xl p-4 text-sm outline-none focus:border-luxe-gold/50 transition-all resize-none"
                            />
                        </div>
                    </div>

                    <button
                        onClick={submitFeedback}
                        disabled={saving}
                        className="w-full bg-gold-gradient text-luxe-obsidian mt-8 py-4 rounded-xl font-black text-sm tracking-wide shadow-xl shadow-luxe-gold/20 hover:scale-[1.02] active:scale-[0.98] transition-all disabled:opacity-50 disabled:scale-100 flex items-center justify-center"
                    >
                        {saving ? <Loader2 className="w-5 h-5 animate-spin" /> : 'POST REVIEW'}
                    </button>
                </div>
            </div>
        </div>
    );
};
