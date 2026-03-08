import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { Eye, EyeOff, Loader2 } from 'lucide-react';

// ====================================================================
// VOXALI — Shared SaaS Login Page
// This is the COMMON login page for ALL salon owners, managers & staff.
// It shows VOXALI branding, NOT salon-specific branding.
// After login, the user's profile determines which salon they see.
// ====================================================================

export const LoginPage: React.FC<{ onLogin: () => void }> = ({ onLogin }) => {
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
            <div style={styles.loadingContainer}>
                <Loader2 style={{ width: 32, height: 32, color: '#D4A853', animation: 'spin 1s linear infinite' }} />
            </div>
        );
    }

    return (
        <div style={styles.pageContainer}>
            {/* Animated background elements */}
            <div style={styles.bgContainer}>
                <div style={styles.bgOrb1} />
                <div style={styles.bgOrb2} />
                <div style={styles.bgOrb3} />
                <div style={styles.gridOverlay} />
            </div>

            <div style={styles.mainContent}>
                {/* Left side — Hero Section */}
                <div style={styles.heroSection}>
                    <div style={styles.heroContent}>
                        {/* Voxali Logo */}
                        <div style={styles.logoContainer}>
                            <svg width="64" height="64" viewBox="0 0 64 64" fill="none">
                                <defs>
                                    <linearGradient id="voxGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                                        <stop offset="0%" stopColor="#F5D77A" />
                                        <stop offset="50%" stopColor="#D4A853" />
                                        <stop offset="100%" stopColor="#A67C32" />
                                    </linearGradient>
                                </defs>
                                <rect x="2" y="2" width="60" height="60" rx="16" fill="url(#voxGrad)" />
                                <path d="M20 18L32 46L44 18" stroke="#0A0A0F" strokeWidth="5" strokeLinecap="round" strokeLinejoin="round" />
                            </svg>
                        </div>

                        <h1 style={styles.heroTitle}>
                            <span style={styles.heroTitleGold}>Voxali</span>
                        </h1>
                        <p style={styles.heroSubtitle}>AI-Powered Salon Management</p>

                        <div style={styles.featureList}>
                            <div style={styles.featureItem}>
                                <div style={styles.featureDot} />
                                <span>Smart Booking & Scheduling</span>
                            </div>
                            <div style={styles.featureItem}>
                                <div style={styles.featureDot} />
                                <span>AI Voice Assistant — Bella</span>
                            </div>
                            <div style={styles.featureItem}>
                                <div style={styles.featureDot} />
                                <span>Real-time Analytics &amp; CRM</span>
                            </div>
                            <div style={styles.featureItem}>
                                <div style={styles.featureDot} />
                                <span>Multi-Salon Management</span>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Right side — Login Form */}
                <div style={styles.formSection}>
                    <div style={styles.formCard}>
                        <div style={styles.formHeader}>
                            <h2 style={styles.formTitle}>Welcome Back</h2>
                            <p style={styles.formDesc}>Sign in to your salon dashboard</p>
                        </div>

                        <form onSubmit={handleLogin} style={styles.form}>
                            <div style={styles.inputGroup}>
                                <label style={styles.label}>Email Address</label>
                                <input
                                    type="email"
                                    value={email}
                                    onChange={e => setEmail(e.target.value)}
                                    placeholder="you@salon.com"
                                    autoComplete="email"
                                    style={styles.input}
                                    onFocus={e => {
                                        e.target.style.borderColor = 'rgba(212,168,83,0.5)';
                                        e.target.style.backgroundColor = 'rgba(255,255,255,0.07)';
                                    }}
                                    onBlur={e => {
                                        e.target.style.borderColor = 'rgba(255,255,255,0.1)';
                                        e.target.style.backgroundColor = 'rgba(255,255,255,0.04)';
                                    }}
                                />
                            </div>

                            <div style={styles.inputGroup}>
                                <label style={styles.label}>Password</label>
                                <div style={{ position: 'relative' }}>
                                    <input
                                        type={showPw ? 'text' : 'password'}
                                        value={password}
                                        onChange={e => setPassword(e.target.value)}
                                        placeholder="••••••••"
                                        autoComplete="current-password"
                                        style={{ ...styles.input, paddingRight: 48 }}
                                        onFocus={e => {
                                            e.target.style.borderColor = 'rgba(212,168,83,0.5)';
                                            e.target.style.backgroundColor = 'rgba(255,255,255,0.07)';
                                        }}
                                        onBlur={e => {
                                            e.target.style.borderColor = 'rgba(255,255,255,0.1)';
                                            e.target.style.backgroundColor = 'rgba(255,255,255,0.04)';
                                        }}
                                    />
                                    <button
                                        type="button"
                                        onClick={() => setShowPw(!showPw)}
                                        style={styles.eyeBtn}
                                        aria-label="Toggle password visibility"
                                    >
                                        {showPw ? <EyeOff style={{ width: 18, height: 18 }} /> : <Eye style={{ width: 18, height: 18 }} />}
                                    </button>
                                </div>
                            </div>

                            {error && (
                                <div style={styles.errorBox}>
                                    {error}
                                </div>
                            )}

                            <button
                                type="submit"
                                disabled={loading || !email || !password}
                                style={{
                                    ...styles.submitBtn,
                                    opacity: (loading || !email || !password) ? 0.5 : 1,
                                    cursor: (loading || !email || !password) ? 'not-allowed' : 'pointer',
                                }}
                            >
                                {loading ? (
                                    <>
                                        <Loader2 style={{ width: 18, height: 18, animation: 'spin 1s linear infinite' }} />
                                        <span>Signing in...</span>
                                    </>
                                ) : (
                                    'Sign In'
                                )}
                            </button>
                        </form>

                        <div style={styles.footerSection}>
                            <div style={styles.divider} />
                            <p style={styles.footerText}>
                                Powered by <span style={styles.footerBrand}>Voxali</span> — Premium Salon SaaS
                            </p>
                        </div>
                    </div>
                </div>
            </div>

            {/* Global animation keyframes */}
            <style>{`
                @keyframes spin {
                    from { transform: rotate(0deg); }
                    to { transform: rotate(360deg); }
                }
                @keyframes float1 {
                    0%, 100% { transform: translate(0, 0) scale(1); }
                    33% { transform: translate(30px, -20px) scale(1.05); }
                    66% { transform: translate(-20px, 15px) scale(0.95); }
                }
                @keyframes float2 {
                    0%, 100% { transform: translate(0, 0) scale(1); }
                    50% { transform: translate(-40px, 20px) scale(1.1); }
                }
                @keyframes float3 {
                    0%, 100% { transform: translate(0, 0); }
                    50% { transform: translate(20px, -30px); }
                }
                @keyframes fadeInUp {
                    from { opacity: 0; transform: translateY(24px); }
                    to { opacity: 1; transform: translateY(0); }
                }
                @media (max-width: 768px) {
                    .login-hero-section { display: none !important; }
                    .login-form-section { width: 100% !important; padding: 24px !important; }
                }
            `}</style>
        </div>
    );
};

