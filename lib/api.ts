import Constants from 'expo-constants';
import { Platform } from 'react-native';
import { LibraryEntry, WatchStatus } from './library';
import {
  Anime,
  CharacterEntry,
  JikanList,
  JikanSingle,
  Recommendation,
} from './types';

// ==========================================
// 1. Jikan API v4 Client & Throttling
// ==========================================
const BASE_URL = 'https://api.tenrai.org/v1';
const MIN_GAP_MS = 400; // spacing between outgoing requests
const MAX_RETRIES = 3;

let lastRequestAt = 0;
let chain: Promise<unknown> = Promise.resolve();

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

async function throttledFetch(path: string): Promise<Response> {
  const now = Date.now();
  const wait = Math.max(0, MIN_GAP_MS - (now - lastRequestAt));
  if (wait > 0) await sleep(wait);
  lastRequestAt = Date.now();
  return fetch(`${BASE_URL}${path}`, {
    headers: { Accept: 'application/json' },
  });
}

/** Run all requests through a single serial chain so the throttle is honored. */
function enqueue<T>(task: () => Promise<T>): Promise<T> {
  const run = chain.then(task, task) as Promise<T>;
  // Keep the chain alive even if a task rejects.
  chain = run.then(
    () => undefined,
    () => undefined,
  );
  return run;
}

async function getJson<T>(path: string): Promise<T> {
  return enqueue(async () => {
    let attempt = 0;
    // Retry loop primarily handles 429s with linear backoff.
    while (true) {
      attempt += 1;
      const res = await throttledFetch(path);

      if (res.status === 429 && attempt <= MAX_RETRIES) {
        await sleep(900 * attempt);
        continue;
      }
      if (!res.ok) {
        throw new Error(`Jikan request failed (${res.status}) for ${path}`);
      }
      return (await res.json()) as T;
    }
  });
}

const qs = (params: Record<string, string | number | boolean | undefined>) => {
  const parts = Object.entries(params)
    .filter(([, v]) => v !== undefined && v !== '')
    .map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(String(v))}`);
  return parts.length ? `?${parts.join('&')}` : '';
};

export const jikan = {
  topAnime(page = 1, filter?: 'airing' | 'upcoming' | 'bypopularity' | 'favorite') {
    return getJson<JikanList<Anime>>(`/top/anime${qs({ page, filter })}`);
  },

  seasonNow(page = 1) {
    return getJson<JikanList<Anime>>(`/seasons/now${qs({ page })}`);
  },

  seasonUpcoming(page = 1) {
    return getJson<JikanList<Anime>>(`/seasons/upcoming${qs({ page })}`);
  },

  searchAnime(query: string, page = 1, genres?: string, orderBy?: string) {
    return getJson<JikanList<Anime>>(
      `/anime${qs({
        q: query,
        page,
        genres,
        order_by: orderBy,
        sort: orderBy ? 'desc' : undefined,
        sfw: true,
        limit: 24,
      })}`,
    );
  },

  animeFull(id: number) {
    return getJson<JikanSingle<Anime>>(`/anime/${id}/full`);
  },

  animeCharacters(id: number) {
    return getJson<JikanList<CharacterEntry>>(`/anime/${id}/characters`);
  },

  animeRecommendations(id: number) {
    return getJson<JikanList<Recommendation>>(`/anime/${id}/recommendations`);
  },

  genres() {
    return getJson<JikanList<{ mal_id: number; name: string; count: number }>>(
      `/genres/anime${qs({ filter: 'genres' })}`,
    );
  },
};

/** Pick the best available cover image for an anime/entry. */
export function coverImage(images: Anime['images']): string {
  return (
    images?.webp?.large_image_url ||
    images?.jpg?.large_image_url ||
    images?.webp?.image_url ||
    images?.jpg?.image_url ||
    ''
  );
}

// ==========================================
// 2. Express API Backend Client & Versioning
// ==========================================
export const APP_VERSION = Constants.expoConfig?.version || '1.0.0';

export class OutdatedVersionError extends Error {
  minVersion: string;
  currentVersion: string;
  downloadUrl: string;

  constructor(data: { minVersion: string; currentVersion: string; downloadUrl: string; message?: string }) {
    super(data.message || 'A mandatory update is required to continue using the application.');
    this.name = 'OutdatedVersionError';
    this.minVersion = data.minVersion;
    this.currentVersion = data.currentVersion;
    this.downloadUrl = data.downloadUrl;
  }
}

const getBaseUrl = (): string => {
  const envUrl = process.env.EXPO_PUBLIC_API_BASE_URL || "https://anime-app-zeta-bice.vercel.app/";

  // 1. If explicit env URL set and doesn't point to localhost/127.0.0.1, use it directly
  if (envUrl && !envUrl.includes('localhost') && !envUrl.includes('127.0.0.1')) {
    return envUrl;
  }

  // 2. Extract host IP dynamically from Expo Metro manifest (e.g. Expo Go on physical device)
  const hostUri = Constants.expoConfig?.hostUri;
  if (hostUri) {
    const hostIp = hostUri.split(':')[0];
    if (hostIp) {
      return `http://${hostIp}:5000/api`;
    }
  }

  // 3. Fallbacks
  if (Platform.OS === 'android') {
    return 'https://anime-app-zeta-bice.vercel.app/api';
  }
  return 'https://anime-app-zeta-bice.vercel.app/api';
};

