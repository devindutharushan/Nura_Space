import type { Server as HttpServer } from 'http';
import { Server as SocketIOServer } from 'socket.io';
import jwt from 'jsonwebtoken';
import { getCachedWeather } from '../services/weatherService';
import { getRecentMessages } from '../services/messageService';
import type { JwtPayload, CityMessage } from '../types';

export let io: SocketIOServer;

// Presence is tracked here rather than via Socket.IO's room sizes so that we
// can derive admin-facing stats (aggregate watcher counts, last-broadcast time)
// without iterating internal adapter state on every event. Both maps are keyed
// by the normalised (lowercased) city name so "Melbourne" and "melbourne"
// resolve to the same room.
const cityPresence = new Map<string, Set<string>>();
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

function emitCityPresence(room: string): void {
  const count = cityPresence.get(room)?.size ?? 0;
  // Per-city counts are scoped to a parallel `admin:<room>` channel so demo
  // users in `<room>` only ever see broadcasts, never how many other people
  // are watching alongside them.
  io.to(`admin:${room}`).emit('city:presence', { city: room, count });
}

export function initSocket(httpServer: HttpServer, clientOrigin: string): SocketIOServer {
  io = new SocketIOServer(httpServer, {
    cors: { origin: clientOrigin, credentials: true },
  });

  // Socket auth runs alongside the HTTP `authenticate` middleware — every
  // transport into the system must present a valid JWT, otherwise a client
  // could open a raw socket and bypass the REST guard entirely. The role
  // resolved here gates admin-only events later on `socket.data.role`.
  io.use((socket, next) => {
    const token = socket.handshake.auth?.token as string | undefined;
    if (!token) return next(new Error('Authentication required'));
    try {
      const payload = jwt.verify(token, process.env.JWT_SECRET!, {
        algorithms: ['HS256'],
      }) as JwtPayload;
      socket.data.userId = payload.userId;
      socket.data.username = payload.username;
      socket.data.role = payload.role;
      next();
    } catch {
      next(new Error('Invalid or expired token'));
    }
  });

  io.on('connection', (socket) => {
    console.log(`socket connected: ${socket.data.username} ${socket.id}`);

    socket.on('city:join', (city: string) => {
      if (typeof city !== 'string' || !city.trim()) return;
      const room = city.trim().toLowerCase();
      const isAdmin = socket.data.role === 'admin';

      const prevCity = socket.data.city as string | undefined;

      // Join the new room before leaving the old one so any broadcast
      // in flight during the swap still reaches this socket exactly once.
      socket.join(room);
      if (isAdmin) socket.join(`admin:${room}`);
      socket.data.city = room;
      addToPresence(room, socket.id);

      if (prevCity && prevCity !== room) {
        socket.leave(prevCity);
        if (isAdmin) socket.leave(`admin:${prevCity}`);
        removeFromPresence(prevCity, socket.id);
        emitCityPresence(prevCity);
      }

      socket.emit('city:joined', { city: city.trim() });
      emitPresenceUpdate();
      emitCityPresence(room);

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
            message: `${alert.event}: ${preview}`,
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
      if (socket.data.role === 'admin') socket.leave(`admin:${room}`);
      removeFromPresence(room, socket.id);
      if (socket.data.city === room) socket.data.city = undefined;
      emitPresenceUpdate();
      emitCityPresence(room);
    });

    socket.on('presence:subscribe', () => {
      if (socket.data.role !== 'admin') return;
      socket.join('admin-meta');
      socket.emit('presence:update', { cities: getPresenceSnapshot() });
    });

    socket.on('presence:unsubscribe', () => {
      socket.leave('admin-meta');
    });

    // Disconnect can fire without a preceding `city:leave` (browser close,
    // network drop, server restart), so presence must be reconciled here or
    // ghost watchers accumulate in the admin dashboard.
    socket.on('disconnect', (reason) => {
      console.log(`socket disconnected: ${socket.data.username} (${reason})`);
      const city = socket.data.city as string | undefined;
      if (city) {
        removeFromPresence(city, socket.id);
        emitPresenceUpdate();
        emitCityPresence(city);
      }
    });
  });

  return io;
}

/**
 * Fan a message out to every socket currently watching `payload.city` and
 * return the delivery count snapshotted at send time. The return value powers
 * the HTTP response so the caller can show "delivered to N users" — it
 * intentionally reflects watchers at this instant, not historical reach.
 */
export function broadcastToCity(payload: CityMessage): number {
  const room = payload.city.toLowerCase();
  const count = cityPresence.get(room)?.size ?? 0;
  cityLastBroadcast.set(room, new Date().toISOString());
  io.to(room).emit('city:message', payload);
  // Mirror to the admin-meta room so every open admin panel updates its
  // history view — not just the tab that issued the broadcast.
  io.to('admin-meta').emit('message:broadcast', payload);
  emitPresenceUpdate();
  return count;
}
