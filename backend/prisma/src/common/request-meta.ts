import { Request } from 'express';

export function requestClientMeta(req: Request): { ip?: string; userAgent?: string } {
  const rawUa = req.headers['user-agent'];
  const userAgent =
    rawUa === undefined ? undefined : Array.isArray(rawUa) ? rawUa.join(', ') : rawUa;
  const ip = typeof req.ip === 'string' ? req.ip : undefined;
  return { ip, userAgent };
}
