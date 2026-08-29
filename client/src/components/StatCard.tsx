import React from 'react';

interface StatCardProps {
  label: string;
  value: number | null;
  icon: string;
  accent?: 'amber' | 'teal' | 'purple';
}

const ACCENT_COLORS = {
  amber:  { color: 'var(--accent)',  bg: 'var(--accent-dim)'  },
  teal:   { color: 'var(--teal)',    bg: 'var(--teal-dim)'    },
  purple: { color: '#A78BFA',        bg: 'rgba(167,139,250,0.1)' },
};

export function StatCard({ label, value, icon, accent = 'amber' }: StatCardProps) {
  const colors = ACCENT_COLORS[accent];

  return (
    <div
      className="card"
      style={{
        display: 'flex',
        flexDirection: 'column',
        gap: 12,
        position: 'relative',
        overflow: 'hidden',
      }}
    >
      {/* Glow accent */}
      <div
        style={{
          position: 'absolute',
          top: -20,
          right: -20,
          width: 80,
          height: 80,
          borderRadius: '50%',
          background: colors.color,
          opacity: 0.08,
          filter: 'blur(20px)',
          pointerEvents: 'none',
        }}
      />
      <div
        style={{
          width: 44,
          height: 44,
          borderRadius: 12,
          background: colors.bg,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: '1.25rem',
          color: colors.color,
        }}
        aria-hidden="true"
      >
        {icon}
      </div>
      <div>
        {value === null ? (
          <div className="skeleton" style={{ height: 40, width: 80, marginBottom: 6 }} />
        ) : (
          <div
            style={{
              fontSize: '2.25rem',
              fontWeight: 700,
              color: colors.color,
              lineHeight: 1,
              marginBottom: 4,
            }}
            aria-label={`${label}: ${value}`}
          >
            {value.toLocaleString()}
          </div>
        )}
        <div style={{ color: 'var(--text-muted)', fontSize: '0.875rem', fontWeight: 600 }}>
          {label}
        </div>
      </div>
    </div>
  );
}
