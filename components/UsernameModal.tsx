import AsyncStorage from '@react-native-async-storage/async-storage';
import React, { useState } from 'react';
import {
  ActivityIndicator,
  Modal,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { colors, font, radius, spacing } from '../constants/theme';
import { loginOrRegisterUser, upsertAnime } from '../lib/api';
import { LibraryEntry } from '../lib/library';

const LEGACY_STORAGE_KEY = 'Shiori:library:v1';

interface UsernameModalProps {
  visible: boolean;
  onSuccess: (username: string) => Promise<void>;
}

export function UsernameModal({ visible, onSuccess }: UsernameModalProps) {
  const [usernameInput, setUsernameInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [statusMessage, setStatusMessage] = useState('');
  const [errorMessage, setErrorMessage] = useState('');

  const handleSubmit = async () => {
    const trimmed = usernameInput.trim();
    if (!trimmed) {
      setErrorMessage('Please enter a valid username');
      return;
    }

    if (trimmed.length < 2) {
      setErrorMessage('Username must be at least 2 characters long');
      return;
    }

    setLoading(true);
    setErrorMessage('');
    setStatusMessage('Authenticating...');

    try {
      // 1. Login or register user with backend
      const userObj = await loginOrRegisterUser(trimmed);
      const activeUsername = userObj.username;

      // 2. Legacy Data Migration
      setStatusMessage('Checking for local anime data...');
      const rawLegacy = await AsyncStorage.getItem(LEGACY_STORAGE_KEY);
      if (rawLegacy) {
        try {
          const legacyItems: LibraryEntry[] = JSON.parse(rawLegacy);
          if (Array.isArray(legacyItems) && legacyItems.length > 0) {
            setStatusMessage(`Syncing ${legacyItems.length} legacy items to your cloud list...`);
            for (const item of legacyItems) {
              await upsertAnime(activeUsername, item);
            }
            // Safely clear legacy array after sync
            await AsyncStorage.removeItem(LEGACY_STORAGE_KEY);
          }
        } catch (migErr) {
          console.warn('[Migration Warning] Failed migrating legacy storage:', migErr);
        }
      }

      setStatusMessage('Loading your anime list...');
      await onSuccess(activeUsername);
      setUsernameInput('');
    } catch (err: any) {
      setErrorMessage(err.message || 'Connection failed. Please check your backend.');
    } finally {
      setLoading(false);
      setStatusMessage('');
    }
  };

  return (
    <Modal visible={visible} animationType="fade" transparent statusBarTranslucent>
      <View style={styles.overlay}>
        <View style={styles.modalCard}>
          <Text style={styles.title}>Welcome to Anime Tracker</Text>
          <Text style={styles.subtitle}>
            Enter your unique username to sync your anime collection across devices.
          </Text>

          {errorMessage ? (
            <View style={styles.errorBox}>
              <Text style={styles.errorText}>{errorMessage}</Text>
            </View>
          ) : null}

          {statusMessage && loading ? (
            <View style={styles.statusBox}>
              <ActivityIndicator size="small" color={colors.primary} />
              <Text style={styles.statusText}>{statusMessage}</Text>
            </View>
          ) : null}

          <View style={styles.inputWrap}>
            <TextInput
              style={styles.input}
              placeholder="e.g. animefan99"
              placeholderTextColor={colors.textFaint}
              value={usernameInput}
              onChangeText={(text) => {
                setUsernameInput(text);
                if (errorMessage) setErrorMessage('');
              }}
              autoCapitalize="none"
              autoCorrect={false}
              editable={!loading}
            />
          </View>

          <Pressable
            style={({ pressed }) => [
              styles.submitBtn,
              pressed && styles.submitBtnPressed,
              loading && styles.submitBtnDisabled,
            ]}
            onPress={handleSubmit}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color={colors.text} size="small" />
            ) : (
              <Text style={styles.submitBtnText}>Get Started</Text>
            )}
          </Pressable>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.82)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.lg,
  },
  modalCard: {
    width: '100%',
    maxWidth: 400,
    backgroundColor: colors.bgElevated,
    borderRadius: radius.xl,
    padding: spacing.xl,
    borderWidth: 1,
    borderColor: colors.border,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.5,
    shadowRadius: 20,
    elevation: 10,
  },
  title: {
    color: colors.text,
    fontSize: font.size.xl,
    fontWeight: font.weight.heavy,
    marginBottom: spacing.xs,
  },
  subtitle: {
    color: colors.textMuted,
    fontSize: font.size.sm,
    lineHeight: 20,
    marginBottom: spacing.lg,
  },
  errorBox: {
    backgroundColor: 'rgba(255, 92, 122, 0.15)',
    borderColor: colors.danger,
    borderWidth: 1,
    borderRadius: radius.md,
    padding: spacing.md,
    marginBottom: spacing.md,
  },
  errorText: {
    color: colors.danger,
    fontSize: font.size.sm,
    fontWeight: font.weight.semibold,
  },
  statusBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    backgroundColor: colors.cardAlt,
    borderRadius: radius.md,
    padding: spacing.md,
    marginBottom: spacing.md,
  },
  statusText: {
    color: colors.primary,
    fontSize: font.size.xs,
    fontWeight: font.weight.semibold,
  },
  inputWrap: {
    marginBottom: spacing.lg,
  },
  input: {
    backgroundColor: colors.card,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    color: colors.text,
    fontSize: font.size.md,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
  },
  submitBtn: {
    backgroundColor: colors.primary,
    borderRadius: radius.pill,
    paddingVertical: spacing.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  submitBtnPressed: {
    opacity: 0.85,
  },
  submitBtnDisabled: {
    opacity: 0.6,
  },
  submitBtnText: {
    color: colors.text,
    fontSize: font.size.md,
    fontWeight: font.weight.bold,
  },
});