// ====================================================================
// STYLES — Premium dark glass UI
// ====================================================================
const styles: Record<string, React.CSSProperties> = {
    loadingContainer: {
        minHeight: '100vh',
        background: '#0A0A0F',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
    },
    pageContainer: {
        minHeight: '100vh',
        background: 'linear-gradient(135deg, #0A0A0F 0%, #0D0D15 40%, #0A0A0F 100%)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        position: 'relative',
        overflow: 'hidden',
        fontFamily: "'Inter', 'Segoe UI', system-ui, sans-serif",
    },
    bgContainer: {
        position: 'absolute',
        inset: 0,
        pointerEvents: 'none' as const,
    },
    bgOrb1: {
        position: 'absolute',
        top: '-10%',
        left: '20%',
        width: 500,
        height: 500,
        borderRadius: '50%',
        background: 'radial-gradient(circle, rgba(212,168,83,0.08) 0%, transparent 70%)',
        animation: 'float1 12s ease-in-out infinite',
    },
    bgOrb2: {
        position: 'absolute',
        bottom: '-5%',
        right: '10%',
        width: 400,
        height: 400,
        borderRadius: '50%',
        background: 'radial-gradient(circle, rgba(212,168,83,0.05) 0%, transparent 70%)',
        animation: 'float2 15s ease-in-out infinite',
    },
    bgOrb3: {
        position: 'absolute',
        top: '50%',
        right: '30%',
        width: 300,
        height: 300,
        borderRadius: '50%',
        background: 'radial-gradient(circle, rgba(100,130,255,0.04) 0%, transparent 70%)',
        animation: 'float3 10s ease-in-out infinite',
    },
    gridOverlay: {
        position: 'absolute',
        inset: 0,
        backgroundImage: 'linear-gradient(rgba(255,255,255,0.02) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.02) 1px, transparent 1px)',
        backgroundSize: '60px 60px',
    },
    mainContent: {
        display: 'flex',
        width: '100%',
        maxWidth: 960,
        minHeight: 580,
        position: 'relative',
        zIndex: 10,
        animation: 'fadeInUp 0.6s ease-out',
        margin: '0 24px',
    },
    // ===== LEFT: Hero Section =====
    heroSection: {
        flex: 1,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '48px 40px',
    },
    heroContent: {
        maxWidth: 340,
    },
    logoContainer: {
        marginBottom: 24,
        filter: 'drop-shadow(0 8px 24px rgba(212,168,83,0.25))',
    },
    heroTitle: {
        fontSize: 42,
        fontWeight: 900,
        margin: 0,
        letterSpacing: '-0.03em',
        lineHeight: 1.1,
    },
    heroTitleGold: {
        background: 'linear-gradient(135deg, #F5D77A 0%, #D4A853 50%, #A67C32 100%)',
        WebkitBackgroundClip: 'text',
        WebkitTextFillColor: 'transparent',
    },
    heroSubtitle: {
        color: 'rgba(255,255,255,0.45)',
        fontSize: 14,
        fontWeight: 500,
        margin: '8px 0 0',
        letterSpacing: '0.05em',
    },
    featureList: {
        marginTop: 40,
        display: 'flex',
        flexDirection: 'column',
        gap: 14,
    },
    featureItem: {
        display: 'flex',
        alignItems: 'center',
        gap: 12,
        color: 'rgba(255,255,255,0.5)',
        fontSize: 13,
        fontWeight: 500,
    },
    featureDot: {
        width: 6,
        height: 6,
        borderRadius: '50%',
        background: 'linear-gradient(135deg, #D4A853, #A67C32)',
        flexShrink: 0,
    },
    // ===== RIGHT: Form Section =====
    formSection: {
        flex: 1,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 24,
    },
    formCard: {
        width: '100%',
        maxWidth: 400,
        background: 'rgba(255,255,255,0.03)',
        backdropFilter: 'blur(40px)',
        WebkitBackdropFilter: 'blur(40px)',
        border: '1px solid rgba(255,255,255,0.08)',
        borderRadius: 24,
        padding: '40px 36px',
        boxShadow: '0 32px 64px rgba(0,0,0,0.4), inset 0 1px 0 rgba(255,255,255,0.05)',
    },
    formHeader: {
        marginBottom: 32,
    },
    formTitle: {
        fontSize: 24,
        fontWeight: 800,
        color: '#FAFAFA',
        margin: 0,
        letterSpacing: '-0.02em',
    },
    formDesc: {
        color: 'rgba(255,255,255,0.4)',
        fontSize: 13,
        margin: '6px 0 0',
        fontWeight: 400,
    },
    form: {
        display: 'flex',
        flexDirection: 'column',
        gap: 20,
    },
    inputGroup: {
        display: 'flex',
        flexDirection: 'column',
        gap: 6,
    },
    label: {
        fontSize: 10,
        fontWeight: 800,
        color: 'rgba(255,255,255,0.35)',
        textTransform: 'uppercase' as const,
        letterSpacing: '0.15em',
    },
    input: {
        width: '100%',
        background: 'rgba(255,255,255,0.04)',
        border: '1px solid rgba(255,255,255,0.1)',
        borderRadius: 14,
        padding: '14px 16px',
        fontSize: 14,
        color: '#FAFAFA',
        outline: 'none',
        transition: 'all 0.2s ease',
        boxSizing: 'border-box' as const,
    },
    eyeBtn: {
        position: 'absolute' as const,
        right: 14,
        top: '50%',
        transform: 'translateY(-50%)',
        background: 'none',
        border: 'none',
        color: 'rgba(255,255,255,0.3)',
        cursor: 'pointer',
        padding: 4,
        display: 'flex',
        alignItems: 'center',
    },
    errorBox: {
        background: 'rgba(239,68,68,0.1)',
        border: '1px solid rgba(239,68,68,0.2)',
        color: '#F87171',
        padding: '12px 16px',
        borderRadius: 14,
        fontSize: 13,
        fontWeight: 500,
    },
    submitBtn: {
        width: '100%',
        background: 'linear-gradient(135deg, #F5D77A 0%, #D4A853 50%, #A67C32 100%)',
        color: '#0A0A0F',
        fontWeight: 800,
        padding: '16px 0',
        borderRadius: 14,
        border: 'none',
        fontSize: 13,
        letterSpacing: '0.1em',
        textTransform: 'uppercase' as const,
        boxShadow: '0 8px 32px rgba(212,168,83,0.25)',
        transition: 'all 0.2s ease',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 8,
    },
    footerSection: {
        marginTop: 28,
    },
    divider: {
        height: 1,
        background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.06), transparent)',
        marginBottom: 16,
    },
    footerText: {
        textAlign: 'center' as const,
        color: 'rgba(255,255,255,0.2)',
        fontSize: 11,
        margin: 0,
        fontWeight: 400,
    },
    footerBrand: {
        color: 'rgba(212,168,83,0.5)',
        fontWeight: 700,
    },
};
