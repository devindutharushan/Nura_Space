import { Router } from 'express';
import type { Response } from 'express';
import { z } from 'zod';
import { authenticate } from '../middleware/authenticate';
import { searchLocations, getReverseGeocode } from '../services/locationService';
import type { AuthenticatedRequest } from '../types';

const router = Router();

router.get(
  '/search',
  authenticate,
  async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    const q = (req.query.q as string)?.trim();
    const parsed = z.string().min(1).max(100).safeParse(q);
    if (!parsed.success) {
      res.status(400).json({ error: 'q parameter is required (1-100 chars)' });
      return;
    }
    try {
      const results = await searchLocations(parsed.data);
      res.json({ results });
    } catch {
      res.status(502).json({ error: 'Geocoding service unavailable' });
    }
  },
);

router.get(
  '/nearby',
  authenticate,
  async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    const schema = z.object({
      lat: z.coerce.number().min(-90).max(90),
      lon: z.coerce.number().min(-180).max(180),
    });
    const parsed = schema.safeParse(req.query);
    if (!parsed.success) {
      res.status(400).json({ error: 'lat and lon query parameters are required' });
      return;
    }
    try {
      const nearest = await getReverseGeocode(parsed.data.lat, parsed.data.lon);
      res.json(nearest);
    } catch {
      res.status(502).json({ error: 'Reverse geocoding service unavailable' });
    }
  },
);

export default router;
