import type { CityMessage } from '../types';

// In-memory ring buffer of the last N broadcasts per city. This is fine for a
// single-process challenge build but does NOT survive restarts and does NOT
// share state across instances — in production this would move to Redis
// (LPUSH + LTRIM) or a small DB table so horizontal scaling and crash recovery
// work correctly.
const MAX_HISTORY = 10;
const history = new Map<string, CityMessage[]>();

export function addMessage(payload: CityMessage): void {
  const key = payload.city.toLowerCase();
  const msgs = history.get(key) ?? [];
  msgs.push(payload);
  // Trim from the front so newly-joined sockets only replay the most recent
  // window — older alerts are intentionally not delivered late.
  if (msgs.length > MAX_HISTORY) msgs.splice(0, msgs.length - MAX_HISTORY);
  history.set(key, msgs);
}

export function _resetHistory(): void {
  history.clear();
}

export function getRecentMessages(city: string): CityMessage[] {
  return history.get(city.toLowerCase()) ?? [];
}
