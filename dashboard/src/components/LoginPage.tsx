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
        { icon: <PhoneCall size={16} />, title: 'AI Voice Receptionist', desc: 'Never miss a call' },
        { icon: <Calendar size={16} />, title: 'Smart Booking', desc: 'Zero conflicts' },
        { icon: <BarChart2 size={16} />, title: 'Real-time Analytics', desc: 'Revenue at a glance' },
        { icon: <Users size={16} />, title: 'CRM & Clients', desc: 'Build loyalty' },
    ];

    if (checkingSession) {
        return (
            <div style={{ minHeight: '100vh', background: '#f8fafc', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Loader2 size={24} color="#09090b" style={{ animation: 'spin 1s linear infinite' }} />
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
                    background: #f8fafc;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    font-family: 'Inter', ui-sans-serif, system-ui, sans-serif;
                    padding: 16px; 
                    overflow-y: auto;
                }

                .login-container {
                    display: flex;
                    width: 100%;
                    max-width: 900px; 
                    background: #ffffff;
                    border-radius: 20px;
                    box-shadow: 0 25px 50px -12px rgba(0,0,0,0.08);
                    overflow: hidden;
                    animation: fadeUp 0.5s ease-out;
                    margin: auto; 
                }

                /* --- Left Side --- */
                .left-panel {
                    flex: 1;
                    background: linear-gradient(180deg, #111827 0%, #0f172a 100%); /* Softer dark slate */
                    padding: 32px; 
                    color: #ffffff;
                    display: flex;
                    flex-direction: column;
                    justify-content: center; 
                    position: relative;
                    overflow: hidden;
                }

                .animated-grid {
                    position: absolute;
                    top: 0; left: 0; right: 0; bottom: 0;
                    width: 100%; height: 100%;
                    background-size: 40px 40px;
                    background-image: 
                        linear-gradient(to right, rgba(255,255,255,0.1) 1px, transparent 1px),
                        linear-gradient(to bottom, rgba(255,255,255,0.1) 1px, transparent 1px);
                    mask-image: linear-gradient(to top, rgba(0,0,0,1) 0%, transparent 60%);
                    -webkit-mask-image: linear-gradient(to top, rgba(0,0,0,1) 0%, transparent 60%);
                    animation: panGrid 15s linear infinite;
                    z-index: 0;
                }

                @keyframes panGrid {
                    0% { background-position: 0px 0px; }
                    100% { background-position: 40px 40px; }
                }

                .left-panel > * {
                    position: relative;
                    z-index: 1;
                }

                .status-badge {
                    display: inline-flex;
                    align-items: center;
                    gap: 8px;
                    background: rgba(255,255,255,0.1);
                    border: 1px solid rgba(255,255,255,0.15);
                    border-radius: 20px;
                    padding: 4px 12px;
                    align-self: flex-start;
                    margin-bottom: 20px; 
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
                    margin-bottom: 20px; 
                }

                .logo-icon {
                    width: 36px;
                    height: 36px;
                    background: #ffffff;
                    border-radius: 10px;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    font-size: 16px;
                    font-weight: 800;
                    color: #111827;
                }

                .main-heading {
                    font-size: 26px; 
                    font-weight: 800;
                    line-height: 1.2;
                    margin: 0 0 8px 0;
                    letter-spacing: -0.02em;
                }

                .feature-list {
                    display: flex;
                    flex-direction: column;
                    gap: 8px; 
                    margin-top: 16px; 
                }

                .feature-card {
                    display: flex;
                    align-items: center;
                    gap: 12px;
                    background: rgba(255, 255, 255, 0.04);
                    border: 1px solid rgba(255, 255, 255, 0.08);
                    padding: 10px 14px; 
                    border-radius: 12px;
                    backdrop-filter: blur(4px);
                }

                .feature-icon-wrapper {
                    color: #94a3b8; /* Light slate */
                }

                /* --- Right Side --- */
                .right-panel {
                    flex: 1;
                    background: #ffffff;
                    padding: 32px 40px; 
                    position: relative;
                    display: flex;
                    flex-direction: column;
                    justify-content: center;
                }

                .input-group {
                    margin-bottom: 16px; 
                }

                .input-label {
                    display: block;
                    font-size: 13px; 
                    font-weight: 600;
                    color: #09090b;
                    margin-bottom: 6px;
                }

                .v-input {
                    width: 100%;
                    padding: 10px 14px; 
                    background: #ffffff;
                    border: 1px solid #e2e8f0;
                    border-radius: 10px;
                    font-size: 14px; 
                    color: #09090b;
                    outline: none;
                    transition: border-color 0.2s, box-shadow 0.2s;
                }

                .v-input:focus {
                    border-color: #09090b;
                    box-shadow: 0 0 0 3px rgba(9, 9, 11, 0.1);
                }

                .v-btn-primary {
                    width: 100%;
                    padding: 12px; 
                    background: #09090b; /* Black button */
                    color: #fff;
                    border: none;
                    border-radius: 10px;
                    font-size: 15px; 
                    font-weight: 600;
                    cursor: pointer;
                    margin-top: 4px; 
                    transition: background 0.2s, transform 0.1s;
                }

                .v-btn-primary:hover:not(:disabled) {
                    background: #27272a;
                }
                
                .v-btn-primary:disabled {
                    opacity: 0.6;
                    cursor: not-allowed;
                }

                .v-link {
                    color: #09090b;
                    font-weight: 600;
                    text-decoration: none;
                }

                .v-link:hover {
                    text-decoration: underline;
                }

                @media (max-width: 768px) {
                    .login-container {
                        flex-direction: column;
                        margin-top: 16px;
                        margin-bottom: 16px;
                    }
                    .left-panel, .right-panel {
                        padding: 24px;
                    }
                }
            `}</style>

            <div className="login-container">
                {/* --- LEFT PANEL --- */}
                <div className="left-panel">
                    <div className="animated-grid"></div>

                    <div className="status-badge">
                        <div className="status-dot"></div>
                        <span style={{ fontSize: 12, fontWeight: 500, color: 'rgba(255,255,255,0.9)' }}>All systems operational</span>
                    </div>

                    <div className="logo-section">
                        <div className="logo-icon">V</div>
                        <div>
                            <div style={{ fontSize: 18, fontWeight: 800, letterSpacing: '-0.02em', lineHeight: 1 }}>Voxali</div>
                            <div style={{ fontSize: 11, color: '#a1a1aa', fontWeight: 500, marginTop: 4 }}>Salon Management</div>
                        </div>
                    </div>

                    <h1 className="main-heading">
                        Run your salon<br />
                        <span style={{ color: '#ffffff' }}>on autopilot.</span>
                    </h1>
                    <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.8)', margin: 0 }}>
                        Bookings, calls, and clients handled automatically.
                    </p>

                    <div className="feature-list">
                        {features.map((f, i) => (
                            <div key={i} className="feature-card">
                                <div className="feature-icon-wrapper">{f.icon}</div>
                                <div>
                                    <div style={{ fontSize: 13, fontWeight: 700, color: '#ffffff' }}>{f.title}</div>
                                    <div style={{ fontSize: 11.5, color: 'rgba(255,255,255,0.6)', marginTop: 2 }}>{f.desc}</div>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

                {/* --- RIGHT PANEL --- */}
                <div className="right-panel">
                    <div style={{ marginBottom: 24 }}>
                        <h2 style={{ fontSize: 24, fontWeight: 800, color: '#09090b', margin: '0 0 6px', letterSpacing: '-0.02em' }}>
                            Welcome back
                        </h2>
                        <p style={{ color: '#71717a', fontSize: 13, margin: 0 }}>
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
                        <div className="input-group" style={{ marginBottom: 28 }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                                <label className="input-label" style={{ margin: 0 }}>Password</label>
                                <a href="mailto:support@voxali.net" className="v-link" style={{ fontSize: 12.5 }}>
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
                                    style={{ paddingRight: 40 }}
                                />
                                <button
                                    type="button"
                                    onClick={() => setShowPw(!showPw)}
                                    style={{
                                        position: 'absolute', right: 14, top: '50%',
                                        transform: 'translateY(-50%)',
                                        background: 'none', border: 'none',
                                        color: '#a1a1aa', cursor: 'pointer',
                                        display: 'flex', alignItems: 'center', padding: 0,
                                    }}
                                >
                                    {showPw ? <EyeOff size={16} /> : <Eye size={16} />}
                                </button>
                            </div>
                        </div>

                        {/* Error */}
                        {error && (
                            <div style={{
                                background: '#fef2f2', border: '1px solid #fecaca', color: '#ef4444',
                                padding: '10px 14px', borderRadius: 10, fontSize: 13, fontWeight: 500,
                                display: 'flex', alignItems: 'center', gap: 8, marginBottom: 20,
                            }}>
                                <span>⚠️</span> {error}
                            </div>
                        )}

                        {/* Submit */}
                        <button className="v-btn-primary" type="submit" disabled={loading || !email || !password}>
                            {loading
                                ? <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
                                    <Loader2 size={16} style={{ animation: 'spin 1s linear infinite' }} /> Signing in...
                                  </div>
                                : 'Sign in'
                            }
                        </button>
                    </form>

                    <div style={{ marginTop: 20, textAlign: 'center' }}>
                        <p style={{ color: '#71717a', fontSize: 13, margin: 0 }}>
                            Don't have an account?{' '}
                            <a href="#" className="v-link">
                                Sign up free
                            </a>
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
};


