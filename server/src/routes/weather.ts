import { Router } from 'express';
import type { Response } from 'express';
import axios from 'axios';
import { authenticate } from '../middleware/authenticate';
import { getWeatherByCity } from '../services/weatherService';
import type { AuthenticatedRequest } from '../types';

const router = Router();

router.get('/', authenticate, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  const city = (req.query.city as string)?.trim();

  if (!city) {
    res.status(400).json({ error: 'city query parameter is required' });
    return;
  }

  try {
    const data = await getWeatherByCity(city);
    res.json(data);
  } catch (err) {
    if (axios.isAxiosError(err)) {
      if (err.response?.status === 401) {
        res.status(503).json({
          error: 'One Call API 3.0 not activated — subscribe at openweathermap.org/subscriptions',
        });
      } else if (err.response?.status === 404) {
        res.status(404).json({ error: 'City not found' });
      } else {
        res.status(502).json({ error: 'Weather service unavailable' });
      }
    } else {
      const code = (err as { code?: string }).code;
      if (code === 'CITY_NOT_FOUND') {
        res.status(404).json({ error: 'City not found' });
      } else if (code === 'NO_API_KEY') {
        res.status(503).json({ error: 'Weather service is not configured' });
      } else {
        res.status(502).json({ error: 'Weather service unavailable' });
      }
    }
  }
});

export default router;
