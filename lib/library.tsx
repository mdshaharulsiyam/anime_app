/**
 * The user's personal tracking library: a saved list of anime, each with a
 * watch status and episode progress. Connected to the Express backend API.
 */
import AsyncStorage from '@react-native-async-storage/async-storage';
import React, {
  createContext,
  ReactNode,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';
import { VersionErrorDetails } from '../components/ForceUpdateModal';
import {
  deleteAnime,
  fetchUserAnimeList,
  loginOrRegisterUser,
  OutdatedVersionError,
  upsertAnime,
} from './api';
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

const USERNAME_KEY = 'Anipulse:username:v1';
const PASSKEY_KEY = 'Anipulse:passkey:v1';
const LOCAL_ENTRIES_KEY = 'Anipulse:library_entries:v1';

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

export interface LibraryContextValue {
  entries: LibraryEntry[];
  username: string | null;
  passkey: string | null;
  ready: boolean;
  loading: boolean;
  error: string | null;
  versionError: VersionErrorDetails | null;
  isAuthModalOpen: boolean;
  openAuthModal: () => void;
  closeAuthModal: () => void;
  saveUsername: (name: string, passkey?: string) => Promise<void>;
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
  isSaved: (id: number) => boolean;
  getEntry: (id: number) => LibraryEntry | undefined;
  byStatus: (status: WatchStatus) => LibraryEntry[];
  counts: Record<WatchStatus, number>;
}

const LibraryContext = createContext<LibraryContextValue | undefined>(undefined);

function clampProgress(entry: LibraryEntry, value: number): number {
  const max = entry.episodes && entry.episodes > 0 ? entry.episodes : Infinity;
  return Math.max(0, Math.min(value, max === Infinity ? value : max));
}

export function LibraryProvider({ children }: { children: ReactNode }) {
  const [entries, setEntries] = useState<LibraryEntry[]>([]);
  const [username, setUsername] = useState<string | null>(null);
  const [passkey, setPasskey] = useState<string | null>(null);
  const [ready, setReady] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [versionError, setVersionError] = useState<VersionErrorDetails | null>(null);
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);

  const openAuthModal = useCallback(() => setIsAuthModalOpen(true), []);
  const closeAuthModal = useCallback(() => setIsAuthModalOpen(false), []);

  const usernameRef = React.useRef<string | null>(username);
  useEffect(() => {
    usernameRef.current = username;
  }, [username]);

  const entriesRef = React.useRef<LibraryEntry[]>(entries);
  useEffect(() => {
    entriesRef.current = entries;
  }, [entries]);

  // Helper to persist entries immediately to AsyncStorage
  const saveLocalEntries = useCallback((newEntries: LibraryEntry[]) => {
    AsyncStorage.setItem(LOCAL_ENTRIES_KEY, JSON.stringify(newEntries)).catch((err) => {
      console.warn('[LocalStorage] Failed to save entries locally:', err);
    });
  }, []);

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

  // Async helper to sync entry mutation to server in the background
  const syncUpsert = useCallback(
    (entry: LibraryEntry) => {
      const activeUser = usernameRef.current;
      if (!activeUser) return;
      upsertAnime(activeUser, entry).catch((err) => {
        console.warn('[Sync Warning] Backend update failed, locally saved:', err?.message || err);
      });
    },
    []
  );

  // Async helper to sync entry deletion to server in the background
  const syncDelete = useCallback(
    (animeId: number) => {
      const activeUser = usernameRef.current;
      if (!activeUser) return;
      deleteAnime(activeUser, animeId).catch((err) => {
        console.warn('[Sync Warning] Backend delete failed, locally saved:', err?.message || err);
      });
    },
    []
  );

  // Sync cloud list and local list bidirectionally
  const loadUserAnime = useCallback(
    async (activeUsername: string, activePasskey?: string) => {
      setLoading(true);
      setError(null);
      try {
        const cloudList = await fetchUserAnimeList(activeUsername);
        const currentLocal = entriesRef.current;

        // If local entries exist and have newer timestamps, sync those up to cloud
        const mergedMap = new Map<number, LibraryEntry>();
        for (const item of cloudList) {
          mergedMap.set(item.mal_id, item);
        }
        for (const localItem of currentLocal) {
          const cloudItem = mergedMap.get(localItem.mal_id);
          if (!cloudItem || localItem.updatedAt > cloudItem.updatedAt) {
            mergedMap.set(localItem.mal_id, localItem);
            // Push newer local item to cloud in background
            syncUpsert(localItem);
          }
        }

        const mergedList = Array.from(mergedMap.values()).sort(
          (a, b) => b.updatedAt - a.updatedAt
        );

        setEntries(mergedList);
        saveLocalEntries(mergedList);
      } catch (err: any) {
        if (err instanceof OutdatedVersionError) {
          handleApiError(err, 'Outdated version');
          return;
        }
        try {
          if (activePasskey) {
            await loginOrRegisterUser(activeUsername, activePasskey);
          }
          const retryList = await fetchUserAnimeList(activeUsername);
          setEntries(retryList);
          saveLocalEntries(retryList);
        } catch (retryErr: any) {
          console.warn('[LibraryProvider] Cloud list fetch failed, using local offline data:', retryErr);
        }
      } finally {
        setLoading(false);
      }
    },
    [handleApiError, saveLocalEntries, syncUpsert]
  );

  // Initialize username, passkey, and local cached entries instantly on startup
  useEffect(() => {
    (async () => {
      try {
        const [savedName, savedPasskey, savedEntriesRaw] = await Promise.all([
          AsyncStorage.getItem(USERNAME_KEY),
          AsyncStorage.getItem(PASSKEY_KEY),
          AsyncStorage.getItem(LOCAL_ENTRIES_KEY),
        ]);

        if (savedEntriesRaw) {
          try {
            const parsed = JSON.parse(savedEntriesRaw);
            if (Array.isArray(parsed)) {
              setEntries(parsed);
            }
          } catch (e) {
            console.warn('[Library] Failed parsing local storage entries:', e);
          }
        }

        if (savedName) {
          setUsername(savedName);
          setPasskey(savedPasskey);
          // Sync with cloud behind the scenes
          loadUserAnime(savedName, savedPasskey || undefined);
        }
      } catch (err) {
        console.warn('Error reading stored credentials/entries:', err);
      } finally {
        setReady(true);
      }
    })();
  }, [loadUserAnime]);

  // Save new username locally and sync
  const saveUsername = useCallback(
    async (name: string, key?: string) => {
      const trimmed = name.trim().toLowerCase();
      const trimmedKey = key ? key.trim() : null;
      setUsername(trimmed);
      setPasskey(trimmedKey);
      await AsyncStorage.setItem(USERNAME_KEY, trimmed);
      if (trimmedKey) {
        await AsyncStorage.setItem(PASSKEY_KEY, trimmedKey);
      }
      await loadUserAnime(trimmed, trimmedKey || undefined);
    },
    [loadUserAnime]
  );

  // Logout / Switch User
  const switchUser = useCallback(async () => {
    await Promise.all([
      AsyncStorage.removeItem(USERNAME_KEY),
      AsyncStorage.removeItem(PASSKEY_KEY),
      AsyncStorage.removeItem(LOCAL_ENTRIES_KEY),
    ]);
    setUsername(null);
    setPasskey(null);
    setEntries([]);
    setError(null);
  }, []);

  const refreshList = useCallback(async () => {
    if (username) {
      await loadUserAnime(username);
    }
  }, [username, loadUserAnime]);

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
      let updatedList: LibraryEntry[];
      let target: LibraryEntry;

      if (existing) {
        target = { ...existing, status, updatedAt: Date.now() };
        updatedList = entries.map((e) => (e.mal_id === anime.mal_id ? target : e));
      } else {
        target = toEntry(anime, image, status);
        updatedList = [target, ...entries];
      }

      setEntries(updatedList);
      saveLocalEntries(updatedList);
      syncUpsert(target);
    },
    [entries, saveLocalEntries, syncUpsert],
  );

  const toggleSave = useCallback(
    (anime: Anime, image: string) => {
      if (entries.some((e) => e.mal_id === anime.mal_id)) {
        const updatedList = entries.filter((e) => e.mal_id !== anime.mal_id);
        setEntries(updatedList);
        saveLocalEntries(updatedList);
        syncDelete(anime.mal_id);
      } else {
        const target = toEntry(anime, image, 'plan');
        const updatedList = [target, ...entries];
        setEntries(updatedList);
        saveLocalEntries(updatedList);
        syncUpsert(target);
      }
    },
    [entries, saveLocalEntries, syncDelete, syncUpsert],
  );

  const remove = useCallback(
    (id: number) => {
      const updatedList = entries.filter((e) => e.mal_id !== id);
      setEntries(updatedList);
      saveLocalEntries(updatedList);
      syncDelete(id);
    },
    [entries, saveLocalEntries, syncDelete],
  );

  const updateEntry = useCallback(
    (id: number, mutate: (e: LibraryEntry) => LibraryEntry) => {
      let target: LibraryEntry | null = null;
      setEntries((prev) => {
        const updatedList = prev.map((e) => {
          if (e.mal_id === id) {
            target = { ...mutate(e), updatedAt: Date.now() };
            return target;
          }
          return e;
        });
        saveLocalEntries(updatedList);
        return updatedList;
      });

      if (target) {
        syncUpsert(target);
      }
    },
    [saveLocalEntries, syncUpsert]
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
      passkey,
      ready,
      loading,
      error,
      versionError,
      isAuthModalOpen,
      openAuthModal,
      closeAuthModal,
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
      passkey,
      ready,
      loading,
      error,
      versionError,
      isAuthModalOpen,
      openAuthModal,
      closeAuthModal,
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
