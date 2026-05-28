import { Router } from 'express';
import type { Response } from 'express';
import { z } from 'zod';
import { authenticate } from '../middleware/authenticate';
import { authorizeAdmin } from '../middleware/authorizeAdmin';
import { broadcastToCity } from '../socket';
import { addMessage, getRecentMessages } from '../services/messageService';
import type { AuthenticatedRequest, CityMessage } from '../types';

const router = Router();

const PushMessageSchema = z.object({
  city: z.string().trim().min(1, 'city is required').max(100),
  message: z.string().trim().min(1, 'message is required').max(500),
  severity: z.enum(['info', 'warning', 'critical']).default('info'),
});

router.post('/', authenticate, authorizeAdmin, (req: AuthenticatedRequest, res: Response): void => {
  const result = PushMessageSchema.safeParse(req.body);
  if (!result.success) {
    res.status(400).json({ error: result.error.issues[0].message });
    return;
  }

  const { city, message, severity } = result.data;
  const payload: CityMessage = {
    city,
    message,
    severity,
    timestamp: new Date().toISOString(),
  };

  addMessage(payload);
  const delivered = broadcastToCity(payload);
  res.json({ delivered, city, severity, timestamp: payload.timestamp });
});

// Admin only — fetch broadcast history for a city (last 10)
router.get(
  '/:city/history',
  authenticate,
  authorizeAdmin,
  (req: AuthenticatedRequest, res: Response): void => {
    const city = req.params.city?.trim();
    if (!city) {
      res.status(400).json({ error: 'city is required' });
      return;
    }
    const messages = getRecentMessages(city);
    res.json({ city, messages });
  },
);

export default router;
