import { request } from '../../http';

export function featured() {
  return request('/tv', {}, true);
}

export function dailyPuzzle() {
  return request('/training/daily', null, true);
}

export function topPlayersOfTheWeek() {
  return request('/player/top/week', null, true);
}
