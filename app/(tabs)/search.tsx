import { Ionicons } from '@expo/vector-icons';
import React, { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { AnimeListItem } from '../../components/AnimeCard';
import { EmptyState, ErrorState } from '../../components/ui';
import { colors, font, radius, spacing } from '../../constants/theme';
import { jikan } from '../../lib/api';
import { usePaginatedList } from '../../lib/hooks';
import { Anime } from '../../lib/types';

// A curated subset of popular Jikan genre ids for quick filtering.
const QUICK_GENRES = [
  { id: 1, name: 'Action' },
  { id: 4, name: 'Comedy' },
  { id: 8, name: 'Drama' },
  { id: 10, name: 'Fantasy' },
  { id: 22, name: 'Romance' },
  { id: 24, name: 'Sci-Fi' },
  { id: 36, name: 'Slice of Life' },
  { id: 30, name: 'Sports' },
  { id: 37, name: 'Supernatural' },
  { id: 7, name: 'Mystery' },
];

function useDebounced<T>(value: T, delay = 450) {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const t = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(t);
  }, [value, delay]);
  return debounced;
}

export default function SearchScreen() {
  const insets = useSafeAreaInsets();
  const [query, setQuery] = useState('');
  const [genre, setGenre] = useState<number | null>(null);
  const debouncedQuery = useDebounced(query.trim());

  const active = debouncedQuery.length >= 2 || genre !== null;

  const fetcher = useCallback(
    (page: number) =>
      jikan.searchAnime(
        debouncedQuery,
        page,
        genre ? String(genre) : undefined,
        genre && !debouncedQuery ? 'members' : undefined,
      ),
    [debouncedQuery, genre],
  );

  const list = usePaginatedList<Anime>(
    fetcher,
    (a) => a.mal_id,
    `${debouncedQuery}|${genre ?? ''}`,
  );

  return (
    <View style={[styles.container, { paddingTop: insets.top + spacing.sm }]}>
      <View style={styles.headerWrap}>
        <Text style={styles.title}>Search</Text>
        <View style={styles.searchBox}>
          <Ionicons name="search" size={18} color={colors.textMuted} />
          <TextInput
            value={query}
            onChangeText={setQuery}
            placeholder="Search anime…"
            placeholderTextColor={colors.textFaint}
            style={styles.input}
            returnKeyType="search"
            autoCorrect={false}
          />
          {query.length > 0 ? (
            <Pressable onPress={() => setQuery('')} hitSlop={8}>
              <Ionicons name="close-circle" size={18} color={colors.textMuted} />
            </Pressable>
          ) : null}
        </View>

        <FlatList
          data={QUICK_GENRES}
          horizontal
          showsHorizontalScrollIndicator={false}
          keyExtractor={(g) => String(g.id)}
          contentContainerStyle={{ gap: spacing.sm, paddingVertical: spacing.md }}
          renderItem={({ item }) => {
            const selected = genre === item.id;
            return (
              <Pressable
                onPress={() => setGenre(selected ? null : item.id)}
                style={[styles.genre, selected && styles.genreActive]}
              >
                <Text style={[styles.genreText, selected && styles.genreTextActive]}>
                  {item.name}
                </Text>
              </Pressable>
            );
          }}
        />
      </View>

      {!active ? (
        <EmptyState
          icon="search-outline"
          title="Find your next watch"
          message="Search by title or tap a genre to explore."
        />
      ) : list.error && list.items.length === 0 ? (
        <ErrorState message={list.error} onRetry={list.refresh} />
      ) : list.isEmpty ? (
        <EmptyState icon="sad-outline" title="No results" message="Try a different title or genre." />
      ) : (
        <FlatList
          data={list.items}
          keyExtractor={(item) => String(item.mal_id)}
          contentContainerStyle={{ padding: spacing.lg, paddingBottom: spacing.xxl }}
          keyboardDismissMode="on-drag"
          showsVerticalScrollIndicator={false}
          onEndReachedThreshold={0.5}
          onEndReached={list.loadMore}
          renderItem={({ item }) => <AnimeListItem anime={item} />}
          ListHeaderComponent={
            list.refreshing ? (
              <ActivityIndicator color={colors.primary} style={{ marginBottom: spacing.md }} />
            ) : null
          }
          ListFooterComponent={
            list.loading && list.items.length > 0 ? (
              <ActivityIndicator color={colors.primary} style={{ marginVertical: spacing.lg }} />
            ) : null
          }
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  headerWrap: { paddingHorizontal: spacing.lg },
  title: { color: colors.text, fontSize: font.size.xxl, fontWeight: font.weight.heavy },
  searchBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    backgroundColor: colors.card,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: spacing.md,
    height: 48,
    marginTop: spacing.md,
  },
  input: { flex: 1, color: colors.text, fontSize: font.size.md },
  genre: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    borderRadius: radius.pill,
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
  },
  genreActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  genreText: { color: colors.textMuted, fontSize: font.size.sm, fontWeight: font.weight.semibold },
  genreTextActive: { color: colors.text },
});
