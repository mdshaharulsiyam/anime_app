import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { useLocalSearchParams, useRouter, Link } from 'expo-router';
import React, { useState } from 'react';
import {
  Dimensions,
  FlatList,
  Linking,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ErrorState, Loading, Pill, ScoreBadge, SectionHeader } from '../../components/ui';
import { colors, font, radius, spacing } from '../../constants/theme';
import { coverImage, jikan } from '../../lib/api';
import { toFavorite, useFavorites } from '../../lib/favorites';
import { useAsync } from '../../lib/hooks';

const { width: SCREEN_W } = Dimensions.get('window');
const BACKDROP_H = SCREEN_W * 0.95;

function Stat({ icon, label, value }: { icon: keyof typeof Ionicons.glyphMap; label: string; value: string }) {
  return (
    <View style={styles.stat}>
      <Ionicons name={icon} size={18} color={colors.primary} />
      <Text style={styles.statValue} numberOfLines={1}>
        {value}
      </Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );
}

function fmtCount(n: number | null): string {
  if (!n) return '—';
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return String(n);
}

export default function AnimeDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const animeId = Number(id);
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { isFavorite, toggle } = useFavorites();
  const [expanded, setExpanded] = useState(false);

  const { data, loading, error, reload } = useAsync(() => jikan.animeFull(animeId), [animeId]);
  const { data: chars } = useAsync(() => jikan.animeCharacters(animeId), [animeId]);
  const { data: recs } = useAsync(() => jikan.animeRecommendations(animeId), [animeId]);

  if (loading) return <Loading label="Loading details…" />;
  if (error || !data) return <ErrorState message={error || 'Not found'} onRetry={reload} />;

  const anime = data.data;
  const image = coverImage(anime.images);
  const fav = isFavorite(anime.mal_id);
  const characters = (chars?.data ?? []).filter((c) => c.role === 'Main' || c.role === 'Supporting').slice(0, 15);
  const recommendations = (recs?.data ?? []).slice(0, 12);

  return (
    <View style={styles.container}>
      {/* Floating back / favorite controls */}
      <View style={[styles.floatBar, { top: insets.top + spacing.sm }]}>
        <Pressable style={styles.circleBtn} onPress={() => router.back()} hitSlop={8}>
          <Ionicons name="chevron-back" size={22} color={colors.text} />
        </Pressable>
        <Pressable
          style={styles.circleBtn}
          hitSlop={8}
          onPress={() => toggle(toFavorite(anime, image))}
        >
          <Ionicons
            name={fav ? 'heart' : 'heart-outline'}
            size={22}
            color={fav ? colors.danger : colors.text}
          />
        </Pressable>
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: spacing.xxl }}>
        {/* Backdrop */}
        <View style={styles.backdrop}>
          <Image source={{ uri: image }} style={StyleSheet.absoluteFill} contentFit="cover" blurRadius={2} />
          <View style={styles.backdropShade} />
          <View style={styles.headerRow}>
            <Image source={{ uri: image }} style={styles.poster} contentFit="cover" />
            <View style={styles.headerInfo}>
              <Text style={styles.title} numberOfLines={3}>
                {anime.title_english || anime.title}
              </Text>
              {anime.title_japanese ? (
                <Text style={styles.titleJp} numberOfLines={1}>
                  {anime.title_japanese}
                </Text>
              ) : null}
              <View style={styles.headerBadges}>
                <ScoreBadge score={anime.score} />
                {anime.rank ? (
                  <View style={styles.rankPill}>
                    <Ionicons name="trophy" size={12} color={colors.star} />
                    <Text style={styles.rankPillText}>Rank #{anime.rank}</Text>
                  </View>
                ) : null}
              </View>
            </View>
          </View>
        </View>

        {/* Trailer / MAL actions */}
        <View style={styles.actions}>
          {anime.trailer?.url ? (
            <Pressable
              style={[styles.actionBtn, styles.actionPrimary]}
              onPress={() => Linking.openURL(anime.trailer!.url!)}
            >
              <Ionicons name="play" size={16} color={colors.text} />
              <Text style={styles.actionText}>Watch Trailer</Text>
            </Pressable>
          ) : null}
          <Pressable
            style={[styles.actionBtn, styles.actionSecondary]}
            onPress={() => Linking.openURL(anime.url)}
          >
            <Ionicons name="open-outline" size={16} color={colors.text} />
            <Text style={styles.actionText}>MyAnimeList</Text>
          </Pressable>
        </View>

        {/* Stats */}
        <View style={styles.statsRow}>
          <Stat icon="tv-outline" label="Type" value={anime.type || '—'} />
          <Stat
            icon="albums-outline"
            label="Episodes"
            value={anime.episodes ? String(anime.episodes) : '—'}
          />
          <Stat
            icon="pulse-outline"
            label="Status"
            value={anime.airing ? 'Airing' : anime.status?.replace('Finished Airing', 'Finished') || '—'}
          />
          <Stat icon="people-outline" label="Members" value={fmtCount(anime.members)} />
        </View>

        {/* Genres */}
        {anime.genres?.length ? (
          <View style={styles.block}>
            <View style={styles.pillWrap}>
              {[...anime.genres, ...(anime.themes ?? [])].map((g) => (
                <Pill key={`${g.type}-${g.mal_id}`} label={g.name} tint={colors.accent} />
              ))}
            </View>
          </View>
        ) : null}

        {/* Synopsis */}
        {anime.synopsis ? (
          <View style={styles.block}>
            <SectionHeader title="Synopsis" />
            <Text style={styles.synopsis} numberOfLines={expanded ? undefined : 5}>
              {anime.synopsis}
            </Text>
            {anime.synopsis.length > 240 ? (
              <Pressable onPress={() => setExpanded((e) => !e)}>
                <Text style={styles.readMore}>{expanded ? 'Show less' : 'Read more'}</Text>
              </Pressable>
            ) : null}
          </View>
        ) : null}

        {/* Info grid */}
        <View style={styles.block}>
          <SectionHeader title="Information" />
          <View style={styles.infoCard}>
            <InfoRow label="Aired" value={anime.aired?.string || '—'} />
            <InfoRow label="Season" value={[anime.season, anime.year].filter(Boolean).join(' ') || '—'} />
            <InfoRow label="Studios" value={anime.studios?.map((s) => s.name).join(', ') || '—'} />
            <InfoRow label="Source" value={anime.source || '—'} />
            <InfoRow label="Duration" value={anime.duration || '—'} />
            <InfoRow label="Rating" value={anime.rating || '—'} last />
          </View>
        </View>

        {/* Characters */}
        {characters.length ? (
          <View style={styles.block}>
            <SectionHeader title="Characters" subtitle="Main & supporting cast" />
            <FlatList
              data={characters}
              horizontal
              showsHorizontalScrollIndicator={false}
              keyExtractor={(c) => String(c.character.mal_id)}
              contentContainerStyle={{ gap: spacing.md }}
              renderItem={({ item }) => (
                <View style={styles.charCard}>
                  <Image
                    source={{ uri: coverImage(item.character.images) }}
                    style={styles.charImg}
                    contentFit="cover"
                  />
                  <Text style={styles.charName} numberOfLines={2}>
                    {item.character.name}
                  </Text>
                  <Text style={styles.charRole}>{item.role}</Text>
                </View>
              )}
            />
          </View>
        ) : null}

        {/* Recommendations */}
        {recommendations.length ? (
          <View style={styles.block}>
            <SectionHeader title="More like this" subtitle="Recommended by fans" />
            <FlatList
              data={recommendations}
              horizontal
              showsHorizontalScrollIndicator={false}
              keyExtractor={(r) => String(r.entry.mal_id)}
              contentContainerStyle={{ gap: spacing.md }}
              renderItem={({ item }) => (
                <Link href={`/anime/${item.entry.mal_id}`} asChild>
                  <Pressable style={styles.recCard}>
                    <Image
                      source={{ uri: coverImage(item.entry.images) }}
                      style={styles.recImg}
                      contentFit="cover"
                    />
                    <Text style={styles.recTitle} numberOfLines={2}>
                      {item.entry.title}
                    </Text>
                  </Pressable>
                </Link>
              )}
            />
          </View>
        ) : null}
      </ScrollView>
    </View>
  );
}

