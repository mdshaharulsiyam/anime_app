/**
 * A 2-column, infinite-scroll grid of anime posters driven by a
 * `usePaginatedList` result. Handles loading / error / empty / footer states.
 */
import React from 'react';
import {
  ActivityIndicator,
  Dimensions,
  FlatList,
  RefreshControl,
  StyleSheet,
} from 'react-native';
import { colors, spacing } from '../constants/theme';
import { Anime } from '../lib/types';
import { AnimeCard } from './AnimeCard';
import { EmptyState, ErrorState, Loading } from './ui';

const { width: SCREEN_W } = Dimensions.get('window');
const GAP = spacing.lg;
const CARD_W = (SCREEN_W - GAP * 3) / 2;

export interface PaginatedState {
  items: Anime[];
  loading: boolean;
  refreshing: boolean;
  error: string | null;
  isEmpty: boolean;
  loadMore: () => void;
  refresh: () => void;
}

export function AnimeGrid({
  list,
  paddingTop = spacing.sm,
  emptyTitle = 'Nothing here yet',
  emptyIcon = 'sparkles-outline',
}: {
  list: PaginatedState;
  paddingTop?: number;
  emptyTitle?: string;
  emptyIcon?: React.ComponentProps<typeof EmptyState>['icon'];
}) {
  if (list.loading && list.items.length === 0) return <Loading label="Loading…" />;
  if (list.error && list.items.length === 0)
    return <ErrorState message={list.error} onRetry={list.refresh} />;
  if (list.isEmpty) return <EmptyState icon={emptyIcon} title={emptyTitle} />;

  return (
    <FlatList
      data={list.items}
      numColumns={2}
      keyExtractor={(item) => String(item.mal_id)}
      columnWrapperStyle={styles.column}
      contentContainerStyle={[styles.content, { paddingTop }]}
      showsVerticalScrollIndicator={false}
      onEndReachedThreshold={0.5}
      onEndReached={list.loadMore}
      refreshControl={
        <RefreshControl
          refreshing={list.refreshing}
          onRefresh={list.refresh}
          tintColor={colors.primary}
        />
      }
      renderItem={({ item }) => <AnimeCard anime={item} width={CARD_W} />}
      ListFooterComponent={
        list.loading && list.items.length > 0 ? (
          <ActivityIndicator color={colors.primary} style={{ marginVertical: spacing.lg }} />
        ) : null
      }
    />
  );
}

const styles = StyleSheet.create({
  column: { gap: GAP, paddingHorizontal: GAP },
  content: { paddingBottom: spacing.xxl, gap: GAP },
});
