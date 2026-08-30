import { createApp } from '../app';
import type { VercelRequest, VercelResponse } from '@vercel/node';

let appPromise: ReturnType<typeof createApp> | null = null;

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (!appPromise) {
    appPromise = createApp();
  }
  const app = await appPromise;
  return app(req as any, res as any);
}
