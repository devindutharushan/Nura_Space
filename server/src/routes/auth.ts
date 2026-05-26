import { Router } from 'express';
import type { Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import type { StoredUser } from '../types';

export const USERS: StoredUser[] = [
  {
    id: 'usr_01',
    username: 'admin',
    passwordHash: bcrypt.hashSync('admin123', 10),
    displayName: 'Admin User',
    avatarInitials: 'AU',
  },
  {
    id: 'usr_02',
    username: 'demo',
    passwordHash: bcrypt.hashSync('password', 10),
    displayName: 'Demo Account',
    avatarInitials: 'DA',
  },
];

const router = Router();

router.post('/login', async (req: Request, res: Response): Promise<void> => {
  const { username, password } = req.body as { username?: string; password?: string };

  if (!username?.trim() || !password) {
    res.status(400).json({ error: 'Username and password are required' });
    return;
  }

  const user = USERS.find((u) => u.username === username.toLowerCase().trim());
  if (!user) {
    res.status(401).json({ error: 'Invalid credentials' });
    return;
  }

  const valid = await bcrypt.compare(password, user.passwordHash);
  if (!valid) {
    res.status(401).json({ error: 'Invalid credentials' });
    return;
  }

  const token = jwt.sign({ userId: user.id, username: user.username }, process.env.JWT_SECRET!, {
    expiresIn: '24h',
  });

  res.json({
    token,
    user: {
      id: user.id,
      username: user.username,
      displayName: user.displayName,
      avatarInitials: user.avatarInitials,
    },
  });
});

export default router;
