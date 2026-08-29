import AsyncStorage from '@react-native-async-storage/async-storage';
import { Ionicons } from '@expo/vector-icons';
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
import { ApiError, loginUser, registerUser, upsertAnime } from '../lib/api';
import { LibraryEntry } from '../lib/library';

const LEGACY_STORAGE_KEY = 'Shiori:library:v1';

interface UsernameModalProps {
  visible: boolean;
  onSuccess: (username: string, passkey: string) => Promise<void>;
  onClose?: () => void;
}

export function UsernameModal({ visible, onSuccess, onClose }: UsernameModalProps) {
  const [usernameInput, setUsernameInput] = useState('');
  const [passkeyInput, setPasskeyInput] = useState('');
  const [showPasskey, setShowPasskey] = useState(false);
  const [loading, setLoading] = useState(false);
  const [statusMessage, setStatusMessage] = useState('');
  const [errorMessage, setErrorMessage] = useState('');
  const [canCreateUser, setCanCreateUser] = useState(false);

  const validateInputs = () => {
    const trimmedUser = usernameInput.trim();
    const trimmedKey = passkeyInput.trim();

    if (!trimmedUser) {
      setErrorMessage('Please enter a valid username');
      return null;
    }
    if (trimmedUser.length < 2) {
      setErrorMessage('Username must be at least 2 characters long');
      return null;
    }
    if (!trimmedKey) {
      setErrorMessage('Please enter a passkey');
      return null;
    }
    if (trimmedKey.length < 3) {
      setErrorMessage('Passkey must be at least 3 characters long');
      return null;
    }

    return { username: trimmedUser, passkey: trimmedKey };
  };

  const handlePostAuth = async (activeUsername: string, activePasskey: string) => {
    // Legacy Data Migration if present
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
          await AsyncStorage.removeItem(LEGACY_STORAGE_KEY);
        }
      } catch (migErr) {
        console.warn('[Migration Warning] Failed migrating legacy storage:', migErr);
      }
    }

    setStatusMessage('Loading your anime list...');
    await onSuccess(activeUsername, activePasskey);
    setUsernameInput('');
    setPasskeyInput('');
    setCanCreateUser(false);
  };

  // 1. "Get Started" (Login attempt)
  const handleLogin = async () => {
    const validated = validateInputs();
    if (!validated) return;

    setLoading(true);
    setErrorMessage('');
    setCanCreateUser(false);
    setStatusMessage('Checking credentials...');

    try {
      const userObj = await loginUser(validated.username, validated.passkey);
      await handlePostAuth(userObj.username, validated.passkey);
    } catch (err: any) {
      if (err instanceof ApiError && (err.status === 404 || err.code === 'USER_NOT_FOUND')) {
        setErrorMessage(`User "@${validated.username}" doesn't exist.`);
        setCanCreateUser(true);
      } else if (err instanceof ApiError && (err.status === 401 || err.code === 'INVALID_PASSKEY')) {
        setErrorMessage('Incorrect passkey for this username.');
        setCanCreateUser(false);
      } else {
        setErrorMessage(err.message || 'Connection failed. Please check your backend.');
        setCanCreateUser(false);
      }
    } finally {
      setLoading(false);
      setStatusMessage('');
    }
  };

  // 2. "Create User" (Explicit Registration)
  const handleRegister = async () => {
    const validated = validateInputs();
    if (!validated) return;

    setLoading(true);
    setErrorMessage('');
    setStatusMessage('Creating your account...');

    try {
      const userObj = await registerUser(validated.username, validated.passkey);
      await handlePostAuth(userObj.username, validated.passkey);
    } catch (err: any) {
      if (err instanceof ApiError && (err.status === 409 || err.code === 'USER_ALREADY_EXISTS')) {
        setErrorMessage('Username is already taken. Please pick another.');
        setCanCreateUser(false);
      } else {
        setErrorMessage(err.message || 'Registration failed. Please try again.');
      }
    } finally {
      setLoading(false);
      setStatusMessage('');
    }
  };

  return (
    <Modal visible={visible} animationType="fade" transparent statusBarTranslucent onRequestClose={onClose}>
      <View style={styles.overlay}>
        <View style={styles.modalCard}>
          {onClose ? (
            <Pressable
              style={styles.closeBtn}
              onPress={onClose}
              hitSlop={10}
              accessibilityLabel="Close"
            >
              <Ionicons name="close" size={22} color={colors.textMuted} />
            </Pressable>
          ) : null}

          <Text style={styles.title}>Anime Tracker Sync</Text>
          <Text style={styles.subtitle}>
            Sign in with your username and passkey to backup & sync your anime across all devices. Or continue using offline storage!
          </Text>

          {errorMessage ? (
            <View style={styles.errorBox}>
              <Ionicons name="alert-circle" size={18} color={colors.danger} />
              <Text style={styles.errorText}>{errorMessage}</Text>
            </View>
          ) : null}

          {statusMessage && loading ? (
            <View style={styles.statusBox}>
              <ActivityIndicator size="small" color={colors.primary} />
              <Text style={styles.statusText}>{statusMessage}</Text>
            </View>
          ) : null}

          {/* Username Field */}
          <View style={styles.inputWrap}>
            <Text style={styles.inputLabel}>Username</Text>
            <View style={styles.inputContainer}>
              <Ionicons name="person-outline" size={18} color={colors.textMuted} style={styles.inputIcon} />
              <TextInput
                style={styles.input}
                placeholder="e.g. animefan99"
                placeholderTextColor={colors.textFaint}
                value={usernameInput}
                onChangeText={(text) => {
                  setUsernameInput(text);
                  if (errorMessage) setErrorMessage('');
                  if (canCreateUser) setCanCreateUser(false);
                }}
                autoCapitalize="none"
                autoCorrect={false}
                editable={!loading}
              />
            </View>
          </View>

          {/* Passkey Field */}
          <View style={styles.inputWrap}>
            <Text style={styles.inputLabel}>Passkey</Text>
            <View style={styles.inputContainer}>
              <Ionicons name="key-outline" size={18} color={colors.textMuted} style={styles.inputIcon} />
              <TextInput
                style={styles.input}
                placeholder="Enter your passkey"
                placeholderTextColor={colors.textFaint}
                value={passkeyInput}
                onChangeText={(text) => {
                  setPasskeyInput(text);
                  if (errorMessage) setErrorMessage('');
                }}
                secureTextEntry={!showPasskey}
                autoCapitalize="none"
                autoCorrect={false}
                editable={!loading}
              />
              <Pressable
                onPress={() => setShowPasskey((prev) => !prev)}
                style={styles.eyeBtn}
                hitSlop={8}
              >
                <Ionicons
                  name={showPasskey ? 'eye-off-outline' : 'eye-outline'}
                  size={20}
                  color={colors.textMuted}
                />
              </Pressable>
            </View>
          </View>

          {/* Primary Action Button (Get Started / Login) */}
          <Pressable
            style={({ pressed }) => [
              styles.submitBtn,
              pressed && styles.submitBtnPressed,
              loading && styles.submitBtnDisabled,
            ]}
            onPress={handleLogin}
            disabled={loading}
          >
            {loading && !canCreateUser ? (
              <ActivityIndicator color={colors.text} size="small" />
            ) : (
              <Text style={styles.submitBtnText}>Get Started</Text>
            )}
          </Pressable>

          {/* Create User Button - Visible when user doesn't exist */}
          {canCreateUser && (
            <Pressable
              style={({ pressed }) => [
                styles.createBtn,
                pressed && styles.createBtnPressed,
                loading && styles.submitBtnDisabled,
              ]}
              onPress={handleRegister}
              disabled={loading}
            >
              {loading ? (
                <ActivityIndicator color={colors.text} size="small" />
              ) : (
                <View style={styles.createBtnContent}>
                  <Ionicons name="person-add-outline" size={18} color={colors.text} />
                  <Text style={styles.createBtnText}>Create User & Continue</Text>
                </View>
              )}
            </Pressable>
          )}

          {onClose && (
            <Pressable style={styles.skipBtn} onPress={onClose} hitSlop={8}>
              <Text style={styles.skipBtnText}>Continue Offline (Local Only)</Text>
            </Pressable>
          )}
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.85)',
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
    position: 'relative',
  },
  closeBtn: {
    position: 'absolute',
    top: spacing.lg,
    right: spacing.lg,
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: colors.card,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: colors.border,
    zIndex: 10,
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
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    backgroundColor: 'rgba(255, 92, 122, 0.15)',
    borderColor: colors.danger,
    borderWidth: 1,
    borderRadius: radius.md,
    padding: spacing.md,
    marginBottom: spacing.md,
  },
  errorText: {
    flex: 1,
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
    marginBottom: spacing.md,
  },
  inputLabel: {
    color: colors.textMuted,
    fontSize: font.size.xs,
    fontWeight: font.weight.bold,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    marginBottom: 6,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.card,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: spacing.md,
  },
  inputIcon: {
    marginRight: spacing.xs,
  },
  input: {
    flex: 1,
    color: colors.text,
    fontSize: font.size.md,
    paddingVertical: spacing.md,
  },
  eyeBtn: {
    padding: spacing.xs,
  },
  submitBtn: {
    backgroundColor: colors.primary,
    borderRadius: radius.pill,
    paddingVertical: spacing.md,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: spacing.xs,
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
  createBtn: {
    marginTop: spacing.md,
    backgroundColor: colors.cardAlt,
    borderColor: colors.primary,
    borderWidth: 1.5,
    borderRadius: radius.pill,
    paddingVertical: spacing.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  createBtnPressed: {
    backgroundColor: 'rgba(255, 107, 107, 0.15)',
  },
  createBtnContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  createBtnText: {
    color: colors.text,
    fontSize: font.size.md,
    fontWeight: font.weight.bold,
  },
  skipBtn: {
    marginTop: spacing.md,
    paddingVertical: spacing.sm,
    alignItems: 'center',
    justifyContent: 'center',
  },
  skipBtnText: {
    color: colors.textMuted,
    fontSize: font.size.xs,
    fontWeight: font.weight.semibold,
    textDecorationLine: 'underline',
  },
});
