/**
 * The user's personal tracking library: a saved list of anime, each with a
 * watch status and episode progress. Connected to the Express backend API.
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
import { VersionErrorDetails } from '../components/ForceUpdateModal';
import { deleteAnime, fetchUserAnimeList, OutdatedVersionError, upsertAnime } from './api';
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

const USERNAME_KEY = 'Shiori:username:v1';

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
  username: string | null;
  ready: boolean;
  loading: boolean;
  error: string | null;
  versionError: VersionErrorDetails | null;
  isSaved: (id: number) => boolean;
  getEntry: (id: number) => LibraryEntry | undefined;
  byStatus: (status: WatchStatus) => LibraryEntry[];
  counts: Record<WatchStatus, number>;
  saveUsername: (name: string) => Promise<void>;
  switchUser: () => Promise<void>;
  refreshList: () => Promise<void>;
  /** Add (as Plan to Watch) if missing, else remove. */
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
  const [username, setUsername] = useState<string | null>(null);
  const [ready, setReady] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [versionError, setVersionError] = useState<VersionErrorDetails | null>(null);

  const handleApiError = useCallback((err: any, fallbackMsg: string) => {
    if (err instanceof OutdatedVersionError) {
      setVersionError({
        minVersion: err.minVersion,
        currentVersion: err.currentVersion,
        downloadUrl: err.downloadUrl,
        message: err.message,
      });
    } else {
      setError(err.message || fallbackMsg);
    }
  }, []);

  // Load user's anime list from backend
  const loadUserAnime = useCallback(async (activeUsername: string) => {
    setLoading(true);
    setError(null);
    try {
      const list = await fetchUserAnimeList(activeUsername);
      setEntries(list);
    } catch (err: any) {
      console.error('[LibraryProvider Error] Failed fetching user anime:', err);
      handleApiError(err, 'Failed to load anime list');
    } finally {
      setLoading(false);
    }
  }, [handleApiError]);

  // Initialize username on startup
  useEffect(() => {
    (async () => {
      try {
        const savedName = await AsyncStorage.getItem(USERNAME_KEY);
        if (savedName) {
          setUsername(savedName);
          await loadUserAnime(savedName);
        }
      } catch (err) {
        console.warn('Error reading stored username:', err);
      } finally {
        setReady(true);
      }
    })();
  }, [loadUserAnime]);

  // Save new username locally and load list
  const saveUsername = useCallback(
    async (name: string) => {
      const trimmed = name.trim().toLowerCase();
      setUsername(trimmed);
      await AsyncStorage.setItem(USERNAME_KEY, trimmed);
      await loadUserAnime(trimmed);
    },
    [loadUserAnime]
  );

  // Logout / Switch User
  const switchUser = useCallback(async () => {
    await AsyncStorage.removeItem(USERNAME_KEY);
    setUsername(null);
    setEntries([]);
    setError(null);
  }, []);

  const refreshList = useCallback(async () => {
    if (username) {
      await loadUserAnime(username);
    }
  }, [username, loadUserAnime]);

  // Async helper to sync entry mutation to server
  const syncUpsert = useCallback(
    (entry: LibraryEntry) => {
      if (!username) return;
      upsertAnime(username, entry).catch((err) => {
        console.error('[Sync Error] Failed to update anime:', err);
        handleApiError(err, 'Syncing change to server failed. Retrying...');
      });
    },
    [username, handleApiError]
  );

  // Async helper to sync entry deletion to server
  const syncDelete = useCallback(
    (animeId: number) => {
      if (!username) return;
      deleteAnime(username, animeId).catch((err) => {
        console.error('[Sync Error] Failed to delete anime:', err);
        handleApiError(err, 'Deleting item from server failed.');
      });
    },
    [username, handleApiError]
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
    for (const e of entries) {
      if (c[e.status] !== undefined) {
        c[e.status] += 1;
      }
    }
    return c;
  }, [entries]);

  const add = useCallback(
    (anime: Anime, image: string, status: WatchStatus = 'plan') => {
      const existing = entries.find((e) => e.mal_id === anime.mal_id);
      if (existing) {
        const updated = { ...existing, status, updatedAt: Date.now() };
        setEntries((prev) => prev.map((e) => (e.mal_id === anime.mal_id ? updated : e)));
        syncUpsert(updated);
      } else {
        const newEntry = toEntry(anime, image, status);
        setEntries((prev) => [newEntry, ...prev]);
        syncUpsert(newEntry);
      }
    },
    [entries, syncUpsert],
  );

  const toggleSave = useCallback(
    (anime: Anime, image: string) => {
      if (entries.some((e) => e.mal_id === anime.mal_id)) {
        setEntries((prev) => prev.filter((e) => e.mal_id !== anime.mal_id));
        syncDelete(anime.mal_id);
      } else {
        const newEntry = toEntry(anime, image, 'plan');
        setEntries((prev) => [newEntry, ...prev]);
        syncUpsert(newEntry);
      }
    },
    [entries, syncDelete, syncUpsert],
  );

  const remove = useCallback(
    (id: number) => {
      setEntries((prev) => prev.filter((e) => e.mal_id !== id));
      syncDelete(id);
    },
    [syncDelete],
  );

  const updateEntry = useCallback(
    (id: number, mutate: (e: LibraryEntry) => LibraryEntry) => {
      let target: LibraryEntry | null = null;
      setEntries((prev) =>
        prev.map((e) => {
          if (e.mal_id === id) {
            target = { ...mutate(e), updatedAt: Date.now() };
            return target;
          }
          return e;
        })
      );
      if (target) {
        syncUpsert(target);
      }
    },
    [syncUpsert]
  );

  const setStatus = useCallback(
    (id: number, status: WatchStatus) =>
      updateEntry(id, (e) => {
        let progress = e.progress;
        if (status === 'completed' && e.episodes) progress = e.episodes;
        return { ...e, status, progress };
      }),
    [updateEntry],
  );

  const setProgress = useCallback(
    (id: number, progress: number) =>
      updateEntry(id, (e) => {
        const p = clampProgress(e, progress);
        const status =
          e.episodes && p >= e.episodes ? 'completed' : e.status === 'plan' ? 'watching' : e.status;
        return { ...e, progress: p, status };
      }),
    [updateEntry],
  );

  const increment = useCallback(
    (id: number) => updateEntry(id, (e) => {
      const p = clampProgress(e, e.progress + 1);
      const status = e.episodes && p >= e.episodes ? 'completed' : e.status === 'plan' || e.status === 'on_hold' ? 'watching' : e.status;
      return { ...e, progress: p, status };
    }),
    [updateEntry],
  );

  const decrement = useCallback(
    (id: number) => updateEntry(id, (e) => ({ ...e, progress: clampProgress(e, e.progress - 1) })),
    [updateEntry],
  );

  const clear = useCallback(() => {
    entries.forEach((e) => syncDelete(e.mal_id));
    setEntries([]);
  }, [entries, syncDelete]);

  const value = useMemo(
    () => ({
      entries,
      username,
      ready,
      loading,
      error,
      versionError,
      isSaved,
      getEntry,
      byStatus,
      counts,
      saveUsername,
      switchUser,
      refreshList,
      toggleSave,
      add,
      remove,
      setStatus,
      setProgress,
      increment,
      decrement,
      clear,
    }),
    [
      entries,
      username,
      ready,
      loading,
      error,
      versionError,
      isSaved,
      getEntry,
      byStatus,
      counts,
      saveUsername,
      switchUser,
      refreshList,
      toggleSave,
      add,
      remove,
      setStatus,
      setProgress,
      increment,
      decrement,
      clear,
    ],
  );

  return <LibraryContext.Provider value={value}>{children}</LibraryContext.Provider>;
}

export function useLibrary() {
  const ctx = useContext(LibraryContext);
  if (!ctx) throw new Error('useLibrary must be used within a LibraryProvider');
  return ctx;
}
