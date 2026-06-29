/**
 * Horizontal, lazily-loaded carousel of anime posters with a section header
 * and an optional "View all" link to the full paginated list.
 */
import { Ionicons } from '@expo/vector-icons';
import { Link } from 'expo-router';
import React from 'react';
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { colors, font, spacing } from '../constants/theme';
import { CategoryKey } from '../lib/catalog';
import { useAsync } from '../lib/hooks';
import { Anime, JikanList } from '../lib/types';
import { AnimeCard } from './AnimeCard';
import { ErrorState, SectionHeader } from './ui';

export function AnimeCarousel({
  title,
  subtitle,
  fetcher,
  categoryKey,
  cardWidth = 150,
}: {
  title: string;
  subtitle?: string;
  fetcher: () => Promise<JikanList<Anime>>;
  categoryKey?: CategoryKey;
  cardWidth?: number;
}) {
  const { data, loading, error, reload } = useAsync(fetcher, [title]);

  return (
    <View style={styles.section}>
      <View style={styles.headerRow}>
        <SectionHeader title={title} subtitle={subtitle} style={styles.header} />
        {categoryKey ? (
          <Link href={`/list/${categoryKey}`} asChild>
            <Pressable hitSlop={8} style={styles.viewAll}>
              <Text style={styles.viewAllText}>View all</Text>
              <Ionicons name="chevron-forward" size={14} color={colors.primary} />
            </Pressable>
          </Link>
        ) : null}
      </View>
      {loading ? (
        <View style={[styles.loader, { height: cardWidth * 1.45 }]}>
          <ActivityIndicator color={colors.primary} />
        </View>
      ) : error ? (
        <ErrorState message={error} onRetry={reload} />
      ) : (
        <FlatList
          data={data?.data ?? []}
          horizontal
          showsHorizontalScrollIndicator={false}
          keyExtractor={(item) => String(item.mal_id)}
          contentContainerStyle={styles.list}
          renderItem={({ item }) => <AnimeCard anime={item} width={cardWidth} />}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  section: { marginTop: spacing.xl },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.lg,
  },
  header: { flex: 1, marginBottom: spacing.md },
  viewAll: { flexDirection: 'row', alignItems: 'center', gap: 2, paddingTop: 2 },
  viewAllText: { color: colors.primary, fontSize: font.size.sm, fontWeight: font.weight.semibold },
  list: { paddingHorizontal: spacing.lg },
  loader: { alignItems: 'center', justifyContent: 'center' },
});
