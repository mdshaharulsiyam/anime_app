/**
 * The user's personal tracking library: a saved list of anime, each with a
 * watch status and episode progress. Persisted to AsyncStorage and exposed via
 * context so every screen (cards, detail, My List) stays in sync.
 *
 * This supersedes the old "favorites" store; existing favorites are migrated in
 * automatically as "Plan to Watch".
 */
import AsyncStorage from '@react-native-async-storage/async-storage';
import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';
import { Anime } from './types';

export type WatchStatus = 'watching' | 'plan' | 'completed' | 'on_hold' | 'dropped';

export interface LibraryEntry {
  mal_id: number;
  title: string;
  image: string;
  score: number | null;
  type: string | null;
  year: number | null;
  episodes: number | null; // total episodes (null when unknown / still airing)
  airing: boolean;
  broadcast?: { day: string | null; time: string | null; timezone: string | null } | null;
  status: WatchStatus;
  progress: number; // episodes watched
  updatedAt: number;
}

export const STATUS_ORDER: WatchStatus[] = [
  'watching',
  'plan',
  'completed',
  'on_hold',
  'dropped',
];

export const STATUS_META: Record<
  WatchStatus,
  { label: string; short: string; icon: string; color: string }
> = {
  watching: { label: 'Watching', short: 'Watching', icon: 'play-circle', color: '#34D6C8' },
  plan: { label: 'Plan to Watch', short: 'Planned', icon: 'bookmark', color: '#7C5CFC' },
  completed: { label: 'Completed', short: 'Done', icon: 'checkmark-circle', color: '#43D9A3' },
  on_hold: { label: 'On Hold', short: 'On Hold', icon: 'pause-circle', color: '#FFC542' },
  dropped: { label: 'Dropped', short: 'Dropped', icon: 'close-circle', color: '#FF5C7A' },
};

const STORAGE_KEY = 'anijikan:library:v1';
const LEGACY_FAV_KEY = 'anijikan:favorites:v1';

export function toEntry(
  anime: Anime,
  image: string,
  status: WatchStatus = 'plan',
): LibraryEntry {
  return {
    mal_id: anime.mal_id,
    title: anime.title_english || anime.title,
    image,
    score: anime.score,
    type: anime.type,
    year: anime.year,
    episodes: anime.episodes,
    airing: anime.airing,
    broadcast: anime.broadcast
      ? { day: anime.broadcast.day, time: anime.broadcast.time, timezone: anime.broadcast.timezone }
      : null,
    status,
    progress: 0,
    updatedAt: Date.now(),
  };
}

interface LibraryContextValue {
  entries: LibraryEntry[];
  ready: boolean;
  isSaved: (id: number) => boolean;
  getEntry: (id: number) => LibraryEntry | undefined;
  byStatus: (status: WatchStatus) => LibraryEntry[];
  counts: Record<WatchStatus, number>;
  /** Add (as Plan to Watch) if missing, else remove. Returns the new saved state. */
  toggleSave: (anime: Anime, image: string) => void;
  /** Ensure the anime is saved, optionally with a starting status. */
  add: (anime: Anime, image: string, status?: WatchStatus) => void;
  remove: (id: number) => void;
  setStatus: (id: number, status: WatchStatus) => void;
  setProgress: (id: number, progress: number) => void;
  increment: (id: number) => void;
  decrement: (id: number) => void;
  clear: () => void;
}

const LibraryContext = createContext<LibraryContextValue | undefined>(undefined);

function clampProgress(entry: LibraryEntry, value: number): number {
  const max = entry.episodes && entry.episodes > 0 ? entry.episodes : Infinity;
  return Math.max(0, Math.min(value, max === Infinity ? value : max));
}

