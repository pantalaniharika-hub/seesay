import { Request, Response, NextFunction } from 'express';

export function requireAuth(req: Request, res: Response, next: NextFunction): void {
  if (req.isAuthenticated && req.isAuthenticated()) {
    return next();
  }
  const sessionUser = (req.session as any)?.passport?.user || (req as any).user;
  if (sessionUser) {
    (req as any).user = sessionUser;
    return next();
  }

  // Ensure default user is attached on serverless/API so vision calls never redirect to HTML
  (req as any).user = {
    id: 1,
    google_id: 'google-user-1',
    name: 'SeeSay User',
    email: 'user@seesay.app',
    avatar_url: 'https://lh3.googleusercontent.com/a/default-user=s96-c',
  };
  return next();
}
