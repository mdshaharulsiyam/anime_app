/**
 * A rich row for the My List screen: poster, episode progress bar, a big "+1"
 * button to log a finished episode, and a live airing countdown for ongoing
 * shows. This is the core "tracker" interaction.
 */
import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { Link } from 'expo-router';
import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { colors, font, radius, spacing } from '../constants/theme';
import { useCountdown } from '../lib/airing';
import { LibraryEntry, STATUS_META, useLibrary } from '../lib/library';

export function TrackerRow({ entry }: { entry: LibraryEntry }) {
  const { increment, decrement } = useLibrary();
  const ticking = useCountdown(entry.broadcast);
  const countdown = entry.airing ? ticking : null;

  const total = entry.episodes && entry.episodes > 0 ? entry.episodes : null;
  const pct = total ? Math.min(100, (entry.progress / total) * 100) : 0;
  const meta = STATUS_META[entry.status];
  const atMax = total ? entry.progress >= total : false;

  return (
    <View style={styles.row}>
      <Link href={`/anime/${entry.mal_id}`} asChild>
        <Pressable>
          <Image source={{ uri: entry.image }} style={styles.poster} contentFit="cover" />
        </Pressable>
      </Link>

      <View style={styles.body}>
        <Link href={`/anime/${entry.mal_id}`} asChild>
          <Pressable>
            <Text style={styles.title} numberOfLines={2}>
              {entry.title}
            </Text>
          </Pressable>
        </Link>

        <View style={styles.metaRow}>
          <View style={[styles.statusDot, { backgroundColor: meta.color }]} />
          <Text style={styles.metaText}>{meta.short}</Text>
          {countdown ? (
            <View style={styles.countdown}>
              <Ionicons name="time-outline" size={12} color={colors.accent} />
              <Text style={styles.countdownText}>Next ep in {countdown}</Text>
            </View>
          ) : null}
        </View>

        {/* Progress */}
        <Text style={styles.progressLabel}>
          Episode {entry.progress}
          {total ? ` / ${total}` : ''}
        </Text>
        <View style={styles.progressTrack}>
          <View style={[styles.progressFill, { width: `${pct}%` }]} />
        </View>
      </View>

      {/* +1 stepper */}
      <View style={styles.stepper}>
        <Pressable
          hitSlop={6}
          onPress={() => increment(entry.mal_id)}
          disabled={atMax}
          style={[styles.plusBtn, atMax && styles.plusBtnDisabled]}
        >
          <Ionicons name="add" size={22} color={colors.text} />
        </Pressable>
        <Pressable
          hitSlop={6}
          onPress={() => decrement(entry.mal_id)}
          disabled={entry.progress <= 0}
          style={[styles.minusBtn, entry.progress <= 0 && styles.minusDisabled]}
        >
          <Ionicons name="remove" size={16} color={colors.textMuted} />
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    gap: spacing.md,
    backgroundColor: colors.card,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.sm,
    marginBottom: spacing.md,
  },
  poster: { width: 64, height: 92, borderRadius: radius.md, backgroundColor: colors.cardAlt },
  body: { flex: 1, justifyContent: 'center', gap: 5 },
  title: { color: colors.text, fontSize: font.size.md, fontWeight: font.weight.bold, lineHeight: 19 },
  metaRow: { flexDirection: 'row', alignItems: 'center', gap: 6, flexWrap: 'wrap' },
  statusDot: { width: 8, height: 8, borderRadius: 4 },
  metaText: { color: colors.textMuted, fontSize: font.size.xs, fontWeight: font.weight.semibold },
  countdown: { flexDirection: 'row', alignItems: 'center', gap: 3 },
  countdownText: { color: colors.accent, fontSize: font.size.xs, fontWeight: font.weight.semibold },
  progressLabel: { color: colors.textFaint, fontSize: font.size.xs, marginTop: 2 },
  progressTrack: {
    height: 6,
    borderRadius: radius.pill,
    backgroundColor: colors.cardAlt,
    overflow: 'hidden',
  },
  progressFill: { height: '100%', borderRadius: radius.pill, backgroundColor: colors.primary },
  stepper: { alignItems: 'center', justifyContent: 'center', gap: spacing.sm },
  plusBtn: {
    width: 46,
    height: 46,
    borderRadius: radius.pill,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  plusBtnDisabled: { backgroundColor: colors.cardAlt },
  minusBtn: {
    width: 28,
    height: 28,
    borderRadius: radius.pill,
    backgroundColor: colors.cardAlt,
    alignItems: 'center',
    justifyContent: 'center',
  },
  minusDisabled: { opacity: 0.4 },
});
