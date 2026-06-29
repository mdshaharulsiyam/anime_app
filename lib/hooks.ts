/**
 * Small data-fetching hooks tailored to Jikan responses: one for single
 * resources and one for paginated, infinite-scroll lists.
 */
import { useCallback, useEffect, useRef, useState } from 'react';
import { JikanList } from './types';

export function useAsync<T>(fn: () => Promise<T>, deps: unknown[]) {
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [reloadKey, setReloadKey] = useState(0);

  const reload = useCallback(() => setReloadKey((k) => k + 1), []);

  useEffect(() => {
    let active = true;
    setLoading(true);
    setError(null);
    fn()
      .then((res) => active && setData(res))
      .catch((e: Error) => active && setError(e.message))
      .finally(() => active && setLoading(false));
    return () => {
      active = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [...deps, reloadKey]);

  return { data, loading, error, reload };
}

type Fetcher<T> = (page: number) => Promise<JikanList<T>>;

/**
 * Infinite list helper. `key` resets the list (e.g. when a search query or
 * filter changes). De-duplicates items by `getId` to guard against Jikan
 * returning overlapping pages.
 */
export function usePaginatedList<T>(
  fetcher: Fetcher<T>,
  getId: (item: T) => number,
  key: string,
) {
  const [items, setItems] = useState<T[]>([]);
  const [page, setPage] = useState(1);
  const [hasNext, setHasNext] = useState(true);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const loadingRef = useRef(false);

  const load = useCallback(
    async (targetPage: number, mode: 'append' | 'replace') => {
      if (loadingRef.current) return;
      loadingRef.current = true;
      if (mode === 'replace') setRefreshing(true);
      else setLoading(true);
      setError(null);
      try {
        const res = await fetcher(targetPage);
        setHasNext(res.pagination?.has_next_page ?? false);
        setItems((prev) => {
          const base = mode === 'replace' ? [] : prev;
          const seen = new Set(base.map(getId));
          const merged = [...base];
          for (const it of res.data) {
            const id = getId(it);
            if (!seen.has(id)) {
              seen.add(id);
              merged.push(it);
            }
          }
          return merged;
        });
        setPage(targetPage);
      } catch (e) {
        setError((e as Error).message);
      } finally {
        loadingRef.current = false;
        setLoading(false);
        setRefreshing(false);
      }
    },
    [fetcher, getId],
  );

  // Reset and load the first page whenever the key changes.
  useEffect(() => {
    setItems([]);
    setPage(1);
    setHasNext(true);
    load(1, 'replace');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);

  const loadMore = useCallback(() => {
    if (!hasNext || loadingRef.current) return;
    load(page + 1, 'append');
  }, [hasNext, page, load]);

  const refresh = useCallback(() => load(1, 'replace'), [load]);

  return {
    items,
    loading,
    refreshing,
    error,
    hasNext,
    loadMore,
    refresh,
    isEmpty: !loading && !refreshing && items.length === 0,
  };
}
