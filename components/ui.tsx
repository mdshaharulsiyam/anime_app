/**
 * Small shared UI atoms: pills, score badge, section header, and the
 * loading / error / empty states reused across screens.
 */
import { Ionicons } from '@expo/vector-icons';
import React from 'react';
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  View,
  ViewStyle,
} from 'react-native';
import { colors, font, radius, spacing } from '../constants/theme';

export function Pill({ label, tint }: { label: string; tint?: string }) {
  return (
    <View style={[styles.pill, tint ? { borderColor: tint } : null]}>
      <Text style={[styles.pillText, tint ? { color: tint } : null]} numberOfLines={1}>
        {label}
      </Text>
    </View>
  );
}

export function ScoreBadge({ score, size = 'md' }: { score: number | null; size?: 'sm' | 'md' }) {
  const small = size === 'sm';
  return (
    <View style={[styles.score, small && styles.scoreSm]}>
      <Ionicons name="star" size={small ? 10 : 13} color={colors.star} />
      <Text style={[styles.scoreText, small && styles.scoreTextSm]}>
        {score ? score.toFixed(2) : 'N/A'}
      </Text>
    </View>
  );
}

export function SectionHeader({
  title,
  subtitle,
  style,
}: {
  title: string;
  subtitle?: string;
  style?: ViewStyle;
}) {
  return (
    <View style={[styles.sectionHeader, style]}>
      <View style={styles.sectionBar} />
      <View style={{ flex: 1 }}>
        <Text style={styles.sectionTitle}>{title}</Text>
        {subtitle ? <Text style={styles.sectionSubtitle}>{subtitle}</Text> : null}
      </View>
    </View>
  );
}

export function Loading({ label }: { label?: string }) {
  return (
    <View style={styles.center}>
      <ActivityIndicator color={colors.primary} size="large" />
      {label ? <Text style={styles.stateText}>{label}</Text> : null}
    </View>
  );
}

export function ErrorState({ message, onRetry }: { message: string; onRetry?: () => void }) {
  return (
    <View style={styles.center}>
      <Ionicons name="cloud-offline-outline" size={42} color={colors.textFaint} />
      <Text style={styles.stateTitle}>Something went wrong</Text>
      <Text style={styles.stateText}>{message}</Text>
      {onRetry ? (
        <Pressable style={styles.retryBtn} onPress={onRetry}>
          <Ionicons name="refresh" size={16} color={colors.text} />
          <Text style={styles.retryText}>Try again</Text>
        </Pressable>
      ) : null}
    </View>
  );
}

export function EmptyState({
  icon = 'sparkles-outline',
  title,
  message,
}: {
  icon?: keyof typeof Ionicons.glyphMap;
  title: string;
  message?: string;
}) {
  return (
    <View style={styles.center}>
      <Ionicons name={icon} size={42} color={colors.textFaint} />
      <Text style={styles.stateTitle}>{title}</Text>
      {message ? <Text style={styles.stateText}>{message}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  pill: {
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.cardAlt,
    paddingHorizontal: spacing.md,
    paddingVertical: 5,
    borderRadius: radius.pill,
  },
  pillText: {
    color: colors.textMuted,
    fontSize: font.size.xs,
    fontWeight: font.weight.semibold,
  },
  score: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: colors.overlay,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: radius.pill,
  },
  scoreSm: { paddingHorizontal: 6, paddingVertical: 2 },
  scoreText: { color: colors.text, fontSize: font.size.sm, fontWeight: font.weight.bold },
  scoreTextSm: { fontSize: font.size.xs },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    marginBottom: spacing.md,
  },
  sectionBar: {
    width: 4,
    height: 22,
    borderRadius: radius.pill,
    backgroundColor: colors.primary,
  },
  sectionTitle: {
    color: colors.text,
    fontSize: font.size.lg,
    fontWeight: font.weight.bold,
  },
  sectionSubtitle: {
    color: colors.textMuted,
    fontSize: font.size.sm,
    marginTop: 2,
  },
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.xl,
    gap: spacing.sm,
    minHeight: 220,
  },
  stateTitle: {
    color: colors.text,
    fontSize: font.size.lg,
    fontWeight: font.weight.bold,
    marginTop: spacing.sm,
  },
  stateText: {
    color: colors.textMuted,
    fontSize: font.size.sm,
    textAlign: 'center',
    lineHeight: 20,
  },
  retryBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: colors.primary,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    borderRadius: radius.pill,
    marginTop: spacing.md,
  },
  retryText: { color: colors.text, fontWeight: font.weight.semibold, fontSize: font.size.sm },
});