function InfoRow({ label, value, last }: { label: string; value: string; last?: boolean }) {
  return (
    <View style={[styles.infoRow, last && { borderBottomWidth: 0 }]}>
      <Text style={styles.infoLabel}>{label}</Text>
      <Text style={styles.infoValue}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  floatBar: {
    position: 'absolute',
    left: spacing.lg,
    right: spacing.lg,
    zIndex: 10,
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  circleBtn: {
    width: 40,
    height: 40,
    borderRadius: radius.pill,
    backgroundColor: colors.overlay,
    alignItems: 'center',
    justifyContent: 'center',
  },
  backdrop: { height: BACKDROP_H, justifyContent: 'flex-end' },
  backdropShade: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(11,16,32,0.55)',
  },
  headerRow: {
    flexDirection: 'row',
    gap: spacing.lg,
    padding: spacing.lg,
    alignItems: 'flex-end',
  },
  poster: {
    width: 120,
    height: 174,
    borderRadius: radius.lg,
    borderWidth: 2,
    borderColor: colors.border,
    backgroundColor: colors.card,
  },
  headerInfo: { flex: 1, gap: spacing.sm },
  title: {
    color: colors.text,
    fontSize: font.size.xl,
    fontWeight: font.weight.heavy,
    textShadowColor: 'rgba(0,0,0,0.7)',
    textShadowRadius: 8,
  },
  titleJp: { color: colors.textMuted, fontSize: font.size.sm },
  headerBadges: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, flexWrap: 'wrap' },
  rankPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: colors.overlay,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: radius.pill,
  },
  rankPillText: { color: colors.text, fontSize: font.size.xs, fontWeight: font.weight.bold },
  actions: { flexDirection: 'row', gap: spacing.md, padding: spacing.lg, paddingBottom: 0 },
  actionBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    height: 46,
    borderRadius: radius.md,
  },
  actionPrimary: { backgroundColor: colors.primary },
  actionSecondary: { backgroundColor: colors.card, borderWidth: 1, borderColor: colors.border },
  actionText: { color: colors.text, fontWeight: font.weight.bold, fontSize: font.size.sm },
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: spacing.sm,
    padding: spacing.lg,
  },
  stat: {
    flex: 1,
    alignItems: 'center',
    gap: 4,
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    paddingVertical: spacing.md,
    paddingHorizontal: 4,
  },
  statValue: { color: colors.text, fontSize: font.size.sm, fontWeight: font.weight.bold },
  statLabel: { color: colors.textFaint, fontSize: 10, fontWeight: font.weight.semibold },
  block: { paddingHorizontal: spacing.lg, marginTop: spacing.lg },
  pillWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  synopsis: { color: colors.textMuted, fontSize: font.size.sm, lineHeight: 22 },
  readMore: { color: colors.primary, fontWeight: font.weight.bold, marginTop: spacing.sm, fontSize: font.size.sm },
  infoCard: {
    backgroundColor: colors.card,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: spacing.lg,
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: spacing.lg,
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  infoLabel: { color: colors.textFaint, fontSize: font.size.sm, fontWeight: font.weight.semibold },
  infoValue: { color: colors.text, fontSize: font.size.sm, flex: 1, textAlign: 'right' },
  charCard: { width: 92 },
  charImg: {
    width: 92,
    height: 128,
    borderRadius: radius.md,
    backgroundColor: colors.card,
  },
  charName: { color: colors.text, fontSize: font.size.xs, fontWeight: font.weight.semibold, marginTop: 6 },
  charRole: { color: colors.textFaint, fontSize: 10, marginTop: 2 },
  recCard: { width: 120 },
  recImg: {
    width: 120,
    height: 174,
    borderRadius: radius.md,
    backgroundColor: colors.card,
  },
  recTitle: { color: colors.text, fontSize: font.size.xs, fontWeight: font.weight.medium, marginTop: 6 },
});
