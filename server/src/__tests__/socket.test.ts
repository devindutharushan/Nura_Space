import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import type { AddressInfo } from 'net';
import request from 'supertest';
import { io as ioClient, type Socket as ClientSocket } from 'socket.io-client';
import { app, server } from '../index';
import type { CityMessage } from '../types';

let baseUrl: string;

beforeAll(async () => {
  await new Promise<void>((resolve) => server.listen(0, resolve));
  const { port } = server.address() as AddressInfo;
  baseUrl = `http://127.0.0.1:${port}`;
});

afterAll(async () => {
  await new Promise<void>((resolve) => server.close(() => resolve()));
});

async function login(username: string, password: string): Promise<string> {
  const res = await request(app).post('/api/auth/login').send({ username, password });
  return res.body.token as string;
}

function connect(token: string): Promise<ClientSocket> {
  return new Promise((resolve, reject) => {
    const socket = ioClient(baseUrl, { auth: { token }, transports: ['websocket'] });
    socket.once('connect', () => resolve(socket));
    socket.once('connect_error', reject);
  });
}

function joinCity(socket: ClientSocket, city: string): Promise<void> {
  return new Promise((resolve) => {
    socket.once('city:joined', () => resolve());
    socket.emit('city:join', city);
  });
}

describe('Socket.IO city rooms', () => {
  // Regression guard for the core privacy property: a Sydney watcher must
  // never receive a Melbourne broadcast. If this test ever fails, room
  // isolation is broken and demo users may be reading each other's alerts.
  it('delivers a message only to sockets in the matching city room', async () => {
    const adminToken = await login('admin', 'admin123');
    const demoToken = await login('demo', 'password');

    const melbourne = await connect(demoToken);
    const sydney = await connect(adminToken);
    await joinCity(melbourne, 'Melbourne');
    await joinCity(sydney, 'Sydney');

    const melbourneMessages: CityMessage[] = [];
    const sydneyMessages: CityMessage[] = [];
    melbourne.on('city:message', (m: CityMessage) => melbourneMessages.push(m));
    sydney.on('city:message', (m: CityMessage) => sydneyMessages.push(m));

    const res = await request(app)
      .post('/api/messages')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ city: 'Melbourne', message: 'Storm warning', severity: 'warning' });

    expect(res.status).toBe(200);
    expect(res.body.delivered).toBe(1);

    await new Promise((r) => setTimeout(r, 100));

    expect(melbourneMessages).toHaveLength(1);
    expect(melbourneMessages[0]).toMatchObject({
      city: 'Melbourne',
      message: 'Storm warning',
      severity: 'warning',
    });
    expect(sydneyMessages).toHaveLength(0);

    melbourne.disconnect();
    sydney.disconnect();
  });
});
