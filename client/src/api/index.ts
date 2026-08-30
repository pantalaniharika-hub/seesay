const BASE = '';  // Same origin in prod; Vite proxy in dev

async function apiFetch<T>(path: string, options?: RequestInit): Promise<T> {
  const res = await fetch(`${BASE}${path}`, {
    credentials: 'include',
    cache: 'no-store',
    headers: {
      'Cache-Control': 'no-cache, no-store, must-revalidate',
      'Pragma': 'no-cache',
      'Expires': '0',
      ...(options?.headers || {}),
    },
    ...options,
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({ error: res.statusText }));
    throw new Error(body.error || `HTTP ${res.status}`);
  }
  return res.json() as Promise<T>;
}

export interface UserInfo {
  id: number;
  google_id: string;
  name: string;
  email: string | null;
  avatar_url: string | null;
}

export interface Stats {
  scansToday: number;
  questionsThisWeek: number;
  totalSessions: number;
}

export interface HistoryRow {
  query_id: number;
  type: string;
  question: string | null;
  answer: string;
  created_at: string;
  session_started_at: string;
}

export interface HistoryResponse {
  rows: HistoryRow[];
  total: number;
  page: number;
  totalPages: number;
}

export const api = {
  me: () => apiFetch<{ user: UserInfo }>('/api/me'),

  stats: () => apiFetch<Stats>('/api/stats'),

  history: (page = 1) => apiFetch<HistoryResponse>(`/api/history?page=${page}`),

  createSession: () => apiFetch<{ sessionId: number }>('/api/session', { method: 'POST' }),

  describe: (image: Blob, sessionId: number) => {
    const form = new FormData();
    form.append('image', image, 'frame.jpg');
    form.append('sessionId', String(sessionId));
    return apiFetch<{ answer: string }>('/api/describe', { method: 'POST', body: form });
  },

  ask: (question: string, sessionId: number, image?: Blob) => {
    const form = new FormData();
    form.append('question', question);
    form.append('sessionId', String(sessionId));
    if (image) form.append('image', image, 'frame.jpg');
    return apiFetch<{ answer: string }>('/api/ask', { method: 'POST', body: form });
  },

  readText: (image: Blob, sessionId: number) => {
    const form = new FormData();
    form.append('image', image, 'frame.jpg');
    form.append('sessionId', String(sessionId));
    return apiFetch<{ answer: string }>('/api/read-text', { method: 'POST', body: form });
  },

  color: (image: Blob, sessionId: number) => {
    const form = new FormData();
    form.append('image', image, 'frame.jpg');
    form.append('sessionId', String(sessionId));
    return apiFetch<{ answer: string }>('/api/color', { method: 'POST', body: form });
  },

  logout: () => apiFetch<{ ok: boolean }>('/api/logout', { method: 'POST' }),
};
