import type { Server as HttpServer } from 'http';
import { Server as SocketIOServer } from 'socket.io';
import jwt from 'jsonwebtoken';
import { getCachedWeather } from '../services/weatherService';
import { getRecentMessages } from '../services/messageService';
import type { JwtPayload, CityMessage } from '../types';

export let io: SocketIOServer;

// In-memory presence store: city (lowercase) → Set of socketIds currently in that room
const cityPresence = new Map<string, Set<string>>();
// Tracks the ISO timestamp of the last admin broadcast per city
const cityLastBroadcast = new Map<string, string>();

function addToPresence(city: string, socketId: string): void {
  if (!cityPresence.has(city)) cityPresence.set(city, new Set());
  cityPresence.get(city)!.add(socketId);
}

function removeFromPresence(city: string, socketId: string): void {
  const room = cityPresence.get(city);
  if (!room) return;
  room.delete(socketId);
  if (room.size === 0) cityPresence.delete(city);
}

function getPresenceSnapshot(): { city: string; count: number; lastBroadcast: string | null }[] {
  return [...cityPresence.entries()]
    .map(([city, sockets]) => ({
      city,
      count: sockets.size,
      lastBroadcast: cityLastBroadcast.get(city) ?? null,
    }))
    .sort((a, b) => b.count - a.count);
}

function emitPresenceUpdate(): void {
  io.to('admin-meta').emit('presence:update', { cities: getPresenceSnapshot() });
}

export function initSocket(httpServer: HttpServer, clientOrigin: string): SocketIOServer {
  io = new SocketIOServer(httpServer, {
    cors: { origin: clientOrigin, credentials: true },
  });

  io.use((socket, next) => {
    const token = socket.handshake.auth?.token as string | undefined;
    if (!token) return next(new Error('Authentication required'));
    try {
      const payload = jwt.verify(token, process.env.JWT_SECRET!, { algorithms: ['HS256'] }) as JwtPayload;
      socket.data.userId = payload.userId;
      socket.data.username = payload.username;
      socket.data.role = payload.role;
      next();
    } catch {
      next(new Error('Invalid or expired token'));
    }
  });

  io.on('connection', (socket) => {
    console.log(`  ↑ socket connected  [${socket.data.username}] ${socket.id}`);

    socket.on('city:join', (city: string) => {
      if (typeof city !== 'string' || !city.trim()) return;
      const room = city.trim().toLowerCase();

      // Leave previous city room and update presence
      const prevCity = socket.data.city as string | undefined;
      if (prevCity && prevCity !== room) {
        socket.leave(prevCity);
        removeFromPresence(prevCity, socket.id);
      }

      socket.data.city = room;
      socket.join(room);
      socket.emit('city:joined', { city: city.trim() });

      addToPresence(room, socket.id);
      emitPresenceUpdate();

      // Replay last 10 messages for this city
      for (const msg of getRecentMessages(room)) {
        socket.emit('city:message', msg);
      }

      // Push any cached weather alerts
      const cached = getCachedWeather(room);
      if (cached?.alerts?.length) {
        for (const alert of cached.alerts) {
          const preview =
            alert.description.length > 240
              ? alert.description.slice(0, 240) + '…'
              : alert.description;
          const msg: CityMessage = {
            city: city.trim(),
            message: `⚠ ${alert.event}: ${preview}`,
            severity: 'warning',
            timestamp: new Date().toISOString(),
          };
          socket.emit('city:message', msg);
        }
      }
    });

    socket.on('city:leave', (city: string) => {
      if (typeof city !== 'string') return;
      const room = city.trim().toLowerCase();
      socket.leave(room);
      removeFromPresence(room, socket.id);
      if (socket.data.city === room) socket.data.city = undefined;
      emitPresenceUpdate();
    });

    // Admin only — subscribe to aggregate city presence updates
    socket.on('presence:subscribe', () => {
      if (socket.data.role !== 'admin') return;
      socket.join('admin-meta');
      socket.emit('presence:update', { cities: getPresenceSnapshot() });
    });

    socket.on('presence:unsubscribe', () => {
      socket.leave('admin-meta');
    });

    socket.on('disconnect', (reason) => {
      console.log(`  ↓ socket disconnected [${socket.data.username}] ${reason}`);
      const city = socket.data.city as string | undefined;
      if (city) {
        removeFromPresence(city, socket.id);
        emitPresenceUpdate();
      }
    });
  });

  return io;
}

export function broadcastToCity(payload: CityMessage): number {
  const room = payload.city.toLowerCase();
  const count = cityPresence.get(room)?.size ?? 0;
  cityLastBroadcast.set(room, new Date().toISOString());
  io.to(room).emit('city:message', payload);
  // Notify all subscribed admin clients so their history stays in sync
  // regardless of which admin session sent the broadcast
  io.to('admin-meta').emit('message:broadcast', payload);
  emitPresenceUpdate();
  return count;
}
