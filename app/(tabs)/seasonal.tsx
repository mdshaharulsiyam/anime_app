import React, { useCallback, useState } from 'react';
import {
  ActivityIndicator,
  Dimensions,
  FlatList,
  Pressable,
  RefreshControl,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { AnimeCard } from '../../components/AnimeCard';
import { EmptyState, ErrorState, Loading } from '../../components/ui';
import { colors, font, radius, spacing } from '../../constants/theme';
import { jikan } from '../../lib/api';
import { usePaginatedList } from '../../lib/hooks';
import { Anime } from '../../lib/types';

const { width: SCREEN_W } = Dimensions.get('window');
const GAP = spacing.lg;
const CARD_W = (SCREEN_W - GAP * 3) / 2;

type Tab = 'now' | 'upcoming';

export default function SeasonalScreen() {
  const insets = useSafeAreaInsets();
  const [tab, setTab] = useState<Tab>('now');

  const fetcher = useCallback(
    (page: number) => (tab === 'now' ? jikan.seasonNow(page) : jikan.seasonUpcoming(page)),
    [tab],
  );

  const list = usePaginatedList<Anime>(fetcher, (a) => a.mal_id, tab);

  return (
    <View style={[styles.container, { paddingTop: insets.top + spacing.sm }]}>
      <View style={styles.headerWrap}>
        <Text style={styles.title}>Seasonal</Text>
        <Text style={styles.subtitle}>
          {tab === 'now' ? 'Airing this season' : 'Announced for next seasons'}
        </Text>
        <View style={styles.tabs}>
          {(['now', 'upcoming'] as Tab[]).map((t) => (
            <Pressable
              key={t}
              onPress={() => setTab(t)}
              style={[styles.tab, tab === t && styles.tabActive]}
            >
              <Text style={[styles.tabText, tab === t && styles.tabTextActive]}>
                {t === 'now' ? 'This Season' : 'Upcoming'}
              </Text>
            </Pressable>
          ))}
        </View>
      </View>

      {list.loading && list.items.length === 0 ? (
        <Loading label="Loading season…" />
      ) : list.error && list.items.length === 0 ? (
        <ErrorState message={list.error} onRetry={list.refresh} />
      ) : list.isEmpty ? (
        <EmptyState icon="snow-outline" title="Nothing here yet" />
      ) : (
        <FlatList
          data={list.items}
          numColumns={2}
          keyExtractor={(item) => String(item.mal_id)}
          columnWrapperStyle={{ gap: GAP, paddingHorizontal: GAP }}
          contentContainerStyle={{ paddingBottom: spacing.xxl, gap: GAP, paddingTop: spacing.sm }}
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
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  headerWrap: { paddingHorizontal: spacing.lg, paddingBottom: spacing.sm },
  title: { color: colors.text, fontSize: font.size.xxl, fontWeight: font.weight.heavy },
  subtitle: { color: colors.textMuted, fontSize: font.size.sm, marginTop: 2 },
  tabs: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginTop: spacing.md,
    backgroundColor: colors.card,
    borderRadius: radius.pill,
    padding: 4,
    alignSelf: 'flex-start',
  },
  tab: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    borderRadius: radius.pill,
  },
  tabActive: { backgroundColor: colors.primary },
  tabText: { color: colors.textMuted, fontWeight: font.weight.semibold, fontSize: font.size.sm },
  tabTextActive: { color: colors.text },
});
