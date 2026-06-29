/**
 * Poster-style cards for anime. `AnimeCard` is the vertical grid/carousel poster;
 * `AnimeListItem` is the horizontal row used in search results.
 */
import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { Link } from 'expo-router';
import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { coverImage } from '../lib/api';
import { toFavorite, useFavorites } from '../lib/favorites';
import { Anime } from '../lib/types';
import { colors, font, radius, spacing } from '../constants/theme';
import { ScoreBadge } from './ui';

const BLUR_HASH = 'L6Pj0^jE.AyE_3t7t7R**0o#DgR4';

function HeartButton({ anime, image }: { anime: Anime; image: string }) {
  const { isFavorite, toggle } = useFavorites();
  const active = isFavorite(anime.mal_id);
  return (
    <Pressable
      hitSlop={8}
      onPress={() => toggle(toFavorite(anime, image))}
      style={styles.heart}
    >
      <Ionicons
        name={active ? 'heart' : 'heart-outline'}
        size={16}
        color={active ? colors.danger : colors.text}
      />
    </Pressable>
  );
}

export function AnimeCard({ anime, width = 150 }: { anime: Anime; width?: number }) {
  const image = coverImage(anime.images);
  const title = anime.title_english || anime.title;
  return (
    <Link href={`/anime/${anime.mal_id}`} asChild>
      <Pressable style={StyleSheet.flatten([styles.card, { width }])}>
        <View style={[styles.posterWrap, { height: width * 1.45 }]}>
          <Image
            source={{ uri: image }}
            style={styles.poster}
            contentFit="cover"
            transition={250}
            placeholder={{ blurhash: BLUR_HASH }}
          />
          <View style={styles.scoreFloat}>
            <ScoreBadge score={anime.score} size="sm" />
          </View>
          <HeartButton anime={anime} image={image} />
          {anime.rank ? (
            <View style={styles.rankBadge}>
              <Text style={styles.rankText}>#{anime.rank}</Text>
            </View>
          ) : null}
        </View>
        <Text style={styles.title} numberOfLines={2}>
          {title}
        </Text>
        <Text style={styles.meta} numberOfLines={1}>
          {[anime.type, anime.year || (anime.airing ? 'Airing' : null)]
            .filter(Boolean)
            .join(' • ')}
        </Text>
      </Pressable>
    </Link>
  );
}

export function AnimeListItem({ anime }: { anime: Anime }) {
  const image = coverImage(anime.images);
  const title = anime.title_english || anime.title;
  const genres = anime.genres?.slice(0, 3).map((g) => g.name).join(', ');
  return (
    <Link href={`/anime/${anime.mal_id}`} asChild>
      <Pressable style={styles.row}>
        <Image
          source={{ uri: image }}
          style={styles.rowPoster}
          contentFit="cover"
          transition={200}
          placeholder={{ blurhash: BLUR_HASH }}
        />
        <View style={styles.rowBody}>
          <Text style={styles.rowTitle} numberOfLines={2}>
            {title}
          </Text>
          <View style={styles.rowMetaLine}>
            <ScoreBadge score={anime.score} size="sm" />
            <Text style={styles.meta} numberOfLines={1}>
              {[anime.type, anime.episodes ? `${anime.episodes} eps` : null, anime.year]
                .filter(Boolean)
                .join(' • ')}
            </Text>
          </View>
          {genres ? (
            <Text style={styles.rowGenres} numberOfLines={1}>
              {genres}
            </Text>
          ) : null}
          {anime.synopsis ? (
            <Text style={styles.rowSynopsis} numberOfLines={2}>
              {anime.synopsis}
            </Text>
          ) : null}
        </View>
        <HeartButton anime={anime} image={image} />
      </Pressable>
    </Link>
  );
}

const styles = StyleSheet.create({
  card: { marginRight: spacing.md },
  posterWrap: {
    borderRadius: radius.lg,
    overflow: 'hidden',
    backgroundColor: colors.card,
  },
  poster: { width: '100%', height: '100%' },
  scoreFloat: { position: 'absolute', left: 8, bottom: 8 },
  heart: {
    position: 'absolute',
    top: 8,
    right: 8,
    width: 30,
    height: 30,
    borderRadius: radius.pill,
    backgroundColor: colors.overlay,
    alignItems: 'center',
    justifyContent: 'center',
  },
  rankBadge: {
    position: 'absolute',
    top: 8,
    left: 8,
    backgroundColor: colors.primary,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: radius.pill,
  },
  rankText: { color: colors.text, fontSize: font.size.xs, fontWeight: font.weight.bold },
  title: {
    color: colors.text,
    fontSize: font.size.sm,
    fontWeight: font.weight.semibold,
    marginTop: spacing.sm,
    lineHeight: 18,
  },
  meta: { color: colors.textMuted, fontSize: font.size.xs, marginTop: 2 },
  row: {
    flexDirection: 'row',
    backgroundColor: colors.card,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.sm,
    marginBottom: spacing.md,
    gap: spacing.md,
  },
  rowPoster: {
    width: 84,
    height: 116,
    borderRadius: radius.md,
    backgroundColor: colors.cardAlt,
  },
  rowBody: { flex: 1, paddingRight: spacing.lg },
  rowTitle: {
    color: colors.text,
    fontSize: font.size.md,
    fontWeight: font.weight.bold,
    lineHeight: 20,
  },
  rowMetaLine: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginTop: 6,
  },
  rowGenres: { color: colors.accent, fontSize: font.size.xs, marginTop: 6 },
  rowSynopsis: {
    color: colors.textFaint,
    fontSize: font.size.xs,
    lineHeight: 17,
    marginTop: 6,
  },
});
