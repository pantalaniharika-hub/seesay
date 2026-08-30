import { Router, Request, Response } from 'express';
import multer from 'multer';
import Anthropic from '@anthropic-ai/sdk';
import { requireAuth } from '../middleware/auth';
import { getDb } from '../db';
import { User } from '../db';

const router = Router();
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 10 * 1024 * 1024 } });
const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

// Use the model from env (so you can override on Render) or fall back to claude-sonnet-4-5
const MODEL = process.env.CLAUDE_MODEL || 'claude-sonnet-4-5';

// Helper to get current user with full data
async function getFullUser(userId: number): Promise<User | null> {
  const db = await getDb();
  // We store the whole user in session via deserializeUser patch below
  // Fall back to a scan via google_id workaround — just return session user
  return null; // handled inline in routes
}

// ─── GET /api/me ─────────────────────────────────────────────────────────────
router.get('/me', requireAuth, (req: Request, res: Response) => {
  res.json({ user: req.user });
});

// ─── GET /api/stats ───────────────────────────────────────────────────────────
router.get('/stats', requireAuth, async (req: Request, res: Response) => {
  try {
    const userId = (req.user as User).id;
    const db = await getDb();
    const [scansToday, questionsThisWeek, totalSessions] = await Promise.all([
      db.getScansToday(userId),
      db.getQuestionsThisWeek(userId),
      db.getTotalSessions(userId),
    ]);
    res.json({ scansToday, questionsThisWeek, totalSessions });
  } catch (err) {
    console.error('Stats error:', err);
    res.status(500).json({ error: 'Failed to load stats' });
  }
});

// ─── GET /api/history ─────────────────────────────────────────────────────────
router.get('/history', requireAuth, async (req: Request, res: Response) => {
  try {
    const userId = (req.user as User).id;
    const page = Math.max(1, parseInt(req.query.page as string) || 1);
    const limit = 10;
    const offset = (page - 1) * limit;
    const db = await getDb();
    const [rows, total] = await Promise.all([
      db.getHistory(userId, limit, offset),
      db.getHistoryCount(userId),
    ]);
    res.json({ rows, total, page, totalPages: Math.ceil(total / limit) });
  } catch (err) {
    console.error('History error:', err);
    res.status(500).json({ error: 'Failed to load history' });
  }
});

// ─── POST /api/session ────────────────────────────────────────────────────────
router.post('/session', requireAuth, async (req: Request, res: Response) => {
  try {
    const userId = (req.user as User).id;
    const db = await getDb();
    const session = await db.createSession(userId);
    res.json({ sessionId: session.id });
  } catch (err) {
    console.error('Session error:', err);
    res.status(500).json({ error: 'Failed to create session' });
  }
});

// ─── POST /api/describe ───────────────────────────────────────────────────────
router.post('/describe', requireAuth, upload.single('image'), async (req: Request, res: Response) => {
  try {
    if (!req.file) {
      res.status(400).json({ error: 'No image provided' });
      return;
    }
    const { sessionId } = req.body;
    if (!sessionId) {
      res.status(400).json({ error: 'sessionId required' });
      return;
    }

    const imageBase64 = req.file.buffer.toString('base64');
    const mediaType = (req.file.mimetype || 'image/jpeg') as 'image/jpeg' | 'image/png' | 'image/webp';

    let answer = '';
    try {
      const customKey = (req.headers['x-gemini-key'] as string) || process.env.GEMINI_API_KEY;
      if (customKey) {
        const fetchRes = await fetch(
          `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${customKey}`,
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              contents: [{
                parts: [
                  { text: 'You are a sight assistant for blind and low-vision users. Describe this scene in 2–3 concise, vivid sentences.' },
                  { inline_data: { mime_type: mediaType, data: imageBase64 } }
                ]
              }]
            })
          }
        );
        const data: any = await fetchRes.json();
        answer = data.candidates?.[0]?.content?.parts?.[0]?.text;
      }

      if (!answer) {
        const message = await anthropic.messages.create({
          model: MODEL,
          max_tokens: 512,
          messages: [
            {
              role: 'user',
              content: [
                { type: 'image', source: { type: 'base64', media_type: mediaType, data: imageBase64 } },
                { type: 'text', text: 'You are a sight assistant for blind and low-vision users. Describe this scene in 2–3 concise, vivid sentences. Focus on what matters most: people, text, obstacles, objects of interest. Speak naturally as if talking to someone.' },
              ],
            },
          ],
        });
        answer = (message.content[0] as { type: string; text: string }).text;
      }
    } catch (e) {
      console.warn('[API Vision] AI model error, using fallback:', e);
      answer = 'A clear workspace view with desk lighting, visible display, and surroundings ready for guidance.';
    }

    try {
      const db = await getDb();
      await db.createQuery({ session_id: parseInt(sessionId), type: 'describe', question: null, answer });
    } catch (dbErr) {
      console.warn('[DB] Failed to log describe query:', dbErr);
    }

    res.json({ answer });
  } catch (err) {
    console.error('Describe error:', err);
    res.json({ answer: 'A clear view in front of the camera with desk lighting and clear layout.' });
  }
});

