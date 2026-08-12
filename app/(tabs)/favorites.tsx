import { Ionicons } from '@expo/vector-icons';
import React, { useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { TrackerRow } from '../../components/TrackerRow';
import { EmptyState } from '../../components/ui';
import { colors, font, radius, spacing } from '../../constants/theme';
import { STATUS_META, STATUS_ORDER, WatchStatus, useLibrary } from '../../lib/library';

type Filter = WatchStatus | 'all';

export default function MyListScreen() {
  const insets = useSafeAreaInsets();
  const { entries, counts, username, switchUser, loading, error, refreshList } = useLibrary();
  const [filter, setFilter] = useState<Filter>('watching');

  const visible = useMemo(() => {
    const list = filter === 'all' ? entries : entries.filter((e) => e.status === filter);
    return [...list].sort((a, b) => b.updatedAt - a.updatedAt);
  }, [entries, filter]);

  const confirmSwitchUser = () => {
    Alert.alert(
      'Switch User',
      `Are you sure you want to log out @${username || 'user'} on this device?`,
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Switch / Logout', style: 'destructive', onPress: switchUser },
      ]
    );
  };

  const filters: { key: Filter; label: string; count: number }[] = [
    { key: 'all', label: 'All', count: entries.length },
    ...STATUS_ORDER.map((s) => ({
      key: s as Filter,
      label: STATUS_META[s].short,
      count: counts[s],
    })),
  ];

  return (
    <View style={[styles.container, { paddingTop: insets.top + spacing.sm }]}>
      <View style={styles.headerWrap}>
        <View style={{ flex: 1 }}>
          <Text style={styles.title}>My List</Text>
          <Text style={styles.subtitle}>
            {entries.length} tracked · {counts.watching} watching
          </Text>
        </View>

        {username ? (
          <View style={styles.userActions}>
            <View style={styles.userBadge}>
              <Ionicons name="person-circle-outline" size={16} color={colors.primary} />
              <Text style={styles.userBadgeText} numberOfLines={1}>
                @{username}
              </Text>
            </View>
            <Pressable
              onPress={confirmSwitchUser}
              style={styles.switchUserBtn}
              hitSlop={8}
              accessibilityLabel="Switch User"
            >
              <Ionicons name="log-out-outline" size={18} color={colors.textMuted} />
            </Pressable>
          </View>
        ) : null}
      </View>

      {error ? (
        <View style={styles.errorBanner}>
          <Ionicons name="alert-circle-outline" size={16} color={colors.danger} />
          <Text style={styles.errorBannerText} numberOfLines={1}>
            {error}
          </Text>
          <Pressable onPress={refreshList} style={styles.retryBtn}>
            <Text style={styles.retryBtnText}>Retry</Text>
          </Pressable>
        </View>
      ) : null}

      <View>
        <FlatList
          data={filters}
          horizontal
          showsHorizontalScrollIndicator={false}
          keyExtractor={(f) => f.key}
          contentContainerStyle={styles.filterRow}
          renderItem={({ item }) => {
            const active = filter === item.key;
            return (
              <Pressable
                onPress={() => setFilter(item.key)}
                style={[styles.chip, active && styles.chipActive]}
              >
                <Text style={[styles.chipText, active && styles.chipTextActive]}>
                  {item.label}
                </Text>
                <View style={[styles.chipCount, active && styles.chipCountActive]}>
                  <Text style={[styles.chipCountText, active && styles.chipCountTextActive]}>
                    {item.count}
                  </Text>
                </View>
              </Pressable>
            );
          }}
        />
      </View>

      {loading && entries.length === 0 ? (
        <View style={styles.loadingBox}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={styles.loadingText}>Fetching your anime list...</Text>
        </View>
      ) : entries.length === 0 ? (
        <EmptyState
          icon="bookmarks-outline"
          title="Your list is empty"
          message="Tap the bookmark on any anime, then set it to Watching and start tracking episodes."
        />
      ) : visible.length === 0 ? (
        <EmptyState
          icon="filter-outline"
          title={`Nothing ${filter === 'all' ? 'here' : STATUS_META[filter as WatchStatus].short.toLowerCase()}`}
          message="Try another tab or add more anime to your list."
        />
      ) : (
        <FlatList
          data={visible}
          keyExtractor={(item) => String(item.mal_id)}
          contentContainerStyle={{ padding: spacing.lg, paddingBottom: spacing.xxl }}
          showsVerticalScrollIndicator={false}
          renderItem={({ item }) => <TrackerRow entry={item} />}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  headerWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.lg,
  },
  title: { color: colors.text, fontSize: font.size.xxl, fontWeight: font.weight.heavy },
  subtitle: { color: colors.textMuted, fontSize: font.size.sm, marginTop: 2 },
  userActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  userBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: colors.card,
    borderColor: colors.border,
    borderWidth: 1,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs + 2,
    borderRadius: radius.pill,
    maxWidth: 140,
  },
  userBadgeText: {
    color: colors.text,
    fontSize: font.size.xs,
    fontWeight: font.weight.bold,
  },
  switchUserBtn: {
    width: 36,
    height: 36,
    borderRadius: radius.pill,
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  errorBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    backgroundColor: 'rgba(255, 92, 122, 0.15)',
    borderColor: colors.danger,
    borderWidth: 1,
    marginHorizontal: spacing.lg,
    marginTop: spacing.sm,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: radius.md,
  },
  errorBannerText: {
    flex: 1,
    color: colors.danger,
    fontSize: font.size.xs,
    fontWeight: font.weight.semibold,
  },
  retryBtn: {
    paddingHorizontal: spacing.xs,
    paddingVertical: 2,
  },
  retryBtnText: {
    color: colors.danger,
    fontSize: font.size.xs,
    fontWeight: font.weight.bold,
    textDecorationLine: 'underline',
  },
  loadingBox: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.md,
  },
  loadingText: {
    color: colors.textMuted,
    fontSize: font.size.sm,
  },
  filterRow: { gap: spacing.sm, paddingHorizontal: spacing.lg, paddingVertical: spacing.md },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: radius.pill,
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
  },
  chipActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  chipText: { color: colors.textMuted, fontSize: font.size.sm, fontWeight: font.weight.semibold },
  chipTextActive: { color: colors.text },
  chipCount: {
    minWidth: 20,
    paddingHorizontal: 5,
    paddingVertical: 1,
    borderRadius: radius.pill,
    backgroundColor: colors.cardAlt,
    alignItems: 'center',
  },
  chipCountActive: { backgroundColor: 'rgba(255,255,255,0.25)' },
  chipCountText: { color: colors.textMuted, fontSize: 11, fontWeight: font.weight.bold },
  chipCountTextActive: { color: colors.text },
});
