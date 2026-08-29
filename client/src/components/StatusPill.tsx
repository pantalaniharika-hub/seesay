import React from 'react';

export type AppStatus = 'ready' | 'listening' | 'looking' | 'speaking';

interface StatusPillProps {
  status: AppStatus;
}

const CONFIG: Record<AppStatus, { label: string; color: string; bg: string; dots: boolean }> = {
  ready:     { label: 'Ready',     color: 'var(--text-muted)',  bg: 'rgba(154,150,144,0.1)',    dots: false },
  listening: { label: 'Listening', color: 'var(--teal)',        bg: 'rgba(95,212,192,0.12)',     dots: true  },
  looking:   { label: 'Looking',   color: 'var(--accent)',      bg: 'rgba(255,182,39,0.12)',     dots: true  },
  speaking:  { label: 'Speaking',  color: '#A78BFA',            bg: 'rgba(167,139,250,0.12)',    dots: true  },
};

export function StatusPill({ status }: StatusPillProps) {
  const cfg = CONFIG[status];

  return (
    <div
      role="status"
      aria-live="polite"
      aria-label={`Status: ${cfg.label}`}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 8,
        padding: '8px 16px',
        borderRadius: 999,
        background: cfg.bg,
        border: `1.5px solid ${cfg.color}`,
        color: cfg.color,
        fontSize: '0.875rem',
        fontWeight: 700,
        letterSpacing: '0.04em',
        transition: 'all 0.3s ease',
        userSelect: 'none',
      }}
    >
      {cfg.dots ? (
        <span style={{ display: 'flex', gap: 3, alignItems: 'center' }}>
          {[0, 1, 2].map(i => (
            <span
              key={i}
              style={{
                display: 'block',
                width: 5,
                height: 12,
                borderRadius: 2,
                background: cfg.color,
                animation: 'bounce 1.2s ease-in-out infinite',
                animationDelay: `${i * 0.15}s`,
              }}
            />
          ))}
        </span>
      ) : (
        <span
          style={{
            width: 8,
            height: 8,
            borderRadius: '50%',
            background: cfg.color,
            display: 'block',
            opacity: 0.7,
          }}
        />
      )}
      {cfg.label}
    </div>
  );
}
