import { Stack, useLocalSearchParams } from 'expo-router';
import React, { useCallback } from 'react';
import { Text, View, StyleSheet } from 'react-native';
import { AnimeGrid } from '../../components/AnimeGrid';
import { EmptyState } from '../../components/ui';
import { colors, font, spacing } from '../../constants/theme';
import { getCategory } from '../../lib/catalog';
import { usePaginatedList } from '../../lib/hooks';
import { Anime } from '../../lib/types';

export default function CategoryListScreen() {
  const { category } = useLocalSearchParams<{ category: string }>();
  const cat = getCategory(category);

  const fetcher = useCallback(
    (page: number) => cat!.fetcher(page),
    [cat],
  );

  const list = usePaginatedList<Anime>(fetcher, (a) => a.mal_id, category ?? '');

  if (!cat) {
    return (
      <View style={styles.container}>
        <Stack.Screen options={{ title: 'Browse' }} />
        <EmptyState icon="alert-circle-outline" title="Unknown category" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Stack.Screen options={{ title: cat.title, headerShown: true }} />
      <Text style={styles.subtitle}>{cat.subtitle}</Text>
      <AnimeGrid list={list} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  subtitle: {
    color: colors.textMuted,
    fontSize: font.size.sm,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.sm,
    paddingBottom: spacing.xs,
  },
});
