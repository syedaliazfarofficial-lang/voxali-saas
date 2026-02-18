import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { useTenant } from '../context/TenantContext';
import { Eye, EyeOff, Loader2, Sparkles } from 'lucide-react';

export const LoginPage: React.FC<{ onLogin: () => void }> = ({ onLogin }) => {
    const { salonName, salonTagline, logoUrl } = useTenant();
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [showPw, setShowPw] = useState(false);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [checkingSession, setCheckingSession] = useState(true);

    // Check existing session on mount
    useEffect(() => {
        const checkSession = async () => {
            const { data: { session } } = await supabase.auth.getSession();
            if (session) {
                onLogin();
            }
            setCheckingSession(false);
        };
        checkSession();
    }, [onLogin]);

    // Listen for auth changes
    useEffect(() => {
        const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
            if (session) onLogin();
        });
        return () => subscription.unsubscribe();
    }, [onLogin]);

    const handleLogin = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!email || !password) return;
        setLoading(true);
        setError('');

        const { error: authError } = await supabase.auth.signInWithPassword({
            email: email.trim(),
            password,
        });

        if (authError) {
            setError(authError.message === 'Invalid login credentials'
                ? 'Invalid email or password'
                : authError.message
            );
        }
        setLoading(false);
    };

    if (checkingSession) {
        return (
            <div className="min-h-screen bg-luxe-obsidian flex items-center justify-center">
                <Loader2 className="w-8 h-8 text-luxe-gold animate-spin" />
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-luxe-obsidian flex items-center justify-center p-6 relative overflow-hidden">
            {/* Background effects */}
            <div className="absolute inset-0 pointer-events-none">
                <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[400px] bg-luxe-gold/5 rounded-full blur-[120px]" />
                <div className="absolute bottom-0 right-0 w-[400px] h-[400px] bg-luxe-gold/3 rounded-full blur-[100px]" />
            </div>

            <div className="w-full max-w-md relative z-10">
                {/* Logo & Header */}
                <div className="text-center mb-10">
                    {logoUrl ? (
                        <img src={logoUrl} alt={salonName} className="w-20 h-20 rounded-2xl mx-auto mb-6 shadow-2xl shadow-luxe-gold/20 border border-white/10" />
                    ) : (
                        <div className="w-20 h-20 bg-gold-gradient rounded-2xl mx-auto mb-6 flex items-center justify-center shadow-2xl shadow-luxe-gold/30">
                            <span className="text-luxe-obsidian font-black text-3xl">{salonName.charAt(0)}</span>
                        </div>
                    )}
                    <h1 className="text-3xl font-black text-luxe-white tracking-tight">{salonName.toUpperCase()}</h1>
                    <p className="text-luxe-gold/60 text-xs uppercase tracking-[0.3em] mt-2">{salonTagline}</p>
                </div>

                {/* Login Card */}
                <div className="bg-white/[0.03] backdrop-blur-xl border border-white/10 rounded-3xl p-8 shadow-2xl">
                    <div className="flex items-center gap-2 mb-8">
                        <Sparkles className="w-5 h-5 text-luxe-gold" />
                        <h2 className="text-lg font-bold text-luxe-white">Dashboard Login</h2>
                    </div>

                    <form onSubmit={handleLogin} className="space-y-5">
                        <div>
                            <label className="text-[10px] font-black text-white/40 uppercase tracking-[0.2em] mb-2 block">Email Address</label>
                            <input
                                type="email"
                                value={email}
                                onChange={e => setEmail(e.target.value)}
                                placeholder="you@salon.com"
                                autoComplete="email"
                                className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3.5 text-sm text-luxe-white placeholder:text-white/20 outline-none focus:border-luxe-gold/50 focus:bg-white/[0.07] transition-all"
                            />
                        </div>

                        <div>
                            <label className="text-[10px] font-black text-white/40 uppercase tracking-[0.2em] mb-2 block">Password</label>
                            <div className="relative">
                                <input
                                    type={showPw ? 'text' : 'password'}
                                    value={password}
                                    onChange={e => setPassword(e.target.value)}
                                    placeholder="••••••••"
                                    autoComplete="current-password"
                                    className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3.5 pr-12 text-sm text-luxe-white placeholder:text-white/20 outline-none focus:border-luxe-gold/50 focus:bg-white/[0.07] transition-all"
                                />
                                <button
                                    type="button"
                                    onClick={() => setShowPw(!showPw)}
                                    className="absolute right-3 top-1/2 -translate-y-1/2 text-white/30 hover:text-white/60 transition-colors"
                                >
                                    {showPw ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                                </button>
                            </div>
                        </div>

                        {error && (
                            <div className="bg-red-500/10 border border-red-500/20 text-red-400 px-4 py-3 rounded-xl text-sm font-medium animate-in slide-in-from-top-1">
                                {error}
                            </div>
                        )}

                        <button
                            type="submit"
                            disabled={loading || !email || !password}
                            className="w-full bg-gold-gradient text-luxe-obsidian font-black py-4 rounded-xl shadow-lg shadow-luxe-gold/25 hover:shadow-luxe-gold/40 hover:scale-[1.02] active:scale-[0.98] transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 text-sm uppercase tracking-wider"
                        >
                            {loading ? (
                                <><Loader2 className="w-5 h-5 animate-spin" /> Signing in...</>
                            ) : (
                                'Sign In'
                            )}
                        </button>
                    </form>

                    <p className="text-center text-white/20 text-xs mt-6">
                        Powered by <span className="text-luxe-gold/40 font-bold">Voxali</span>
                    </p>
                </div>
            </div>
        </div>
    );
};