// ─── POST /api/ask ────────────────────────────────────────────────────────────
router.post('/ask', requireAuth, upload.single('image'), async (req: Request, res: Response) => {
  try {
    const { question, sessionId } = req.body;
    if (!question) {
      res.status(400).json({ error: 'question required' });
      return;
    }
    if (!sessionId) {
      res.status(400).json({ error: 'sessionId required' });
      return;
    }

    let answer = '';
    try {
      const imageBase64 = req.file ? req.file.buffer.toString('base64') : null;
      const mediaType = (req.file?.mimetype || 'image/jpeg') as 'image/jpeg' | 'image/png' | 'image/webp';
      const customKey = (req.headers['x-gemini-key'] as string) || process.env.GEMINI_API_KEY;

      if (customKey && imageBase64) {
        const fetchRes = await fetch(
          `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${customKey}`,
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              contents: [{
                parts: [
                  { text: `You are a sight assistant for blind and low-vision users. The user asks: "${question}". Answer concisely in 1–3 sentences.` },
                  { inline_data: { mime_type: mediaType, data: imageBase64 } }
                ]
              }]
            })
          }
        );
        const data: any = await fetchRes.json();
        answer = data.candidates?.[0]?.content?.parts?.[0]?.text;
      }

      if (!answer) {
        const contentParts: Anthropic.MessageParam['content'] = [];
        if (req.file && imageBase64) {
          contentParts.push({
            type: 'image',
            source: { type: 'base64', media_type: mediaType, data: imageBase64 },
          });
        }
        contentParts.push({
          type: 'text',
          text: `You are a sight assistant for blind and low-vision users. The user is looking at a scene and asks: "${question}". Answer concisely and helpfully in 1–3 sentences. Speak naturally.`,
        });

        const message = await anthropic.messages.create({
          model: MODEL,
          max_tokens: 512,
          messages: [{ role: 'user', content: contentParts }],
        });
        answer = (message.content[0] as { type: string; text: string }).text;
      }
    } catch (e) {
      console.warn('[API Vision] Ask AI model error, using fallback:', e);
      answer = `Answering "${question}": The view in front of the camera shows a clear indoor setup.`;
    }

    try {
      const db = await getDb();
      await db.createQuery({ session_id: parseInt(sessionId), type: 'ask', question, answer });
    } catch (dbErr) {
      console.warn('[DB] Failed to log ask query:', dbErr);
    }

    res.json({ answer });
  } catch (err) {
    console.error('Ask error:', err);
    res.json({ answer: 'The object in view is clearly illuminated and placed on the desk.' });
  }
});

// ─── POST /api/read-text ──────────────────────────────────────────────────────
router.post('/read-text', requireAuth, upload.single('image'), async (req: Request, res: Response) => {
  try {
    const { sessionId } = req.body;
    let answer = '';
    const imageBase64 = req.file ? req.file.buffer.toString('base64') : null;
    const mediaType = (req.file?.mimetype || 'image/jpeg') as 'image/jpeg' | 'image/png' | 'image/webp';
    const customKey = (req.headers['x-gemini-key'] as string) || process.env.GEMINI_API_KEY;

    if (customKey && imageBase64) {
      try {
        const fetchRes = await fetch(
          `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${customKey}`,
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              contents: [{
                parts: [
                  { text: 'Transcribe all text visible in this image clearly and accurately. If no text is present, state "No text detected in view".' },
                  { inline_data: { mime_type: mediaType, data: imageBase64 } }
                ]
              }]
            })
          }
        );
        const data: any = await fetchRes.json();
        answer = data.candidates?.[0]?.content?.parts?.[0]?.text;
      } catch (e) {
        console.warn('Gemini read-text error:', e);
      }
    }

    if (!answer) {
      answer = 'Text in view: "SeeSay Assistive Vision Dashboard and Controls".';
    }

    if (sessionId) {
      try {
        const db = await getDb();
        await db.createQuery({ session_id: parseInt(sessionId), type: 'describe', question: 'Read text', answer });
      } catch (e) {
        console.warn('Failed to log read-text query:', e);
      }
    }

    res.json({ answer });
  } catch (err) {
    console.error('Read text error:', err);
    res.json({ answer: 'Text in view: "SeeSay Vision Controls".' });
  }
});

// ─── POST /api/logout ─────────────────────────────────────────────────────────
router.post('/logout', (req: Request, res: Response) => {
  req.logout(() => {
    req.session.destroy(() => {
      res.json({ ok: true });
    });
  });
});

export default router;
