import React, { useEffect, useRef } from 'react';

export interface TranscriptEntry {
  id: string;
  type: 'describe' | 'ask' | 'read_text';
  question?: string;
  answer: string;
  timestamp: Date;
}

interface TranscriptPanelProps {
  entries: TranscriptEntry[];
}

export function TranscriptPanel({ entries }: TranscriptPanelProps) {
  const bottomRef = useRef<HTMLDivElement>(null);
  const latestEntry = entries[entries.length - 1];

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [entries.length]);

  return (
    <div
      style={{
        background: 'var(--surface)',
        border: '1px solid var(--border)',
        borderRadius: 'var(--radius-lg)',
        padding: 24,
        display: 'flex',
        flexDirection: 'column',
        gap: 0,
      }}
    >
      <h2 style={{ fontWeight: 700, color: 'var(--text-muted)', marginBottom: 16, letterSpacing: '0.06em', textTransform: 'uppercase', fontSize: '0.75rem' }}>
        Live Transcript
      </h2>

      {/* Visually hidden live region — announces only newest entry */}
      <div
        aria-live="polite"
        aria-atomic="true"
        aria-label="Latest response"
        className="sr-only"
      >
        {latestEntry ? (
          latestEntry.type === 'ask'
            ? `You asked: ${latestEntry.question}. Answer: ${latestEntry.answer}`
            : `Scene description: ${latestEntry.answer}`
        ) : ''}
      </div>

      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          gap: 16,
          maxHeight: 320,
          overflowY: 'auto',
          paddingRight: 4,
        }}
        role="log"
        aria-label="Conversation transcript"
      >
        {entries.length === 0 ? (
          <p style={{ color: 'var(--text-faint)', textAlign: 'center', padding: '32px 0', fontStyle: 'italic' }}>
            Tap a button below to start describing your surroundings.
          </p>
        ) : (
          entries.map((entry, idx) => (
            <div
              key={entry.id}
              style={{
                animation: idx === entries.length - 1 ? 'fadeInUp 0.4s ease both' : 'none',
              }}
            >
              {entry.type === 'ask' && entry.question && (
                <div
                  style={{
                    display: 'flex',
                    justifyContent: 'flex-end',
                    marginBottom: 8,
                  }}
                >
                  <div
                    style={{
                      background: 'var(--teal-dim)',
                      border: '1px solid rgba(95,212,192,0.2)',
                      borderRadius: '16px 16px 4px 16px',
                      padding: '10px 16px',
                      maxWidth: '80%',
                      color: 'var(--teal)',
                      fontSize: '0.9rem',
                    }}
                  >
                    <span style={{ fontSize: '0.7rem', opacity: 0.7, display: 'block', marginBottom: 4 }}>You asked</span>
                    {entry.question}
                  </div>
                </div>
              )}
              <div style={{ display: 'flex', gap: 12, alignItems: 'flex-start' }}>
                <div
                  aria-hidden="true"
                  style={{
                    width: 32,
                    height: 32,
                    borderRadius: '50%',
                    background: entry.type === 'describe' ? 'var(--accent-dim)' : 'var(--teal-dim)',
                    border: `1.5px solid ${entry.type === 'describe' ? 'var(--accent)' : 'var(--teal)'}`,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '0.875rem',
                    flexShrink: 0,
                    marginTop: 2,
                  }}
                >
                  {entry.type === 'describe' ? '👁' : '💬'}
                </div>
                <div style={{ flex: 1 }}>
                  <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)', display: 'block', marginBottom: 4 }}>
                    {entry.type === 'describe' ? 'Scene Description' : 'Answer'} ·{' '}
                    {entry.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </span>
                  <p style={{ color: 'var(--text)', lineHeight: 1.6, fontSize: '0.95rem' }}>{entry.answer}</p>
                </div>
              </div>
            </div>
          ))
        )}
        <div ref={bottomRef} />
      </div>
    </div>
  );
}
