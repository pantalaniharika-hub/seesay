import React, { useEffect, useState } from 'react';
import { PhoneMockup } from '../components/PhoneMockup';

const STATS = [
  { value: '2.2B', label: 'people worldwide live with vision impairment', source: 'WHO, 2024' },
  { value: '39M', label: 'are completely blind', source: 'WHO, 2024' },
  { value: '80%', label: 'of all vision impairment is preventable or treatable', source: 'IAPB, 2023' },
];

const STEPS = [
  {
    number: '01',
    icon: '📷',
    title: 'Point',
    desc: 'Open SeeSay on any phone. The rear camera activates automatically — no setup, no configuration.',
    accent: 'var(--accent)',
  },
  {
    number: '02',
    icon: '🎙',
    title: 'Ask',
    desc: 'Tap once to hear a full scene description. Or tap "Ask" and speak any question about what\'s in front of you.',
    accent: 'var(--teal)',
  },
  {
    number: '03',
    icon: '🔊',
    title: 'Hear',
    desc: 'SeeSay speaks a clear, natural description back — powered by Claude AI, delivered entirely through sound.',
    accent: '#A78BFA',
  },
];

export function Landing() {
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const handler = () => setScrolled(window.scrollY > 20);
    window.addEventListener('scroll', handler, { passive: true });
    return () => window.removeEventListener('scroll', handler);
  }, []);

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg)' }}>
      {/* ─── Nav ─────────────────────────────────────────────────────── */}
      <nav
        style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          zIndex: 100,
          padding: '0 24px',
          height: 64,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          background: scrolled ? 'rgba(18,21,26,0.92)' : 'transparent',
          backdropFilter: scrolled ? 'blur(20px)' : 'none',
          borderBottom: scrolled ? '1px solid var(--border)' : '1px solid transparent',
          transition: 'all 0.3s ease',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div
            style={{
              width: 36,
              height: 36,
              borderRadius: 10,
              background: 'var(--accent)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '1.1rem',
            }}
            aria-hidden="true"
          >
            👁
          </div>
          <span style={{ fontSize: '1.25rem', fontWeight: 700, color: 'var(--text)' }}>
            See<span style={{ color: 'var(--accent)' }}>Say</span>
          </span>
        </div>
        <a
          href="/auth/google"
          id="nav-signin-btn"
          className="btn btn-primary"
          style={{ padding: '10px 20px', minHeight: 40, fontSize: '0.9rem' }}
          aria-label="Sign in with Google"
        >
          Sign in with Google
        </a>
      </nav>

      {/* ─── Hero ─────────────────────────────────────────────────────── */}
      <section
        style={{
          minHeight: '100vh',
          display: 'flex',
          alignItems: 'center',
          padding: '100px 24px 80px',
          position: 'relative',
          overflow: 'hidden',
        }}
        aria-labelledby="hero-headline"
      >
        {/* Background radial glow */}
        <div
          aria-hidden="true"
          style={{
            position: 'absolute',
            top: '10%',
            left: '5%',
            width: 600,
            height: 600,
            background: 'radial-gradient(circle, rgba(255,182,39,0.08) 0%, transparent 70%)',
            pointerEvents: 'none',
          }}
        />
        <div
          aria-hidden="true"
          style={{
            position: 'absolute',
            top: '30%',
            right: '5%',
            width: 400,
            height: 400,
            background: 'radial-gradient(circle, rgba(95,212,192,0.06) 0%, transparent 70%)',
            pointerEvents: 'none',
          }}
        />

        <div
          className="container"
          style={{
            display: 'grid',
            gridTemplateColumns: '1fr 1fr',
            gap: 80,
            alignItems: 'center',
          }}
        >
          {/* Left — copy */}
          <div style={{ animation: 'fadeInUp 0.7s ease both' }}>
            <div
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 8,
                background: 'var(--accent-dim)',
                border: '1px solid rgba(255,182,39,0.25)',
                borderRadius: 999,
                padding: '6px 14px',
                fontSize: '0.8rem',
                color: 'var(--accent)',
                fontWeight: 700,
                marginBottom: 28,
                letterSpacing: '0.05em',
              }}
            >
              <span aria-hidden="true">🏆</span>
              AI for Accessibility &amp; Inclusion
            </div>

            <h1
              id="hero-headline"
              style={{
                fontSize: 'clamp(2.5rem, 5vw, 4rem)',
                fontWeight: 700,
                lineHeight: 1.1,
                marginBottom: 24,
                letterSpacing: '-0.02em',
              }}
            >
              Giving{' '}
              <span
                style={{
                  background: 'linear-gradient(135deg, var(--accent), #FF8C42)',
                  WebkitBackgroundClip: 'text',
                  WebkitTextFillColor: 'transparent',
                  backgroundClip: 'text',
                }}
              >
                Sight
              </span>{' '}
              Through{' '}
              <span
                style={{
                  background: 'linear-gradient(135deg, var(--teal), #4BA8A0)',
                  WebkitBackgroundClip: 'text',
                  WebkitTextFillColor: 'transparent',
                  backgroundClip: 'text',
                }}
              >
                Sound
              </span>
            </h1>

            <p
              style={{
                fontSize: '1.2rem',
                color: 'var(--text-muted)',
                lineHeight: 1.6,
                marginBottom: 40,
                maxWidth: 480,
              }}
            >
              SeeSay is a voice-first AI sight assistant for blind and low-vision users. Point your camera at any scene, tap once, and hear a vivid spoken description. Ask follow-up questions, hands-free.
            </p>

            <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap' }}>
              <a
                href="/auth/google"
                id="hero-signin-btn"
                className="btn btn-primary"
                style={{ minHeight: 56, fontSize: '1.05rem', padding: '16px 32px' }}
                aria-label="Sign in with Google to start using SeeSay"
              >
                <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                  <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
                  <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                  <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
                  <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
                </svg>
                Sign in with Google
              </a>
              <a
                href="#how-it-works"
                className="btn btn-ghost"
                style={{ minHeight: 56, fontSize: '1.05rem', padding: '16px 32px' }}
                aria-label="Learn how SeeSay works"
              >
                See how it works ↓
              </a>
            </div>

            {/* Font callout */}
            <p
              style={{
                marginTop: 32,
                fontSize: '0.8rem',
                color: 'var(--text-faint)',
                display: 'flex',
                alignItems: 'center',
                gap: 8,
              }}
            >
              <span
                style={{
                  width: 16,
                  height: 16,
                  borderRadius: '50%',
                  background: 'var(--accent-dim)',
                  border: '1px solid rgba(255,182,39,0.2)',
                  display: 'inline-flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '0.5rem',
                  flexShrink: 0,
                }}
                aria-hidden="true"
              >
                Aa
              </span>
              Typeset in{' '}
              <strong style={{ color: 'var(--text-muted)' }}>Atkinson Hyperlegible</strong> — designed by the Braille Institute specifically for low-vision readers.
            </p>
          </div>

          {/* Right — phone mockup */}
          <div style={{ display: 'flex', justifyContent: 'center', animation: 'fadeInUp 0.7s ease 0.2s both' }}>
            <PhoneMockup />
          </div>
        </div>

        {/* Responsive overrides via media */}
        <style>{`
          @media (max-width: 768px) {
            section > .container {
              grid-template-columns: 1fr !important;
              gap: 48px !important;
              text-align: center;
            }
          }
        `}</style>
      </section>

      {/* ─── How It Works ──────────────────────────────────────────────── */}
      <section
        id="how-it-works"
        style={{ padding: '100px 24px', background: 'var(--surface)' }}
        aria-labelledby="hiw-heading"
      >
        <div className="container">
          <div style={{ textAlign: 'center', marginBottom: 64 }}>
            <p style={{ color: 'var(--accent)', fontWeight: 700, letterSpacing: '0.1em', fontSize: '0.8rem', marginBottom: 12, textTransform: 'uppercase' }}>
              Simple by design
            </p>
            <h2 id="hiw-heading" style={{ fontSize: 'clamp(1.8rem, 4vw, 2.5rem)', fontWeight: 700, marginBottom: 16 }}>
              Three steps. No screen required.
            </h2>
            <p style={{ color: 'var(--text-muted)', fontSize: '1.1rem', maxWidth: 520, margin: '0 auto' }}>
              SeeSay is built for eyes-free use from the ground up. Every interaction is a tap and a listen.
            </p>
          </div>

          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
              gap: 24,
            }}
          >
            {STEPS.map((step, idx) => (
              <div
                key={step.number}
                className="card"
                style={{
                  position: 'relative',
                  overflow: 'hidden',
                  animation: `fadeInUp 0.6s ease ${idx * 0.15}s both`,
                }}
              >
                <div
                  aria-hidden="true"
                  style={{
                    position: 'absolute',
                    top: -10,
                    right: -10,
                    fontSize: '5rem',
                    fontWeight: 900,
                    color: step.accent,
                    opacity: 0.05,
                    lineHeight: 1,
                    userSelect: 'none',
                  }}
                >
                  {step.number}
                </div>
                <div
                  style={{
                    width: 56,
                    height: 56,
                    borderRadius: 16,
                    background: `color-mix(in srgb, ${step.accent} 15%, transparent)`,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '1.5rem',
                    marginBottom: 20,
                    border: `1.5px solid color-mix(in srgb, ${step.accent} 30%, transparent)`,
                  }}
                  aria-hidden="true"
                >
                  {step.icon}
                </div>
                <h3
                  style={{
                    fontSize: '1.3rem',
                    fontWeight: 700,
                    color: step.accent,
                    marginBottom: 12,
                  }}
                >
                  {step.title}
                </h3>
                <p style={{ color: 'var(--text-muted)', lineHeight: 1.7 }}>{step.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ─── Why It Matters ────────────────────────────────────────────── */}
      <section
        id="why-it-matters"
        style={{ padding: '100px 24px' }}
        aria-labelledby="wim-heading"
      >
        <div className="container">
          <div style={{ textAlign: 'center', marginBottom: 64 }}>
            <p style={{ color: 'var(--teal)', fontWeight: 700, letterSpacing: '0.1em', fontSize: '0.8rem', marginBottom: 12, textTransform: 'uppercase' }}>
              The real need
            </p>
            <h2 id="wim-heading" style={{ fontSize: 'clamp(1.8rem, 4vw, 2.5rem)', fontWeight: 700, marginBottom: 16 }}>
              Why this matters
            </h2>
            <p style={{ color: 'var(--text-muted)', fontSize: '1.1rem', maxWidth: 520, margin: '0 auto' }}>
              Vision impairment affects billions globally. Technology like SeeSay can restore independence — wherever you are.
            </p>
          </div>

          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
              gap: 24,
            }}
          >
            {STATS.map((stat, idx) => (
              <div
                key={stat.value}
                style={{
                  background: 'var(--surface)',
                  border: '1px solid var(--border)',
                  borderRadius: 'var(--radius-lg)',
                  padding: 32,
                  textAlign: 'center',
                  position: 'relative',
                  overflow: 'hidden',
                  animation: `fadeInUp 0.6s ease ${idx * 0.15}s both`,
                }}
              >
                <div
                  aria-hidden="true"
                  style={{
                    position: 'absolute',
                    top: 0,
                    left: 0,
                    right: 0,
                    height: 3,
                    background: 'linear-gradient(90deg, var(--teal), var(--accent))',
                  }}
                />
                <div
                  style={{
                    fontSize: 'clamp(2.5rem, 5vw, 3.5rem)',
                    fontWeight: 700,
                    background: 'linear-gradient(135deg, var(--teal), var(--accent))',
                    WebkitBackgroundClip: 'text',
                    WebkitTextFillColor: 'transparent',
                    backgroundClip: 'text',
                    lineHeight: 1.1,
                    marginBottom: 12,
                  }}
                >
                  {stat.value}
                </div>
                <p style={{ color: 'var(--text)', fontSize: '1rem', lineHeight: 1.5, marginBottom: 12 }}>
                  {stat.label}
                </p>
                <p style={{ color: 'var(--text-faint)', fontSize: '0.75rem' }}>
                  Source: {stat.source}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ─── CTA ───────────────────────────────────────────────────────── */}
      <section
        style={{
          padding: '80px 24px',
          background: 'var(--surface)',
          borderTop: '1px solid var(--border)',
        }}
        aria-label="Call to action"
      >
        <div className="container" style={{ textAlign: 'center' }}>
          <h2 style={{ fontSize: 'clamp(1.8rem, 4vw, 2.5rem)', fontWeight: 700, marginBottom: 16 }}>
            Ready to see with sound?
          </h2>
          <p style={{ color: 'var(--text-muted)', fontSize: '1.1rem', maxWidth: 480, margin: '0 auto 40px' }}>
            Sign in with your Google account. No app install needed — SeeSay runs entirely in your browser.
          </p>
          <a
            href="/auth/google"
            id="cta-signin-btn"
            className="btn btn-primary"
            style={{ minHeight: 60, fontSize: '1.1rem', padding: '18px 40px', display: 'inline-flex' }}
            aria-label="Get started with SeeSay using Google sign in"
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
              <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
              <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
              <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
              <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
            </svg>
            Get started free
          </a>
        </div>
      </section>

      {/* ─── Footer ────────────────────────────────────────────────────── */}
      <footer
        style={{
          padding: '32px 24px',
          borderTop: '1px solid var(--border)',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: 12,
        }}
        role="contentinfo"
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span aria-hidden="true">👁</span>
          <span style={{ fontWeight: 700 }}>SeeSay</span>
          <span style={{ color: 'var(--text-faint)', marginLeft: 8 }}>AI for Accessibility &amp; Inclusion</span>
        </div>
        <p style={{ color: 'var(--text-faint)', fontSize: '0.8rem' }}>
          Built with ♥ for the hackathon · {new Date().getFullYear()}
        </p>
      </footer>
    </div>
  );
}
