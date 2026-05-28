import 'dotenv/config';
import http from 'http';
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import authRouter from './routes/auth';
import weatherRouter from './routes/weather';
import messagesRouter from './routes/messages';
import locationsRouter from './routes/locations';
import { initSocket } from './socket';

// Fail fast in production if the signing key isn't configured — a missing
// secret would silently fall back to a known value and forge any session.
// In dev we accept a placeholder so the app boots without a .env on first clone.
if (!process.env.JWT_SECRET) {
  if (process.env.NODE_ENV === 'production') {
    throw new Error('JWT_SECRET must be set in production');
  }
  process.env.JWT_SECRET = 'q4m7R9xL8wP1Zy2N3bV5cT6jK0hG4vB9aD';
  console.warn('JWT_SECRET not set — using insecure default (dev only)');
}

if (!process.env.OWM_API_KEY) {
  console.warn('OWM_API_KEY not set — weather endpoints will not work');
}

const PORT = Number(process.env.PORT ?? 3001);
const CLIENT_ORIGIN = process.env.CLIENT_ORIGIN ?? 'http://localhost:5173';

const app = express();
const server = http.createServer(app);

app.use(helmet({ contentSecurityPolicy: false }));
app.use(cors({ origin: CLIENT_ORIGIN, credentials: true }));
app.use(express.json());

// Tighter cap on the broadcast endpoint: an admin token leaked or misused here
// would fan out to every connected socket, so the per-IP budget stays small.
const messageLimiter = rateLimit({
  windowMs: 60_000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many requests — try again in a minute' },
});
// Location search proxies upstream geocoders that publish their own fair-use
// policies. The 60/min budget keeps us comfortably below those quotas while
// still allowing per-keystroke search from a few concurrent users.
const locationLimiter = rateLimit({
  windowMs: 60_000,
  max: 60,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many requests — try again in a minute' },
});

app.get('/api/health', (_req, res) => res.json({ status: 'ok', ts: Date.now() }));
app.use('/api/auth', authRouter);
app.use('/api/weather', weatherRouter);
app.use('/api/messages', messageLimiter, messagesRouter);
app.use('/api/locations', locationLimiter, locationsRouter);

initSocket(server, CLIENT_ORIGIN);

if (process.env.VITEST !== 'true') {
  server.listen(PORT, () => {
    console.log(`Nura Space API listening on http://localhost:${PORT}`);
  });
}

export { app, server };