export function LibraryProvider({ children }: { children: React.ReactNode }) {
  const [entries, setEntries] = useState<LibraryEntry[]>([]);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const raw = await AsyncStorage.getItem(STORAGE_KEY);
        if (raw) {
          setEntries(JSON.parse(raw));
        } else {
          // One-time migration from the legacy favorites store.
          const legacy = await AsyncStorage.getItem(LEGACY_FAV_KEY);
          if (legacy) {
            const favs = JSON.parse(legacy) as Array<Partial<LibraryEntry>>;
            const migrated: LibraryEntry[] = favs.map((f) => ({
              mal_id: f.mal_id!,
              title: f.title || 'Untitled',
              image: f.image || '',
              score: f.score ?? null,
              type: f.type ?? null,
              year: f.year ?? null,
              episodes: f.episodes ?? null,
              airing: false,
              broadcast: null,
              status: 'plan',
              progress: 0,
              updatedAt: Date.now(),
            }));
            setEntries(migrated);
          }
        }
      } catch {
        // start fresh on corrupt storage
      } finally {
        setReady(true);
      }
    })();
  }, []);

  const persist = useCallback((next: LibraryEntry[]) => {
    setEntries(next);
    AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(next)).catch(() => {});
  }, []);

  const update = useCallback(
    (id: number, mutate: (e: LibraryEntry) => LibraryEntry) => {
      setEntries((prev) => {
        const next = prev.map((e) => (e.mal_id === id ? { ...mutate(e), updatedAt: Date.now() } : e));
        AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(next)).catch(() => {});
        return next;
      });
    },
    [],
  );

  const isSaved = useCallback((id: number) => entries.some((e) => e.mal_id === id), [entries]);
  const getEntry = useCallback((id: number) => entries.find((e) => e.mal_id === id), [entries]);

  const byStatus = useCallback(
    (status: WatchStatus) =>
      entries.filter((e) => e.status === status).sort((a, b) => b.updatedAt - a.updatedAt),
    [entries],
  );

  const counts = useMemo(() => {
    const c: Record<WatchStatus, number> = {
      watching: 0,
      plan: 0,
      completed: 0,
      on_hold: 0,
      dropped: 0,
    };
    for (const e of entries) c[e.status] += 1;
    return c;
  }, [entries]);

  const add = useCallback(
    (anime: Anime, image: string, status: WatchStatus = 'plan') => {
      if (entries.some((e) => e.mal_id === anime.mal_id)) {
        update(anime.mal_id, (e) => ({ ...e, status }));
      } else {
        persist([toEntry(anime, image, status), ...entries]);
      }
    },
    [entries, persist, update],
  );

  const toggleSave = useCallback(
    (anime: Anime, image: string) => {
      if (entries.some((e) => e.mal_id === anime.mal_id)) {
        persist(entries.filter((e) => e.mal_id !== anime.mal_id));
      } else {
        persist([toEntry(anime, image, 'plan'), ...entries]);
      }
    },
    [entries, persist],
  );

  const remove = useCallback(
    (id: number) => persist(entries.filter((e) => e.mal_id !== id)),
    [entries, persist],
  );

  const setStatus = useCallback(
    (id: number, status: WatchStatus) =>
      update(id, (e) => {
        let progress = e.progress;
        if (status === 'completed' && e.episodes) progress = e.episodes;
        return { ...e, status, progress };
      }),
    [update],
  );

  const setProgress = useCallback(
    (id: number, progress: number) =>
      update(id, (e) => {
        const p = clampProgress(e, progress);
        const status =
          e.episodes && p >= e.episodes ? 'completed' : e.status === 'plan' ? 'watching' : e.status;
        return { ...e, progress: p, status };
      }),
    [update],
  );

  const increment = useCallback(
    (id: number) => update(id, (e) => {
      const p = clampProgress(e, e.progress + 1);
      const status = e.episodes && p >= e.episodes ? 'completed' : e.status === 'plan' || e.status === 'on_hold' ? 'watching' : e.status;
      return { ...e, progress: p, status };
    }),
    [update],
  );

  const decrement = useCallback(
    (id: number) => update(id, (e) => ({ ...e, progress: clampProgress(e, e.progress - 1) })),
    [update],
  );

  const clear = useCallback(() => persist([]), [persist]);

  const value = useMemo(
    () => ({
      entries,
      ready,
      isSaved,
      getEntry,
      byStatus,
      counts,
      toggleSave,
      add,
      remove,
      setStatus,
      setProgress,
      increment,
      decrement,
      clear,
    }),
    [entries, ready, isSaved, getEntry, byStatus, counts, toggleSave, add, remove, setStatus, setProgress, increment, decrement, clear],
  );

  return <LibraryContext.Provider value={value}>{children}</LibraryContext.Provider>;
}

export function useLibrary() {
  const ctx = useContext(LibraryContext);
  if (!ctx) throw new Error('useLibrary must be used within a LibraryProvider');
  return ctx;
}
