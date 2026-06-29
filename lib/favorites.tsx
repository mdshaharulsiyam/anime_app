/**
 * Local favorites store backed by AsyncStorage and exposed through React context
 * so every screen reacts to changes instantly. We persist a compact snapshot of
 * each anime (enough to render the favorites grid without re-fetching).
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

export interface FavoriteAnime {
  mal_id: number;
  title: string;
  image: string;
  score: number | null;
  type: string | null;
  year: number | null;
  episodes: number | null;
}

const STORAGE_KEY = 'anijikan:favorites:v1';

interface FavoritesContextValue {
  favorites: FavoriteAnime[];
  ready: boolean;
  isFavorite: (id: number) => boolean;
  toggle: (anime: FavoriteAnime) => void;
  remove: (id: number) => void;
  clear: () => void;
}

const FavoritesContext = createContext<FavoritesContextValue | undefined>(undefined);

export function toFavorite(anime: Anime, image: string): FavoriteAnime {
  return {
    mal_id: anime.mal_id,
    title: anime.title_english || anime.title,
    image,
    score: anime.score,
    type: anime.type,
    year: anime.year,
    episodes: anime.episodes,
  };
}

export function FavoritesProvider({ children }: { children: React.ReactNode }) {
  const [favorites, setFavorites] = useState<FavoriteAnime[]>([]);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const raw = await AsyncStorage.getItem(STORAGE_KEY);
        if (raw) setFavorites(JSON.parse(raw));
      } catch {
        // ignore corrupt storage; start fresh
      } finally {
        setReady(true);
      }
    })();
  }, []);

  const persist = useCallback((next: FavoriteAnime[]) => {
    setFavorites(next);
    AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(next)).catch(() => { });
  }, []);

  const isFavorite = useCallback(
    (id: number) => favorites.some((f) => f.mal_id === id),
    [favorites],
  );

  const toggle = useCallback(
    (anime: FavoriteAnime) => {
      const exists = favorites.some((f) => f.mal_id === anime.mal_id);
      persist(
        exists
          ? favorites.filter((f) => f.mal_id !== anime.mal_id)
          : [anime, ...favorites],
      );
    },
    [favorites, persist],
  );

  const remove = useCallback(
    (id: number) => persist(favorites.filter((f) => f.mal_id !== id)),
    [favorites, persist],
  );

  const clear = useCallback(() => persist([]), [persist]);

  const value = useMemo(
    () => ({ favorites, ready, isFavorite, toggle, remove, clear }),
    [favorites, ready, isFavorite, toggle, remove, clear],
  );

  return <FavoritesContext.Provider value={value}>{children}</FavoritesContext.Provider>;
}

export function useFavorites() {
  const ctx = useContext(FavoritesContext);
  if (!ctx) throw new Error('useFavorites must be used within a FavoritesProvider');
  return ctx;
}
