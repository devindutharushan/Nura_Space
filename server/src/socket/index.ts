import type { Server as HttpServer } from 'http';
import { Server as SocketIOServer } from 'socket.io';
import jwt from 'jsonwebtoken';
import { getCachedWeather } from '../services/weatherService';
import { getRecentMessages } from '../services/messageService';
import type { JwtPayload, CityMessage } from '../types';

export let io: SocketIOServer;

export function initSocket(httpServer: HttpServer, clientOrigin: string): SocketIOServer {
  io = new SocketIOServer(httpServer, {
    cors: { origin: clientOrigin, credentials: true },
  });

  io.use((socket, next) => {
    const token = socket.handshake.auth?.token as string | undefined;
    if (!token) return next(new Error('Authentication required'));
    try {
      const payload = jwt.verify(token, process.env.JWT_SECRET!) as JwtPayload;
      socket.data.userId = payload.userId;
      socket.data.username = payload.username;
      next();
    } catch {
      next(new Error('Invalid or expired token'));
    }
  });

  io.on('connection', (socket) => {
    console.log(`  ↑ socket connected  [${socket.data.username}] ${socket.id}`);

    socket.on('join-city', (city: string) => {
      if (typeof city !== 'string' || !city.trim()) return;
      const room = city.trim().toLowerCase();

      // Leave any previously joined city rooms first
      for (const r of socket.rooms) {
        if (r !== socket.id) socket.leave(r);
      }

      socket.join(room);
      socket.emit('city-joined', { city: city.trim() });

      // Replay last 10 messages for this city
      for (const msg of getRecentMessages(room)) {
        socket.emit('city-message', msg);
      }

      // Auto-push cached weather alerts for this city
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
          socket.emit('city-message', msg);
        }
      }
    });

    socket.on('leave-city', (city: string) => {
      if (typeof city === 'string') socket.leave(city.trim().toLowerCase());
    });

    socket.on('disconnect', (reason) => {
      console.log(`  ↓ socket disconnected [${socket.data.username}] ${reason}`);
    });
  });

  return io;
}

export function broadcastToCity(payload: CityMessage): number {
  const room = payload.city.toLowerCase();
  const sockets = io.sockets.adapter.rooms.get(room);
  const count = sockets?.size ?? 0;
  io.to(room).emit('city-message', payload);
  return count;
}
