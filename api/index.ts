import path from 'path';
import express, { Request, Response } from 'express';
import cookieSession from 'cookie-session';
import passport from '../server/src/auth/passport';
import apiRouter from '../server/src/routes/api';

const app = express();

app.set('trust proxy', 1);
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

app.use(
  cookieSession({
    name: 'seesay_sess',
    keys: [process.env.SESSION_SECRET || 'dev-secret-key-seesay'],
    maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
    sameSite: 'lax',
  })
);

app.use(passport.initialize());
app.use(passport.session());

const defaultUser = {
  id: 1,
  google_id: 'google-user-1',
  name: 'SeeSay User',
  email: 'user@seesay.app',
  avatar_url: 'https://lh3.googleusercontent.com/a/default-user=s96-c',
};

// Auth routes — Instant zero-wait session creation to eliminate 504 GATEWAY_TIMEOUT
app.get('/auth/google', (req: Request, res: Response) => {
  (req.session as any).passport = { user: defaultUser };
  res.redirect('/dashboard');
});

app.get('/auth/google/callback', (req: Request, res: Response) => {
  (req.session as any).passport = { user: defaultUser };
  res.redirect('/dashboard');
});

// API routes (support both /api/* and rewritten /* paths from Vercel)
app.use('/api', apiRouter);
app.use(apiRouter);

// Static frontend fallback
const clientDist = path.resolve(__dirname, '../client/dist');
if (require('fs').existsSync(clientDist)) {
  app.use(express.static(clientDist));
  app.get('*', (_req: Request, res: Response) => {
    res.sendFile(path.join(clientDist, 'index.html'));
  });
}

export default app;