export const getApiBaseUrl = getBaseUrl;

export interface BackendAnimeItem {
  _id?: string;
  user?: string;
  animeId: string;
  title: string;
  coverImage?: string;
  status: 'watching' | 'completed' | 'plan_to_watch' | 'on_hold' | 'dropped';
  episodesWatched: number;
  score?: number | null;
  createdAt?: string;
  updatedAt?: string;
}

export interface UserResponse {
  _id: string;
  username: string;
  createdAt: string;
}

/**
 * Generic fetch wrapper attaching X-App-Version header and parsing HTTP 426 errors
 */
async function backendFetch(path: string, options: RequestInit = {}): Promise<any> {
  const url = `${getApiBaseUrl()}${path}`;
  const headers = {
    'Content-Type': 'application/json',
    'X-App-Version': APP_VERSION,
    ...(options.headers || {}),
  };

  const response = await fetch(url, { ...options, headers });
  const json = await response.json().catch(() => ({}));

  if (response.status === 426 || json.error === 'OUTDATED_VERSION') {
    throw new OutdatedVersionError({
      minVersion: json.minVersion || '1.0.0',
      currentVersion: json.currentVersion || APP_VERSION,
      downloadUrl: json.downloadUrl || 'https://github.com/mdshaharulsiyam/anime_app',
      message: json.message,
    });
  }

  if (!response.ok || json.success === false) {
    throw new Error(json.message || `API request failed with status ${response.status}`);
  }

  return json;
}

/**
 * Map frontend WatchStatus to backend status enum
 */
export function toBackendStatus(status: WatchStatus): BackendAnimeItem['status'] {
  if (status === 'plan') return 'plan_to_watch';
  return status as BackendAnimeItem['status'];
}

/**
 * Map backend status enum to frontend WatchStatus
 */
export function toFrontendStatus(status: string): WatchStatus {
  if (status === 'plan_to_watch') return 'plan';
  if (['watching', 'completed', 'plan', 'on_hold', 'dropped'].includes(status)) {
    return status as WatchStatus;
  }
  return 'watching';
}

/**
 * Convert backend anime item to local LibraryEntry
 */
export function toLibraryEntry(item: BackendAnimeItem): LibraryEntry {
  return {
    mal_id: Number(item.animeId),
    title: item.title,
    image: item.coverImage || '',
    score: item.score ?? null,
    type: 'Anime',
    year: null,
    episodes: null,
    airing: false,
    broadcast: null,
    status: toFrontendStatus(item.status),
    progress: item.episodesWatched || 0,
    updatedAt: item.updatedAt ? new Date(item.updatedAt).getTime() : Date.now(),
  };
}

/**
 * POST /api/users/login-or-register
 */
export async function loginOrRegisterUser(username: string): Promise<UserResponse> {
  const json = await backendFetch('/users/login-or-register', {
    method: 'POST',
    body: JSON.stringify({ username: username.trim() }),
  });
  return json.data;
}

/**
 * GET /api/anime/:username
 */
export async function fetchUserAnimeList(username: string): Promise<LibraryEntry[]> {
  const json = await backendFetch(`/anime/${encodeURIComponent(username.trim())}`);
  return (json.data as BackendAnimeItem[]).map(toLibraryEntry);
}

/**
 * POST /api/anime/:username
 */
export async function upsertAnime(
  username: string,
  entry: Partial<LibraryEntry> & { mal_id: number; title: string }
): Promise<BackendAnimeItem> {
  const payload = {
    animeId: String(entry.mal_id),
    title: entry.title,
    coverImage: entry.image || '',
    status: toBackendStatus(entry.status || 'plan'),
    episodesWatched: entry.progress ?? 0,
    score: entry.score ?? null,
  };

  const json = await backendFetch(`/anime/${encodeURIComponent(username.trim())}`, {
    method: 'POST',
    body: JSON.stringify(payload),
  });

  return json.data;
}

/**
 * DELETE /api/anime/:username/:animeId
 */
export async function deleteAnime(username: string, animeId: number | string): Promise<void> {
  await backendFetch(
    `/anime/${encodeURIComponent(username.trim())}/${encodeURIComponent(String(animeId))}`,
    {
      method: 'DELETE',
    }
  );
}
