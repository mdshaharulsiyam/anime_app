/**
 * Thin client for the Jikan v4 API with a built-in request throttle.
 *
 * Jikan is rate limited (~3 requests/second, 60/minute). To stay friendly we
 * serialize requests through a small queue that enforces a minimum gap between
 * calls and transparently retries on HTTP 429 (Too Many Requests).
 */
import {
  Anime,
  CharacterEntry,
  JikanList,
  JikanSingle,
  Recommendation,
} from './types';

const BASE_URL = 'https://api.jikan.moe/v4';
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
