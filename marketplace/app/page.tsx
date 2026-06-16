import Link from 'next/link';
import { PhoneCall, Calendar, BarChart2, Globe, Star, Zap, Shield, Users } from 'lucide-react';

export default function HomePage() {
  return (
    <main style={{ fontFamily: 'Inter, sans-serif', color: '#101113', background: '#fff' }}>

      {/* ── NAVBAR ── */}
      <nav style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '0 40px', height: 64, borderBottom: '1px solid #f0f0f0',
        position: 'sticky', top: 0, background: '#fff', zIndex: 100,
      }}>
        <div style={{ fontWeight: 800, fontSize: 22, color: '#101113', letterSpacing: '-0.5px' }}>
          voxali
        </div>
        <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
          <Link href="/app/" style={{ color: '#101113', textDecoration: 'none', fontSize: 14, fontWeight: 500 }}>
            Log in
          </Link>
          <Link href="/app/" style={{
            background: '#101113', color: '#fff', padding: '9px 20px',
            borderRadius: 8, fontSize: 14, fontWeight: 600, textDecoration: 'none',
          }}>
            Start free trial
          </Link>
        </div>
      </nav>

      {/* ── HERO ── */}
      <section style={{
        textAlign: 'center', padding: '100px 40px 80px',
        background: 'linear-gradient(180deg, #f8f5ff 0%, #fff 100%)',
      }}>
        <div style={{
          display: 'inline-flex', alignItems: 'center', gap: 6,
          background: '#ede9fe', borderRadius: 20, padding: '5px 14px',
          fontSize: 12, fontWeight: 600, color: '#7c3aed', marginBottom: 24,
        }}>
          <Zap size={12} /> AI-Powered Salon Management
        </div>
        <h1 style={{ fontSize: 'clamp(36px, 6vw, 64px)', fontWeight: 800, lineHeight: 1.1, margin: '0 auto 24px', maxWidth: 720, letterSpacing: '-1.5px' }}>
          Your salon, running <span style={{ color: '#7c3aed' }}>24/7</span> on autopilot
        </h1>
        <p style={{ fontSize: 18, color: '#666', maxWidth: 520, margin: '0 auto 40px', lineHeight: 1.7 }}>
          Bella, your AI receptionist, answers calls, books appointments, and manages your salon — even while you sleep.
        </p>
        <div style={{ display: 'flex', gap: 12, justifyContent: 'center', flexWrap: 'wrap' }}>
          <Link href="/app/" style={{
            background: '#101113', color: '#fff', padding: '14px 32px',
            borderRadius: 10, fontSize: 15, fontWeight: 700, textDecoration: 'none',
            display: 'inline-flex', alignItems: 'center', gap: 8,
          }}>
            <PhoneCall size={16} /> Book a Demo
          </Link>
          <Link href="/app/" style={{
            background: '#fff', color: '#101113', padding: '14px 32px',
            borderRadius: 10, fontSize: 15, fontWeight: 600, textDecoration: 'none',
            border: '1.5px solid #e0e0e0',
          }}>
            Sign in to Dashboard
          </Link>
        </div>
        <p style={{ fontSize: 12, color: '#999', marginTop: 16 }}>No credit card required · 14-day free trial</p>
      </section>

      {/* ── STATS ── */}
      <section style={{ padding: '60px 40px', borderTop: '1px solid #f0f0f0', borderBottom: '1px solid #f0f0f0' }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 40, maxWidth: 900, margin: '0 auto', textAlign: 'center' }}>
          {[
            { num: '24/7', label: 'AI receptionist uptime' },
            { num: '3 min', label: 'Average setup time' },
            { num: '40%', label: 'More bookings on average' },
            { num: '0 calls', label: 'Missed with Bella active' },
          ].map((s) => (
            <div key={s.label}>
              <div style={{ fontSize: 36, fontWeight: 800, color: '#101113', letterSpacing: '-1px' }}>{s.num}</div>
              <div style={{ fontSize: 13, color: '#888', marginTop: 6 }}>{s.label}</div>
            </div>
          ))}
        </div>
      </section>

      {/* ── FEATURES ── */}
      <section style={{ padding: '80px 40px', maxWidth: 1100, margin: '0 auto' }}>
        <h2 style={{ textAlign: 'center', fontSize: 36, fontWeight: 800, marginBottom: 60, letterSpacing: '-0.5px' }}>
          Everything your salon needs
        </h2>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 24 }}>
          {[
            { icon: <PhoneCall size={22} color="#7c3aed" />, title: 'AI Voice Receptionist', desc: 'Bella answers every call, books appointments, and handles cancellations — in any language, 24/7.' },
            { icon: <Calendar size={22} color="#7c3aed" />, title: 'Smart Booking Calendar', desc: 'Real-time availability, staff scheduling, and automated reminders. No more double bookings.' },
            { icon: <BarChart2 size={22} color="#7c3aed" />, title: 'Revenue Analytics', desc: 'Track daily revenue, top services, and client retention with live dashboard insights.' },
            { icon: <Users size={22} color="#7c3aed" />, title: 'Client CRM', desc: 'Full client history, preferences, and contact details — always at your fingertips.' },
            { icon: <Globe size={22} color="#7c3aed" />, title: 'Multi-Language Support', desc: 'Bella speaks English, Urdu, Arabic, Spanish, French and more — serving your local market.' },
            { icon: <Shield size={22} color="#7c3aed" />, title: 'Secure & Reliable', desc: 'Bank-grade encryption, 99.9% uptime, and GDPR-compliant data handling.' },
          ].map((f) => (
            <div key={f.title} style={{
              padding: 28, borderRadius: 14, border: '1.5px solid #f0f0f0',
              transition: 'border-color 0.2s', cursor: 'default',
            }}
              onMouseEnter={e => (e.currentTarget.style.borderColor = '#c4b5fd')}
              onMouseLeave={e => (e.currentTarget.style.borderColor = '#f0f0f0')}
            >
              <div style={{ marginBottom: 14 }}>{f.icon}</div>
              <h3 style={{ fontSize: 16, fontWeight: 700, marginBottom: 8 }}>{f.title}</h3>
              <p style={{ fontSize: 14, color: '#666', lineHeight: 1.65 }}>{f.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ── HOW IT WORKS ── */}
      <section style={{ background: '#fafafa', padding: '80px 40px', borderTop: '1px solid #f0f0f0' }}>
        <div style={{ maxWidth: 700, margin: '0 auto', textAlign: 'center' }}>
          <h2 style={{ fontSize: 36, fontWeight: 800, marginBottom: 16, letterSpacing: '-0.5px' }}>Up and running in minutes</h2>
          <p style={{ color: '#666', marginBottom: 56, fontSize: 16 }}>No technical knowledge needed</p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 32, textAlign: 'left' }}>
            {[
              { step: '01', title: 'Create your salon profile', desc: 'Add your salon name, services, staff and business hours in minutes.' },
              { step: '02', title: 'Bella goes live instantly', desc: 'Your AI receptionist is configured automatically — ready to answer calls immediately.' },
              { step: '03', title: 'Watch bookings come in', desc: 'Clients call, Bella books. You see everything live on your dashboard.' },
            ].map((s) => (
              <div key={s.step} style={{ display: 'flex', gap: 24, alignItems: 'flex-start' }}>
                <div style={{
                  minWidth: 48, height: 48, borderRadius: 12, background: '#ede9fe',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontWeight: 800, fontSize: 13, color: '#7c3aed',
                }}>
                  {s.step}
                </div>
                <div>
                  <div style={{ fontWeight: 700, fontSize: 16, marginBottom: 6 }}>{s.title}</div>
                  <div style={{ color: '#666', fontSize: 14, lineHeight: 1.65 }}>{s.desc}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── TESTIMONIALS ── */}
      <section style={{ padding: '80px 40px', maxWidth: 1000, margin: '0 auto' }}>
        <h2 style={{ textAlign: 'center', fontSize: 36, fontWeight: 800, marginBottom: 48, letterSpacing: '-0.5px' }}>
          Salon owners love Voxali
        </h2>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 20 }}>
          {[
            { name: 'Sarah M.', salon: 'Luxe Hair Studio, Toronto', text: 'Bella handles 80% of our calls now. I never miss a booking, even when I\'m with a client.' },
            { name: 'Ahmed K.', salon: 'Royal Cuts, Dubai', text: 'Setup took 5 minutes. The AI speaks Arabic perfectly. Our clients love it.' },
            { name: 'Priya D.', salon: 'Glow Studio, London', text: 'Revenue is up 35% since we started using Voxali. The analytics are brilliant.' },
          ].map((t) => (
            <div key={t.name} style={{ padding: 28, borderRadius: 14, background: '#fafafa', border: '1.5px solid #f0f0f0' }}>
              <div style={{ display: 'flex', gap: 2, marginBottom: 16 }}>
                {[1,2,3,4,5].map(i => <Star key={i} size={14} fill="#f59e0b" color="#f59e0b" />)}
              </div>
              <p style={{ fontSize: 14, lineHeight: 1.7, color: '#444', marginBottom: 16 }}>"{t.text}"</p>
              <div style={{ fontWeight: 700, fontSize: 13 }}>{t.name}</div>
              <div style={{ fontSize: 12, color: '#888' }}>{t.salon}</div>
            </div>
          ))}
        </div>
      </section>

      {/* ── PRICING CTA ── */}
      <section style={{ background: '#101113', padding: '80px 40px', textAlign: 'center', color: '#fff' }}>
        <h2 style={{ fontSize: 36, fontWeight: 800, marginBottom: 16, letterSpacing: '-0.5px' }}>
          Start your free trial today
        </h2>
        <p style={{ color: '#999', marginBottom: 36, fontSize: 16 }}>
          14 days free. No credit card. Cancel anytime.
        </p>
        <Link href="/app/" style={{
          background: '#7c3aed', color: '#fff', padding: '16px 40px',
          borderRadius: 10, fontSize: 16, fontWeight: 700, textDecoration: 'none',
          display: 'inline-block',
        }}>
          Get started free →
        </Link>
      </section>

      {/* ── FOOTER ── */}
      <footer style={{ padding: '40px', borderTop: '1px solid #f0f0f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 16 }}>
        <div style={{ fontWeight: 800, fontSize: 18, color: '#101113' }}>voxali</div>
        <div style={{ fontSize: 12, color: '#999' }}>
          © 2025 Voxali. All rights reserved. · USA & Canada
        </div>
        <div style={{ display: 'flex', gap: 20 }}>
          <Link href="/app/" style={{ fontSize: 13, color: '#666', textDecoration: 'none' }}>Dashboard</Link>
          <a href="mailto:support@voxali.net" style={{ fontSize: 13, color: '#666', textDecoration: 'none' }}>Support</a>
        </div>
      </footer>

    </main>
  );
}
