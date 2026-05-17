import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { Eye, EyeOff, Loader2, PhoneCall, Calendar, BarChart2, Users } from 'lucide-react';

export const LoginPage: React.FC<{ onLogin: () => void }> = ({ onLogin }) => {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [showPw, setShowPw] = useState(false);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [checkingSession, setCheckingSession] = useState(true);

    useEffect(() => {
        supabase.auth.getSession().then(({ data: { session } }) => {
            if (session) onLogin();
            setCheckingSession(false);
        });
    }, [onLogin]);

    useEffect(() => {
        const { data: { subscription } } = supabase.auth.onAuthStateChange((_e, session) => {
            if (session) onLogin();
        });
        return () => subscription.unsubscribe();
    }, [onLogin]);

    const handleLogin = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!email || !password) return;
        setLoading(true);
        setError('');
        const { error: authError } = await supabase.auth.signInWithPassword({ email: email.trim(), password });
        if (authError) setError(authError.message === 'Invalid login credentials' ? 'Invalid email or password' : authError.message);
        setLoading(false);
    };

    const features = [
        { icon: <PhoneCall size={18} />, title: 'AI Voice Receptionist', desc: 'Never miss a call' },
        { icon: <Calendar size={18} />, title: 'Smart Booking', desc: 'Zero conflicts' },
        { icon: <BarChart2 size={18} />, title: 'Real-time Analytics', desc: 'Revenue at a glance' },
        { icon: <Users size={18} />, title: 'CRM & Clients', desc: 'Build loyalty' },
    ];

    if (checkingSession) {
        return (
            <div style={{ minHeight: '100vh', background: '#f8fafc', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Loader2 size={24} color="#8B5CF6" style={{ animation: 'spin 1s linear infinite' }} />
                <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
            </div>
        );
    }

    return (
        <div className="login-wrapper">
            <style>{`
                * { box-sizing: border-box; }
                @keyframes spin { to { transform: rotate(360deg); } }
                @keyframes fadeUp { 
                    from { opacity: 0; transform: translateY(20px); } 
                    to { opacity: 1; transform: translateY(0); } 
                }
                
                .login-wrapper {
                    min-height: 100vh;
                    background: #f8fafc; /* Light gray background to make card pop */
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    font-family: 'Inter', ui-sans-serif, system-ui, sans-serif;
                    padding: 24px;
                }

                .login-container {
                    display: flex;
                    width: 100%;
                    max-width: 940px;
                    background: #ffffff;
                    border-radius: 20px;
                    box-shadow: 0 25px 50px -12px rgba(0,0,0,0.08);
                    overflow: hidden;
                    animation: fadeUp 0.6s ease-out;
                }

                /* --- Left Side --- */
                .left-panel {
                    flex: 1;
                    background: #1e1b4b; /* Deep dark purple */
                    padding: 48px;
                    color: #ffffff;
                    display: flex;
                    flex-direction: column;
                }

                .status-badge {
                    display: inline-flex;
                    align-items: center;
                    gap: 8px;
                    background: rgba(255,255,255,0.1);
                    border: 1px solid rgba(255,255,255,0.15);
                    border-radius: 20px;
                    padding: 6px 14px;
                    align-self: flex-start;
                    margin-bottom: 40px;
                }

                .status-dot {
                    width: 8px;
                    height: 8px;
                    background: #10b981;
                    border-radius: 50%;
                }

                .logo-section {
                    display: flex;
                    align-items: center;
                    gap: 12px;
                    margin-bottom: 32px;
                }

                .logo-icon {
                    width: 44px;
                    height: 44px;
                    background: #8B5CF6;
                    border-radius: 12px;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    font-size: 20px;
                    font-weight: 700;
                    color: white;
                }

                .main-heading {
                    font-size: 32px;
                    font-weight: 800;
                    line-height: 1.2;
                    margin: 0 0 12px 0;
                    letter-spacing: -0.03em;
                }

                .feature-list {
                    display: flex;
                    flex-direction: column;
                    gap: 12px;
                    margin-top: 32px;
                }

                .feature-card {
                    display: flex;
                    align-items: center;
                    gap: 16px;
                    background: rgba(255, 255, 255, 0.03);
                    border: 1px solid rgba(255, 255, 255, 0.08);
                    padding: 14px 16px;
                    border-radius: 12px;
                }

                .feature-icon-wrapper {
                    color: #a78bfa; /* Lighter purple for icon */
                }


                /* --- Right Side --- */
                .right-panel {
                    flex: 1;
                    background: #ffffff;
                    padding: 56px 48px;
                    position: relative;
                    display: flex;
                    flex-direction: column;
                    justify-content: center;
                }

                .input-group {
                    margin-bottom: 20px;
                }

                .input-label {
                    display: block;
                    font-size: 14px;
                    font-weight: 600;
                    color: #0f172a;
                    margin-bottom: 8px;
                }

                .v-input {
                    width: 100%;
                    padding: 14px 16px;
                    background: #ffffff;
                    border: 1px solid #e2e8f0;
                    border-radius: 10px;
                    font-size: 15px;
                    color: #0f172a;
                    outline: none;
                    transition: border-color 0.2s, box-shadow 0.2s;
                }

                .v-input:focus {
                    border-color: #8B5CF6;
                    box-shadow: 0 0 0 3px rgba(139, 92, 246, 0.1);
                }

                .v-btn-primary {
                    width: 100%;
                    padding: 14px;
                    background: #8B5CF6;
                    color: #fff;
                    border: none;
                    border-radius: 10px;
                    font-size: 16px;
                    font-weight: 600;
                    cursor: pointer;
                    margin-top: 8px;
                    transition: background 0.2s, transform 0.1s;
                }

                .v-btn-primary:hover:not(:disabled) {
                    background: #7c3aed;
                }
                
                .v-btn-primary:disabled {
                    opacity: 0.6;
                    cursor: not-allowed;
                }

                @media (max-width: 768px) {
                    .login-container {
                        flex-direction: column;
                    }
                    .left-panel, .right-panel {
                        padding: 32px 24px;
                    }
                }
            `}</style>

            <div className="login-container">
                {/* --- LEFT PANEL --- */}
                <div className="left-panel">
                    <div className="status-badge">
                        <div className="status-dot"></div>
                        <span style={{ fontSize: 13, fontWeight: 500, color: 'rgba(255,255,255,0.9)' }}>All systems operational</span>
                    </div>

                    <div className="logo-section">
                        <div className="logo-icon">V</div>
                        <div>
                            <div style={{ fontSize: 20, fontWeight: 800, letterSpacing: '-0.02em', lineHeight: 1 }}>Voxali</div>
                            <div style={{ fontSize: 12, color: '#a78bfa', fontWeight: 500, marginTop: 4 }}>Salon Management</div>
                        </div>
                    </div>

                    <h1 className="main-heading">
                        Run your salon<br />
                        <span style={{ color: '#a78bfa' }}>on autopilot.</span>
                    </h1>
                    <p style={{ fontSize: 14, color: 'rgba(255,255,255,0.8)', margin: 0 }}>
                        Bookings, calls, and clients handled automatically.
                    </p>

                    <div className="feature-list">
                        {features.map((f, i) => (
                            <div key={i} className="feature-card">
                                <div className="feature-icon-wrapper">{f.icon}</div>
                                <div>
                                    <div style={{ fontSize: 14, fontWeight: 700, color: '#ffffff' }}>{f.title}</div>
                                    <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.6)', marginTop: 2 }}>{f.desc}</div>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

                {/* --- RIGHT PANEL --- */}
                <div className="right-panel">
                    <div style={{ marginBottom: 40 }}>
                        <h2 style={{ fontSize: 28, fontWeight: 800, color: '#0f172a', margin: '0 0 8px', letterSpacing: '-0.03em' }}>
                            Welcome back
                        </h2>
                        <p style={{ color: '#64748b', fontSize: 15, margin: 0 }}>
                            Sign in to your salon dashboard
                        </p>
                    </div>

                    <form onSubmit={handleLogin}>
                        {/* Email */}
                        <div className="input-group">
                            <label className="input-label">Email address</label>
                            <input
                                className="v-input"
                                type="email"
                                value={email}
                                onChange={e => setEmail(e.target.value)}
                                placeholder="you@salon.com"
                                autoComplete="email"
                            />
                        </div>

                        {/* Password */}
                        <div className="input-group" style={{ marginBottom: 32 }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                                <label className="input-label" style={{ margin: 0 }}>Password</label>
                                <a href="mailto:support@voxali.net" style={{ fontSize: 13, color: '#8B5CF6', textDecoration: 'none', fontWeight: 600 }}>
                                    Forgot password?
                                </a>
                            </div>
                            <div style={{ position: 'relative' }}>
                                <input
                                    className="v-input"
                                    type={showPw ? 'text' : 'password'}
                                    value={password}
                                    onChange={e => setPassword(e.target.value)}
                                    placeholder="••••••••"
                                    autoComplete="current-password"
                                    style={{ paddingRight: 48 }}
                                />
                                <button
                                    type="button"
                                    onClick={() => setShowPw(!showPw)}
                                    style={{
                                        position: 'absolute', right: 16, top: '50%',
                                        transform: 'translateY(-50%)',
                                        background: 'none', border: 'none',
                                        color: '#94a3b8', cursor: 'pointer',
                                        display: 'flex', alignItems: 'center', padding: 0,
                                    }}
                                >
                                    {showPw ? <EyeOff size={18} /> : <Eye size={18} />}
                                </button>
                            </div>
                        </div>

                        {/* Error */}
                        {error && (
                            <div style={{
                                background: '#fef2f2', border: '1px solid #fecaca', color: '#ef4444',
                                padding: '12px 16px', borderRadius: 10, fontSize: 14, fontWeight: 500,
                                display: 'flex', alignItems: 'center', gap: 8, marginBottom: 20,
                            }}>
                                <span>⚠️</span> {error}
                            </div>
                        )}

                        {/* Submit */}
                        <button className="v-btn-primary" type="submit" disabled={loading || !email || !password}>
                            {loading
                                ? <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
                                    <Loader2 size={18} style={{ animation: 'spin 1s linear infinite' }} /> Signing in...
                                  </div>
                                : 'Sign in'
                            }
                        </button>
                    </form>

                    <div style={{ marginTop: 24, textAlign: 'center' }}>
                        <p style={{ color: '#64748b', fontSize: 14, margin: 0 }}>
                            Don't have an account?{' '}
                            <a href="#" style={{ color: '#8B5CF6', fontWeight: 600, textDecoration: 'none' }}>
                                Sign up free
                            </a>
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
};

