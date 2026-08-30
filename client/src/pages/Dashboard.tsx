import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useAuth } from '../hooks/useAuth';
import { useCamera } from '../hooks/useCamera';
import { useSpeech } from '../hooks/useSpeech';
import { StatCard } from '../components/StatCard';
import { StatusPill } from '../components/StatusPill';
import type { AppStatus } from '../components/StatusPill';
import { TranscriptPanel } from '../components/TranscriptPanel';
import type { TranscriptEntry } from '../components/TranscriptPanel';
import { api } from '../api';
import type { Stats, HistoryRow } from '../api';

export function Dashboard() {
  const { user } = useAuth();
  const videoRef = useRef<HTMLVideoElement>(null);
  const { ready: cameraReady, error: cameraError, startCamera, captureFrame } = useCamera(videoRef);
  const { speak, stopSpeaking, listen } = useSpeech();

  const [status, setStatus] = useState<AppStatus>('ready');
  const [debugCaptureUrl, setDebugCaptureUrl] = useState<string | null>(null);
  const [stats, setStats] = useState<Stats>(() => {
    try {
      const saved = localStorage.getItem('seesay_stats');
      if (saved) return JSON.parse(saved);
    } catch {}
    return { scansToday: 1, questionsThisWeek: 1, totalSessions: 1 };
  });
  const [transcript, setTranscript] = useState<TranscriptEntry[]>([]);
  const [sessionId, setSessionId] = useState<number | null>(null);
  const [history, setHistory] = useState<HistoryRow[]>(() => {
    try {
      const saved = localStorage.getItem('seesay_history');
      if (saved) return JSON.parse(saved);
    } catch {}
    return [];
  });
  const [historyPage, setHistoryPage] = useState(1);
  const [historyTotal, setHistoryTotal] = useState(0);
  const [historyTotalPages, setHistoryTotalPages] = useState(1);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [customName, setCustomName] = useState<string>(() => {
    try {
      const saved = localStorage.getItem('seesay_display_name');
      if (saved) return saved;
    } catch {}
    return '';
  });

  const updateDebugPreview = (frame: Blob | null) => {
    if (frame) {
      try {
        const url = URL.createObjectURL(frame);
        setDebugCaptureUrl(url);
      } catch {}
    }
  };

  const appendHistoryRow = useCallback((type: string, question: string | null, answer: string) => {
    const newRow: HistoryRow = {
      query_id: Date.now() + Math.floor(Math.random() * 1000),
      type,
      question,
      answer,
      created_at: new Date().toISOString(),
      session_started_at: new Date().toISOString(),
    };
    setHistory(prev => {
      const updated = [newRow, ...prev.filter(r => r.query_id !== newRow.query_id)];
      try { localStorage.setItem('seesay_history', JSON.stringify(updated)); } catch {}
      return updated;
    });
    setHistoryTotal(t => t + 1);
  }, []);

  const incrementStats = useCallback((isQuestion = false) => {
    setStats(prev => {
      const next = {
        scansToday: (prev?.scansToday ?? 0) + 1,
        questionsThisWeek: (prev?.questionsThisWeek ?? 0) + (isQuestion ? 1 : 0),
        totalSessions: Math.max(1, prev?.totalSessions ?? 1),
      };
      try { localStorage.setItem('seesay_stats', JSON.stringify(next)); } catch {}
      return next;
    });
  }, []);

  // ─── Init ──────────────────────────────────────────────────────────────────
  useEffect(() => {
    startCamera();
    // Create a new session
    api.createSession()
      .then(r => setSessionId(r.sessionId))
      .catch(console.error);
    // Load stats from server and merge with local
    api.stats()
      .then(s => {
        if (s) {
          setStats(prev => {
            const next = {
              scansToday: Math.max(prev?.scansToday || 0, s.scansToday || 0),
              questionsThisWeek: Math.max(prev?.questionsThisWeek || 0, s.questionsThisWeek || 0),
              totalSessions: Math.max(prev?.totalSessions || 1, s.totalSessions || 1),
            };
            try { localStorage.setItem('seesay_stats', JSON.stringify(next)); } catch {}
            return next;
          });
        }
      })
      .catch(console.error);
    // Load history
    loadHistory(1);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const loadHistory = useCallback(async (page: number) => {
    setHistoryLoading(true);
    try {
      const r = await api.history(page);
      setHistory(prev => {
        const seen = new Set(r.rows.map(x => x.query_id));
        const merged = [...r.rows, ...prev.filter(x => !seen.has(x.query_id))];
        try { localStorage.setItem('seesay_history', JSON.stringify(merged)); } catch {}
        return merged;
      });
      setHistoryPage(r.page);
      setHistoryTotal(prevTotal => Math.max(prevTotal, r.total));
      setHistoryTotalPages(r.totalPages);
    } catch {}
    setHistoryLoading(false);
  }, []);

  // ─── Describe ─────────────────────────────────────────────────────────────
  const handleDescribe = useCallback(async () => {
    if (status !== 'ready') return;
    stopSpeaking();
    setStatus('looking');
    setError(null);
    try {
      const activeSessionId = sessionId || Date.now();
      const frame = await captureFrame();
      if (!frame) throw new Error('Could not capture camera frame');
      updateDebugPreview(frame);
      const { answer } = await api.describe(frame, activeSessionId);
      setTranscript(prev => [...prev, {
        id: crypto.randomUUID(),
        type: 'describe',
        answer,
        timestamp: new Date(),
      }]);
      appendHistoryRow('describe', null, answer);
      setStatus('speaking');
      speak(answer, () => setStatus('ready'));
      incrementStats(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to describe scene');
      setStatus('ready');
    }
  }, [status, sessionId, captureFrame, speak, stopSpeaking, incrementStats, appendHistoryRow]);

  // ─── Read Text ────────────────────────────────────────────────────────────
  const handleReadText = useCallback(async () => {
    if (status !== 'ready') return;
    stopSpeaking();
    setStatus('looking');
    setError(null);
    try {
      const activeSessionId = sessionId || Date.now();
      const frame = await captureFrame();
      if (!frame) throw new Error('Could not capture camera frame');
      updateDebugPreview(frame);
      const { answer } = await api.readText(frame, activeSessionId);
      setTranscript(prev => [...prev, {
        id: crypto.randomUUID(),
        type: 'read_text',
        answer,
        timestamp: new Date(),
      }]);
      appendHistoryRow('read_text', null, answer);
      setStatus('speaking');
      speak(answer, () => setStatus('ready'));
      incrementStats(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to read text');
      setStatus('ready');
    }
  }, [status, sessionId, captureFrame, speak, stopSpeaking, incrementStats, appendHistoryRow]);

  // ─── Ask ──────────────────────────────────────────────────────────────────
  const executeAsk = useCallback(async (userQuery: string) => {
    setStatus('looking');
    try {
      const activeSessionId = sessionId || Date.now();
      const frame = await captureFrame();
      updateDebugPreview(frame);
      const { answer } = await api.ask(userQuery, activeSessionId, frame ?? undefined);
      setTranscript(prev => [...prev, {
        id: crypto.randomUUID(),
        type: 'ask',
        question: userQuery,
        answer,
        timestamp: new Date(),
      }]);
      appendHistoryRow('ask', userQuery, answer);
      setStatus('speaking');
      speak(answer, () => setStatus('ready'));
      incrementStats(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to answer question');
      setStatus('ready');
    }
  }, [sessionId, captureFrame, speak, incrementStats, appendHistoryRow]);

  const handleAsk = useCallback(() => {
    if (status !== 'ready') return;
    stopSpeaking();
    setStatus('listening');
    setError(null);

    const stop = listen(
      (userQuery) => {
        executeAsk(userQuery);
      },
      (_errMsg) => {
        const manualQuery = window.prompt("Ask SeeSay a question about what the camera sees:", "What do you see?");
        if (manualQuery && manualQuery.trim()) {
          executeAsk(manualQuery.trim());
        } else {
          setStatus('ready');
        }
      }
    );

    return stop;
  }, [status, listen, executeAsk, stopSpeaking]);

  // ─── Color ────────────────────────────────────────────────────────────────
  const handleColor = useCallback(async () => {
    if (status !== 'ready') return;
    stopSpeaking();
    setStatus('looking');
    setError(null);
    try {
      const activeSessionId = sessionId || Date.now();
      const frame = await captureFrame();
      if (!frame) throw new Error('Could not capture camera frame');
      updateDebugPreview(frame);
      const { answer } = await api.color(frame, activeSessionId);
      setTranscript(prev => [...prev, {
        id: crypto.randomUUID(),
        type: 'ask',
        question: 'What color is this?',
        answer,
        timestamp: new Date(),
      }]);
      appendHistoryRow('color', 'What color is this?', answer);
      setStatus('speaking');
      speak(answer, () => setStatus('ready'));
      incrementStats(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to identify color');
      setStatus('ready');
    }
  }, [status, sessionId, captureFrame, speak, stopSpeaking, incrementStats, appendHistoryRow]);

  // ─── Sign out ─────────────────────────────────────────────────────────────
  const handleSignOut = useCallback(async () => {
    await api.logout().catch(console.error);
    window.location.href = '/';
  }, []);

  const [historyFilter, setHistoryFilter] = useState<'all' | 'describe' | 'read_text' | 'ask' | 'color'>('all');
  const [historySearch, setHistorySearch] = useState('');

  const displayName = customName || (user?.name && user.name !== 'SeeSay User' ? user.name : 'Pantala Niharika');
  const firstName = displayName.split(' ')[0] || 'Pantala';

  const filteredHistory = history.filter(row => {
    if (historyFilter !== 'all' && row.type !== historyFilter) return false;
    if (historySearch.trim()) {
      const q = historySearch.toLowerCase();
      return (row.question && row.question.toLowerCase().includes(q)) ||
             (row.answer && row.answer.toLowerCase().includes(q));
    }
    return true;
  });

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg)', display: 'flex', flexDirection: 'column' }}>
      {/* ─── Top Bar ────────────────────────────────────────────────────── */}
      <header
        style={{
          background: 'var(--surface)',
          borderBottom: '1px solid var(--border)',
          padding: '0 24px',
          height: 64,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          position: 'sticky',
          top: 0,
          zIndex: 50,
        }}
        role="banner"
      >
        {/* Wordmark */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div
            style={{
              width: 32,
              height: 32,
              borderRadius: 8,
              background: 'var(--accent)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '1rem',
            }}
            aria-hidden="true"
          >
            👁
          </div>
          <span style={{ fontSize: '1.1rem', fontWeight: 700 }}>
            See<span style={{ color: 'var(--accent)' }}>Say</span>
          </span>
        </div>

        {/* User profile */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 10,
              padding: '4px 12px 4px 6px',
              borderRadius: 24,
              background: 'var(--surface-raised, rgba(255,255,255,0.06))',
              border: '1px solid var(--border)',
            }}
          >
            {user?.avatar_url ? (
              <img
                src={user.avatar_url}
                alt={`${displayName}'s avatar`}
                style={{ width: 32, height: 32, borderRadius: '50%', border: '1.5px solid var(--accent)' }}
              />
            ) : (
              <div
                style={{
                  width: 32,
                  height: 32,
                  borderRadius: '50%',
                  background: 'var(--accent)',
                  color: '#000',
                  fontWeight: 700,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '0.9rem',
                }}
              >
                {displayName.charAt(0).toUpperCase()}
              </div>
            )}
            <div style={{ display: 'flex', flexDirection: 'column', textAlign: 'left', lineHeight: 1.2 }}>
              <span style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--text)' }} id="user-name-display">
                {displayName}
              </span>
              <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>
                {user?.email || 'pantalaniharika@gmail.com'}
              </span>
            </div>
          </div>

          <a
            href="/auth/google"
            className="btn btn-secondary"
            style={{ padding: '6px 12px', minHeight: 32, fontSize: '0.78rem', textDecoration: 'none', display: 'flex', alignItems: 'center', gap: 6 }}
            title="Switch or sign in with Google Account"
          >
            <span>Google</span>
          </a>

          <button
            id="sign-out-btn"
            className="btn btn-ghost"
            onClick={handleSignOut}
            style={{ padding: '6px 12px', minHeight: 32, fontSize: '0.78rem' }}
            aria-label="Sign out"
          >
            Sign out
          </button>
        </div>
      </header>

      <main style={{ flex: 1, padding: '32px 24px', maxWidth: 900, margin: '0 auto', width: '100%' }}>
        {/* ─── Greeting ────────────────────────────────────────────────── */}
        <div style={{ marginBottom: 32 }}>
          <h1 style={{ fontSize: 'clamp(1.6rem, 3vw, 2rem)', fontWeight: 700, marginBottom: 4 }}>
            Welcome back, <span style={{ color: 'var(--accent)' }}>{displayName}</span>
            <button
              onClick={() => {
                const newName = window.prompt("Enter your Google / preferred name to display:", displayName);
                if (newName && newName.trim()) {
                  setCustomName(newName.trim());
                  try { localStorage.setItem('seesay_display_name', newName.trim()); } catch {}
                }
              }}
              style={{
                background: 'none',
                border: 'none',
                cursor: 'pointer',
                fontSize: '1rem',
                marginLeft: 8,
                opacity: 0.6,
              }}
              title="Click to edit name"
              aria-label="Edit display name"
            >
              ✏️
            </button>
          </h1>
          <p style={{ color: 'var(--text-muted)' }}>
            {cameraError
              ? '⚠️ Camera unavailable — check browser permissions.'
              : cameraReady
              ? 'Camera is active (Back / World). Tap a feature below.'
              : 'Activating camera…'}
          </p>
        </div>

        {/* ─── Stat Cards ──────────────────────────────────────────────── */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
            gap: 16,
            marginBottom: 32,
          }}
          aria-label="Usage statistics"
        >
          <StatCard label="Scans today"          value={stats?.scansToday ?? null}          icon="📷" accent="amber"  />
          <StatCard label="Questions this week"  value={stats?.questionsThisWeek ?? null}   icon="🎙" accent="teal"   />
          <StatCard label="Total sessions"       value={stats?.totalSessions ?? null}        icon="📊" accent="purple" />
        </div>

        {/* ─── Camera + Controls ───────────────────────────────────────── */}
        <div
          className="card"
          style={{ padding: 0, overflow: 'hidden', marginBottom: 24 }}
          aria-label="Camera viewfinder and controls"
        >
          {/* Camera preview */}
          <div
            style={{
              position: 'relative',
              background: '#000',
              aspectRatio: '16/9',
              maxHeight: 360,
              overflow: 'hidden',
            }}
          >
            <video
              ref={videoRef}
              id="camera-preview"
              autoPlay
              playsInline
              muted
              style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
              aria-label="Live camera feed"
            />
            {/* Viewfinder corners */}
            {[
              { top: 16, left: 16, borderTop: '2.5px solid var(--accent)', borderLeft: '2.5px solid var(--accent)', borderTopLeftRadius: 4 },
              { top: 16, right: 16, borderTop: '2.5px solid var(--accent)', borderRight: '2.5px solid var(--accent)', borderTopRightRadius: 4 },
              { bottom: 16, left: 16, borderBottom: '2.5px solid var(--accent)', borderLeft: '2.5px solid var(--accent)', borderBottomLeftRadius: 4 },
              { bottom: 16, right: 16, borderBottom: '2.5px solid var(--accent)', borderRight: '2.5px solid var(--accent)', borderBottomRightRadius: 4 },
            ].map((s, i) => (
              <div key={i} aria-hidden="true" style={{ position: 'absolute', width: 24, height: 24, ...s }} />
            ))}

            {/* Status pill */}
            <div style={{ position: 'absolute', top: 16, left: '50%', transform: 'translateX(-50%)' }}>
              <StatusPill status={status} />
            </div>

            {/* Camera error overlay */}
            {cameraError && (
              <div
                style={{
                  position: 'absolute',
                  inset: 0,
                  background: 'rgba(18,21,26,0.9)',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 12,
                  padding: 24,
                  textAlign: 'center',
                }}
                role="alert"
              >
                <span style={{ fontSize: '2rem' }} aria-hidden="true">📷</span>
                <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>
                  Camera access denied. Please allow camera permission and refresh.
                </p>
              </div>
            )}
          </div>

          {/* Debug Captured Frame Thumbnail (FIX 1) */}
          {debugCaptureUrl && (
            <div
              style={{
                padding: '8px 16px',
                background: 'rgba(0,0,0,0.65)',
                borderTop: '1px solid var(--border)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <span style={{ fontSize: '0.75rem', color: '#ffb627', fontWeight: 600 }}>📷 Live Frame Preview:</span>
                <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>Fresh frame captured & sent to API</span>
              </div>
              <img
                src={debugCaptureUrl}
                alt="Captured frame thumbnail preview"
                style={{ height: 44, borderRadius: 4, border: '1.5px solid #ffb627' }}
              />
            </div>
          )}

          {/* Error banner */}
          {error && (
            <div
              role="alert"
              style={{
                background: 'rgba(255,107,107,0.1)',
                borderTop: '1px solid rgba(255,107,107,0.2)',
                padding: '12px 24px',
                color: 'var(--danger)',
                fontSize: '0.9rem',
              }}
            >
              ⚠️ {error}
            </div>
          )}

          {/* Action buttons */}
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(120px, 1fr))',
              gap: 0,
            }}
          >
            <button
              id="describe-btn"
              className="btn btn-large btn-primary"
              onClick={handleDescribe}
              disabled={status !== 'ready'}
              aria-label="Describe what the camera sees"
              style={{
                borderRadius: 0,
                borderTop: '1px solid rgba(255,182,39,0.2)',
                borderRight: '1px solid var(--border)',
                opacity: status !== 'ready' ? 0.6 : 1,
                cursor: status !== 'ready' ? 'not-allowed' : 'pointer',
              }}
            >
              👁 Describe
            </button>
            <button
              id="read-text-btn"
              className="btn btn-large btn-secondary"
              onClick={handleReadText}
              disabled={status !== 'ready'}
              aria-label="Read text in front of camera"
              style={{
                borderRadius: 0,
                borderTop: '1px solid rgba(153,102,255,0.2)',
                borderRight: '1px solid var(--border)',
                background: 'rgba(153,102,255,0.15)',
                color: '#b388ff',
                opacity: status !== 'ready' ? 0.6 : 1,
                cursor: status !== 'ready' ? 'not-allowed' : 'pointer',
              }}
            >
              📄 Read Text
            </button>
            <button
              id="ask-btn"
              className="btn btn-large btn-teal"
              onClick={handleAsk}
              disabled={status !== 'ready'}
              aria-label="Ask a question about what the camera sees"
              style={{
                borderRadius: 0,
                borderTop: '1px solid rgba(95,212,192,0.2)',
                borderRight: '1px solid var(--border)',
                opacity: status !== 'ready' ? 0.6 : 1,
                cursor: status !== 'ready' ? 'not-allowed' : 'pointer',
              }}
            >
              🎙 Ask Question
            </button>
            <button
              id="color-btn"
              className="btn btn-large btn-secondary"
              onClick={handleColor}
              disabled={status !== 'ready'}
              aria-label="Identify colors of object in camera view"
              style={{
                borderRadius: 0,
                borderTop: '1px solid rgba(255,102,178,0.2)',
                background: 'rgba(255,102,178,0.15)',
                color: '#ff66b2',
                opacity: status !== 'ready' ? 0.6 : 1,
                cursor: status !== 'ready' ? 'not-allowed' : 'pointer',
              }}
            >
              🎨 What Color?
            </button>
          </div>
        </div>

        {/* ─── Transcript ──────────────────────────────────────────────── */}
        <div style={{ marginBottom: 32 }}>
          <TranscriptPanel entries={transcript} />
        </div>

        {/* ─── History ─────────────────────────────────────────────────── */}
        <section aria-labelledby="history-heading">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
            <h2 id="history-heading" style={{ fontSize: '1.25rem', fontWeight: 800, display: 'flex', alignItems: 'center', gap: 8 }}>
              📖 History & Query Logs
            </h2>
            <button
              className="btn btn-ghost"
              onClick={() => loadHistory(historyPage)}
              style={{ padding: '6px 12px', minHeight: 32, fontSize: '0.8rem' }}
              aria-label="Refresh history"
            >
              ↺ Refresh
            </button>
          </div>

          {/* Search bar */}
          <div style={{ marginBottom: 12 }}>
            <input
              type="text"
              className="input"
              placeholder="Search history by keyword..."
              value={historySearch}
              onChange={e => setHistorySearch(e.target.value)}
              style={{ width: '100%', padding: '10px 14px', borderRadius: 10, background: 'var(--surface)', border: '1px solid var(--border)', color: 'var(--text)' }}
            />
          </div>

          {/* Filter Tabs */}
          <div style={{ display: 'flex', gap: 8, overflowX: 'auto', paddingBottom: 8, marginBottom: 16 }}>
            {[
              { label: 'All', value: 'all' },
              { label: 'Describe', value: 'describe' },
              { label: 'Read Text', value: 'read_text' },
              { label: 'Ask', value: 'ask' },
              { label: 'Color', value: 'color' },
            ].map(tab => (
              <button
                key={tab.value}
                className={`btn ${historyFilter === tab.value ? 'btn-primary' : 'btn-ghost'}`}
                onClick={() => setHistoryFilter(tab.value as any)}
                style={{
                  padding: '6px 14px',
                  fontSize: '0.85rem',
                  borderRadius: 8,
                  background: historyFilter === tab.value ? 'var(--accent)' : 'transparent',
                  color: historyFilter === tab.value ? '#000' : 'var(--text-muted)',
                  border: historyFilter === tab.value ? 'none' : '1px solid var(--border)',
                }}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {historyLoading ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {[1,2,3].map(i => (
                <div key={i} className="skeleton" style={{ height: 72, borderRadius: 'var(--radius)' }} />
              ))}
            </div>
          ) : filteredHistory.length === 0 ? (
            <div
              className="card"
              style={{ textAlign: 'center', padding: '40px 24px', color: 'var(--text-muted)' }}
            >
              <p style={{ margin: 0, fontSize: '0.95rem' }}>No history records found for this filter.</p>
            </div>
          ) : (
            <>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                {filteredHistory.map(row => (
                  <div
                    key={row.query_id}
                    className="card"
                    style={{ padding: '16px 20px', display: 'flex', gap: 16, alignItems: 'flex-start' }}
                  >
                    <div
                      style={{
                        width: 36,
                        height: 36,
                        borderRadius: 10,
                        background: row.type === 'describe' ? 'var(--accent-dim)' : 'var(--teal-dim)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: '1rem',
                        flexShrink: 0,
                      }}
                      aria-hidden="true"
                    >
                      {row.type === 'describe' ? '👁' : '💬'}
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      {row.type === 'ask' && row.question && (
                        <p style={{ fontSize: '0.8rem', color: 'var(--teal)', marginBottom: 4, fontWeight: 600 }}>
                          Q: {row.question}
                        </p>
                      )}
                      <p
                        style={{
                          color: 'var(--text)',
                          fontSize: '0.9rem',
                          lineHeight: 1.5,
                          overflow: 'hidden',
                          display: '-webkit-box',
                          WebkitLineClamp: 2,
                          WebkitBoxOrient: 'vertical',
                        }}
                      >
                        {row.answer}
                      </p>
                      <p style={{ fontSize: '0.75rem', color: 'var(--text-faint)', marginTop: 6 }}>
                        {new Date(row.created_at).toLocaleString()}
                      </p>
                    </div>
                  </div>
                ))}
              </div>

              {/* Pagination */}
              {historyTotalPages > 1 && (
                <div
                  style={{ display: 'flex', justifyContent: 'center', gap: 12, marginTop: 20 }}
                  aria-label="History pagination"
                >
                  <button
                    className="btn btn-ghost"
                    onClick={() => loadHistory(historyPage - 1)}
                    disabled={historyPage <= 1}
                    style={{ padding: '8px 20px', minHeight: 40 }}
                    aria-label="Previous page of history"
                  >
                    ← Prev
                  </button>
                  <span style={{ display: 'flex', alignItems: 'center', color: 'var(--text-muted)', fontSize: '0.9rem' }}>
                    {historyPage} / {historyTotalPages}
                  </span>
                  <button
                    className="btn btn-ghost"
                    onClick={() => loadHistory(historyPage + 1)}
                    disabled={historyPage >= historyTotalPages}
                    style={{ padding: '8px 20px', minHeight: 40 }}
                    aria-label="Next page of history"
                  >
                    Next →
                  </button>
                </div>
              )}
              <p style={{ textAlign: 'center', color: 'var(--text-faint)', fontSize: '0.8rem', marginTop: 12 }}>
                {historyTotal} total exchange{historyTotal !== 1 ? 's' : ''}
              </p>
            </>
          )}
        </section>
      </main>
    </div>
  );
}
