import React from 'react';

export function PhoneMockup() {
  return (
    <div
      aria-hidden="true"
      style={{
        position: 'relative',
        width: 280,
        margin: '0 auto',
        animation: 'float 4s ease-in-out infinite',
      }}
    >
      {/* Phone shell */}
      <div
        style={{
          background: 'linear-gradient(160deg, #2A3240 0%, #1B2028 100%)',
          border: '2px solid rgba(245,243,238,0.12)',
          borderRadius: 44,
          padding: '12px 8px',
          boxShadow: '0 32px 80px rgba(0,0,0,0.6), inset 0 1px 0 rgba(255,255,255,0.06)',
          position: 'relative',
        }}
      >
        {/* Notch */}
        <div
          style={{
            width: 80,
            height: 22,
            background: '#12151A',
            borderRadius: 11,
            margin: '0 auto 8px',
          }}
        />

        {/* Camera viewfinder screen */}
        <div
          style={{
            background: '#0A0C10',
            borderRadius: 28,
            overflow: 'hidden',
            position: 'relative',
            aspectRatio: '9/16',
            maxHeight: 400,
          }}
        >
          {/* Simulated camera scene - gradient landscape */}
          <div
            style={{
              position: 'absolute',
              inset: 0,
              background: 'linear-gradient(180deg, #1a2a1a 0%, #2d4a2d 40%, #3a5c2a 60%, #4a7a35 100%)',
              opacity: 0.7,
            }}
          />
          {/* Sky gradient */}
          <div
            style={{
              position: 'absolute',
              top: 0,
              left: 0,
              right: 0,
              height: '40%',
              background: 'linear-gradient(180deg, #1a3a5c 0%, #2a5a8c 50%, #3a7aac 100%)',
              opacity: 0.6,
            }}
          />

          {/* Viewfinder corners */}
          {[
            { top: 12, left: 12, borderTop: '2px solid var(--accent)', borderLeft: '2px solid var(--accent)' },
            { top: 12, right: 12, borderTop: '2px solid var(--accent)', borderRight: '2px solid var(--accent)' },
            { bottom: 12, left: 12, borderBottom: '2px solid var(--accent)', borderLeft: '2px solid var(--accent)' },
            { bottom: 12, right: 12, borderBottom: '2px solid var(--accent)', borderRight: '2px solid var(--accent)' },
          ].map((style, i) => (
            <div
              key={i}
              style={{
                position: 'absolute',
                width: 20,
                height: 20,
                borderRadius: 2,
                ...style,
              }}
            />
          ))}

          {/* Scan line animation */}
          <div
            style={{
              position: 'absolute',
              left: 0,
              right: 0,
              height: 2,
              background: 'linear-gradient(90deg, transparent, var(--accent), transparent)',
              animation: 'scanline 2.5s ease-in-out infinite',
              opacity: 0.7,
            }}
          />

          {/* Speech bubble */}
          <div
            style={{
              position: 'absolute',
              bottom: 48,
              left: 12,
              right: 12,
              background: 'rgba(27, 32, 40, 0.92)',
              backdropFilter: 'blur(12px)',
              borderRadius: 16,
              padding: '12px 14px',
              border: '1px solid rgba(255,182,39,0.3)',
              animation: 'fadeInUp 0.5s ease 0.5s both',
            }}
          >
            {/* Speaker icon */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 6 }}>
              <div
                style={{
                  width: 20,
                  height: 20,
                  borderRadius: '50%',
                  background: 'var(--accent-dim)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '0.6rem',
                  color: 'var(--accent)',
                }}
              >
                🔊
              </div>
              <span style={{ color: 'var(--accent)', fontSize: '0.6rem', fontWeight: 700 }}>SeeSay</span>
            </div>
            <p style={{ color: 'var(--text)', fontSize: '0.7rem', lineHeight: 1.5 }}>
              "A park bench is ahead of you. A person in a red jacket is sitting to your left, and the path is clear forward."
            </p>
            {/* Sound wave bars */}
            <div style={{ display: 'flex', gap: 3, alignItems: 'flex-end', marginTop: 8, height: 16 }}>
              {[4, 8, 12, 16, 10, 14, 6, 10, 16, 8, 12, 4].map((h, i) => (
                <div
                  key={i}
                  style={{
                    flex: 1,
                    height: h,
                    background: 'var(--accent)',
                    borderRadius: 2,
                    opacity: 0.6,
                    animation: `bounce 1.2s ease-in-out infinite`,
                    animationDelay: `${i * 0.08}s`,
                  }}
                />
              ))}
            </div>
          </div>

          {/* Describe button at bottom */}
          <div
            style={{
              position: 'absolute',
              bottom: 12,
              left: '50%',
              transform: 'translateX(-50%)',
              background: 'var(--accent)',
              borderRadius: 20,
              padding: '8px 16px',
              fontSize: '0.65rem',
              fontWeight: 700,
              color: '#12151A',
              whiteSpace: 'nowrap',
            }}
          >
            👁 Describe what I see
          </div>
        </div>

        {/* Home bar */}
        <div
          style={{
            width: 100,
            height: 4,
            background: 'rgba(245,243,238,0.2)',
            borderRadius: 2,
            margin: '12px auto 0',
          }}
        />
      </div>

      {/* Ambient glow */}
      <div
        style={{
          position: 'absolute',
          bottom: -40,
          left: '50%',
          transform: 'translateX(-50%)',
          width: 200,
          height: 80,
          background: 'var(--accent)',
          borderRadius: '50%',
          filter: 'blur(40px)',
          opacity: 0.15,
          pointerEvents: 'none',
        }}
      />
      <style>{`
        @keyframes scanline {
          0% { top: 10%; }
          50% { top: 85%; }
          100% { top: 10%; }
        }
      `}</style>
    </div>
  );
}
