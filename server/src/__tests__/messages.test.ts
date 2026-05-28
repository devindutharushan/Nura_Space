import { describe, it, expect } from 'vitest';
import request from 'supertest';
import { app } from '../index';

async function getAdminToken() {
  const res = await request(app)
    .post('/api/auth/login')
    .send({ username: 'admin', password: 'admin123' });
  return res.body.token as string;
}

async function getDemoToken() {
  const res = await request(app)
    .post('/api/auth/login')
    .send({ username: 'demo', password: 'password' });
  return res.body.token as string;
}

describe('POST /api/messages', () => {
  // Auth enforcement at the broadcast endpoint is load-bearing — without it,
  // an unauthenticated caller could fan a message out to every connected
  // socket. The 401/403 tests below pin that contract.
  it('returns 401 without a token', async () => {
    const res = await request(app)
      .post('/api/messages')
      .send({ city: 'Melbourne', message: 'Test' });
    expect(res.status).toBe(401);
  });

  it('returns 403 for a non-admin user', async () => {
    const token = await getDemoToken();
    const res = await request(app)
      .post('/api/messages')
      .set('Authorization', `Bearer ${token}`)
      .send({ city: 'Melbourne', message: 'Test' });
    expect(res.status).toBe(403);
  });

  it('returns 400 when city is missing', async () => {
    const token = await getAdminToken();
    const res = await request(app)
      .post('/api/messages')
      .set('Authorization', `Bearer ${token}`)
      .send({ message: 'Test' });
    expect(res.status).toBe(400);
  });

  it('returns 400 when message is missing', async () => {
    const token = await getAdminToken();
    const res = await request(app)
      .post('/api/messages')
      .set('Authorization', `Bearer ${token}`)
      .send({ city: 'Melbourne' });
    expect(res.status).toBe(400);
  });

  it('returns 400 for invalid severity', async () => {
    const token = await getAdminToken();
    const res = await request(app)
      .post('/api/messages')
      .set('Authorization', `Bearer ${token}`)
      .send({ city: 'Melbourne', message: 'Test', severity: 'extreme' });
    expect(res.status).toBe(400);
  });

  it('delivers to 0 clients when no one is subscribed', async () => {
    const token = await getAdminToken();
    const res = await request(app)
      .post('/api/messages')
      .set('Authorization', `Bearer ${token}`)
      .send({ city: 'Melbourne', message: 'Fire drill at 3 PM', severity: 'warning' });
    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({ delivered: 0, city: 'Melbourne', severity: 'warning' });
  });
});
