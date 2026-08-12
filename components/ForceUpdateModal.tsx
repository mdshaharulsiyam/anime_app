import { Ionicons } from '@expo/vector-icons';
import React from 'react';
import {
  Linking,
  Modal,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { colors, font, radius, spacing } from '../constants/theme';

export interface VersionErrorDetails {
  minVersion: string;
  currentVersion: string;
  downloadUrl: string;
  message?: string;
}

interface ForceUpdateModalProps {
  visible: boolean;
  details: VersionErrorDetails | null;
}

export function ForceUpdateModal({ visible, details }: ForceUpdateModalProps) {
  if (!details) return null;

  const handleUpdatePress = () => {
    if (details.downloadUrl) {
      Linking.openURL(details.downloadUrl).catch((err) =>
        console.error('Failed to open update URL:', err)
      );
    }
  };

  return (
    <Modal
      visible={visible}
      animationType="fade"
      transparent={false}
      statusBarTranslucent
      onRequestClose={() => {
        // Prevent hardware back button from closing on Android
      }}
    >
      <View style={styles.container}>
        <View style={styles.contentCard}>
          <View style={styles.iconCircle}>
            <Ionicons name="cloud-download-outline" size={44} color={colors.primary} />
          </View>

          <Text style={styles.title}>Update Required</Text>
          <Text style={styles.message}>
            {details.message || 'A mandatory update is required to continue using the application.'}
          </Text>

          <View style={styles.versionBadgeRow}>
            <View style={styles.versionBadge}>
              <Text style={styles.versionBadgeLabel}>Your Version</Text>
              <Text style={styles.versionBadgeValue}>{details.currentVersion}</Text>
            </View>

            <View style={styles.versionBadgeDivider} />

            <View style={styles.versionBadge}>
              <Text style={styles.versionBadgeLabel}>Required</Text>
              <Text style={[styles.versionBadgeValue, { color: colors.primary }]}>
                v{details.minVersion}
              </Text>
            </View>
          </View>

          <Pressable
            style={({ pressed }) => [styles.updateBtn, pressed && styles.updateBtnPressed]}
            onPress={handleUpdatePress}
          >
            <Ionicons name="arrow-down-circle-outline" size={20} color={colors.text} />
            <Text style={styles.updateBtnText}>Update Now</Text>
          </Pressable>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.bg,
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.xl,
  },
  contentCard: {
    width: '100%',
    maxWidth: 400,
    backgroundColor: colors.bgElevated,
    borderRadius: radius.xl,
    padding: spacing.xl,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.border,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.5,
    shadowRadius: 20,
    elevation: 10,
  },
  iconCircle: {
    width: 80,
    height: 80,
    borderRadius: radius.pill,
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.lg,
  },
  title: {
    color: colors.text,
    fontSize: font.size.xxl,
    fontWeight: font.weight.heavy,
    marginBottom: spacing.xs,
    textAlign: 'center',
  },
  message: {
    color: colors.textMuted,
    fontSize: font.size.sm,
    lineHeight: 22,
    textAlign: 'center',
    marginBottom: spacing.xl,
  },
  versionBadgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.card,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    marginBottom: spacing.xl,
    width: '100%',
  },
  versionBadge: {
    flex: 1,
    alignItems: 'center',
  },
  versionBadgeLabel: {
    color: colors.textFaint,
    fontSize: font.size.xs,
    fontWeight: font.weight.semibold,
    marginBottom: 2,
  },
  versionBadgeValue: {
    color: colors.text,
    fontSize: font.size.md,
    fontWeight: font.weight.bold,
  },
  versionBadgeDivider: {
    width: 1,
    height: 28,
    backgroundColor: colors.border,
  },
  updateBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs,
    width: '100%',
    backgroundColor: colors.primary,
    borderRadius: radius.pill,
    paddingVertical: spacing.md,
  },
  updateBtnPressed: {
    opacity: 0.85,
  },
  updateBtnText: {
    color: colors.text,
    fontSize: font.size.md,
    fontWeight: font.weight.bold,
  },
});
