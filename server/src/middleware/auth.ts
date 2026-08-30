import { Request, Response, NextFunction } from 'express';

export function requireAuth(req: Request, res: Response, next: NextFunction): void {
  if (req.isAuthenticated && req.isAuthenticated()) {
    return next();
  }
  // Use req.originalUrl (full path like /api/me) not req.path (which is just /me inside a router)
  const isApiRoute = req.originalUrl.startsWith('/api/');
  if (isApiRoute) {
    res.status(401).json({ error: 'Not authenticated' });
  } else {
    res.redirect('/');
  }
}
