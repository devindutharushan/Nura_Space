import type { CityMessage } from '../types';

const MAX_HISTORY = 10;
const history = new Map<string, CityMessage[]>();

export function addMessage(payload: CityMessage): void {
  const key = payload.city.toLowerCase();
  const msgs = history.get(key) ?? [];
  msgs.push(payload);
  if (msgs.length > MAX_HISTORY) msgs.splice(0, msgs.length - MAX_HISTORY);
  history.set(key, msgs);
}

export function getRecentMessages(city: string): CityMessage[] {
  return history.get(city.toLowerCase()) ?? [];
}
