import { Request, Response, NextFunction } from 'express';

export function requireAuth(req: Request, res: Response, next: NextFunction): void {
  if (req.isAuthenticated && req.isAuthenticated()) {
    return next();
  }
  // API routes → 401 JSON; page routes → redirect
  if (req.path.startsWith('/api/')) {
    res.status(401).json({ error: 'Not authenticated' });
  } else {
    res.redirect('/');
  }
}
