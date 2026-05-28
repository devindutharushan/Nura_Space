import type { Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import type { AuthenticatedRequest, JwtPayload } from '../types';

/**
 * Verifies the bearer JWT and attaches the resolved identity to `req.user`.
 *
 * `algorithms` is pinned to HS256 to defeat the classic `alg: none` and
 * algorithm-confusion attacks where a forged header tricks the library into
 * skipping signature verification. We never echo the underlying jwt error to
 * the client — leaking "malformed" vs "expired" vs "bad signature" hands an
 * attacker a free oracle while telling a legitimate user nothing useful.
 */
export function authenticate(req: AuthenticatedRequest, res: Response, next: NextFunction): void {
  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith('Bearer ')) {
    res.status(401).json({ error: 'Unauthorized' });
    return;
  }

  const token = authHeader.slice(7);
  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET!, {
      algorithms: ['HS256'],
    }) as JwtPayload;
    req.user = { userId: payload.userId, username: payload.username, role: payload.role };
    next();
  } catch {
    res.status(401).json({ error: 'Invalid or expired token' });
  }
}
