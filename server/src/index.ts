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

if (!process.env.JWT_SECRET) {
  process.env.JWT_SECRET = 'nura-dev-secret-change-in-production';
  console.warn('⚠  JWT_SECRET not set — using insecure default');
}

if (!process.env.OWM_API_KEY) {
  console.warn('⚠  OWM_API_KEY not set — weather endpoints will not work');
}

const PORT = Number(process.env.PORT ?? 3001);
const CLIENT_ORIGIN = process.env.CLIENT_ORIGIN ?? 'http://localhost:5173';

const app = express();
const server = http.createServer(app);

app.use(helmet({ contentSecurityPolicy: false })); // CSP disabled — client served separately
app.use(cors({ origin: CLIENT_ORIGIN, credentials: true }));
app.use(express.json());

const messageLimiter = rateLimit({
  windowMs: 60_000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many requests — try again in a minute' },
});
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

// Start (skipped when imported by tests)
if (process.env.VITEST !== 'true') {
  server.listen(PORT, () => {
    console.log(`\n  Nura Space API  →  http://localhost:${PORT}\n`);
  });
}

export { app, server };
