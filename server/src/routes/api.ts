import { Router, Request, Response } from 'express';
import multer from 'multer';
import Anthropic from '@anthropic-ai/sdk';
import { requireAuth } from '../middleware/auth';
import { getDb } from '../db';
import { User } from '../db';

const router = Router();
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 10 * 1024 * 1024 } });
const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
  defaultHeaders: process.env.ANTHROPIC_WORKSPACE_ID ? {
    'anthropic-workspace-id': process.env.ANTHROPIC_WORKSPACE_ID
  } : undefined
});

// Use the model from env (so you can override on Render) or fall back to claude-sonnet-4-5
const MODEL = process.env.CLAUDE_MODEL || 'claude-sonnet-4-5';

// Helper to get current user with full data
async function getFullUser(userId: number): Promise<User | null> {
  const db = await getDb();
  return null; // handled inline in routes
}

// ─── Gemini API Helpers (fallback if GEMINI_API_KEY is configured) ──────────
async function callGemini(imageBase64: string, mimeType: string, prompt: string): Promise<string> {
  const apiKey = process.env.GEMINI_API_KEY;
  const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`;
  const response = await (globalThis as any).fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      contents: [
        {
          parts: [
            { text: prompt },
            {
              inlineData: {
                mimeType: mimeType,
                data: imageBase64
              }
            }
          ]
        }
      ]
    })
  });
  if (!response.ok) {
    const errText = await response.text();
    throw new Error(`Gemini API error: ${response.status} ${errText}`);
  }
  const json = await response.json();
  const resText = json.candidates?.[0]?.content?.parts?.[0]?.text;
  if (!resText) throw new Error('No response text from Gemini');
  return resText;
}

async function callGeminiText(prompt: string): Promise<string> {
  const apiKey = process.env.GEMINI_API_KEY;
  const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`;
  const response = await (globalThis as any).fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      contents: [
        {
          parts: [
            { text: prompt }
          ]
        }
      ]
    })
  });
  if (!response.ok) {
    const errText = await response.text();
    throw new Error(`Gemini API error: ${response.status} ${errText}`);
  }
  const json = await response.json();
  const resText = json.candidates?.[0]?.content?.parts?.[0]?.text;
  if (!resText) throw new Error('No response text from Gemini');
  return resText;
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
    const prompt = 'You are a sight assistant for blind and low-vision users. Describe this scene in 2–3 concise, vivid sentences. Focus on what matters most: people, text, obstacles, objects of interest. Speak naturally as if talking to someone.';

    let answer: string;
    if (process.env.GEMINI_API_KEY) {
      answer = await callGemini(imageBase64, mediaType, prompt);
    } else {
      const message = await anthropic.messages.create({
        model: MODEL,
        max_tokens: 512,
        messages: [
          {
            role: 'user',
            content: [
              {
                type: 'image',
                source: { type: 'base64', media_type: mediaType, data: imageBase64 },
              },
              {
                type: 'text',
                text: prompt,
              },
            ],
          },
        ],
      });
      answer = (message.content[0] as { type: string; text: string }).text;
    }

    const db = await getDb();
    await db.createQuery({ session_id: parseInt(sessionId), type: 'describe', question: null, answer });

    res.json({ answer });
  } catch (err) {
    console.error('Describe error:', err);
    res.status(500).json({ error: 'Failed to describe image' });
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

    let answer: string;
    const prompt = `You are a sight assistant for blind and low-vision users. The user is looking at a scene and asks: "${question}". Answer concisely and helpfully in 1–3 sentences. Speak naturally.`;

    if (process.env.GEMINI_API_KEY) {
      if (req.file) {
        const imageBase64 = req.file.buffer.toString('base64');
        const mediaType = req.file.mimetype || 'image/jpeg';
        answer = await callGemini(imageBase64, mediaType, prompt);
      } else {
        answer = await callGeminiText(prompt);
      }
    } else {
      const contentParts: Anthropic.MessageParam['content'] = [];
      if (req.file) {
        const imageBase64 = req.file.buffer.toString('base64');
        const mediaType = (req.file.mimetype || 'image/jpeg') as 'image/jpeg' | 'image/png' | 'image/webp';
        contentParts.push({
          type: 'image',
          source: { type: 'base64', media_type: mediaType, data: imageBase64 },
        });
      }
      contentParts.push({
        type: 'text',
        text: prompt,
      });

      const message = await anthropic.messages.create({
        model: MODEL,
        max_tokens: 512,
        messages: [{ role: 'user', content: contentParts }],
      });
      answer = (message.content[0] as { type: string; text: string }).text;
    }

    const db = await getDb();
    await db.createQuery({ session_id: parseInt(sessionId), type: 'ask', question, answer });

    res.json({ answer });
  } catch (err) {
    console.error('Ask error:', err);
    res.status(500).json({ error: 'Failed to answer question' });
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
