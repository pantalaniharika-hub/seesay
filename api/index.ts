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

// Auth routes
app.get('/auth/google', passport.authenticate('google', { scope: ['profile', 'email'] }));

app.get(
  '/auth/google/callback',
  passport.authenticate('google', { failureRedirect: '/?error=auth_failed' }),
  (_req: Request, res: Response) => {
    res.redirect('/dashboard');
  }
);

// API routes
app.use('/api', apiRouter);

// Static frontend fallback
const clientDist = path.resolve(__dirname, '../client/dist');
if (require('fs').existsSync(clientDist)) {
  app.use(express.static(clientDist));
  app.get('*', (_req: Request, res: Response) => {
    res.sendFile(path.join(clientDist, 'index.html'));
  });
}

export default app;
