import { Router } from 'express';
import type { Response } from 'express';
import { z } from 'zod';
import { authenticate } from '../middleware/authenticate';
import { broadcastToCity } from '../socket';
import { addMessage } from '../services/messageService';
import type { AuthenticatedRequest, CityMessage } from '../types';

const router = Router();

const PushMessageSchema = z.object({
  city: z.string().trim().min(1, 'city is required').max(100),
  message: z.string().trim().min(1, 'message is required').max(500),
  severity: z.enum(['info', 'warning', 'critical']).default('info'),
});

router.post('/', authenticate, (req: AuthenticatedRequest, res: Response): void => {
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
  res.json({ delivered, city, severity });
});

export default router;
