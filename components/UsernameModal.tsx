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
  const [mode, setMode] = useState<'login' | 'register'>('login');
  const [usernameInput, setUsernameInput] = useState('');
  const [passkeyInput, setPasskeyInput] = useState('');
  const [showPasskey, setShowPasskey] = useState(false);
  const [loading, setLoading] = useState(false);
  const [statusMessage, setStatusMessage] = useState('');
  const [errorMessage, setErrorMessage] = useState('');

  const validateInputs = () => {
    const trimmedUser = usernameInput.trim();
    const trimmedKey = passkeyInput.trim();

    if (!trimmedUser) {
      setErrorMessage('Please enter your username');
      return null;
    }
    if (trimmedUser.length < 2) {
      setErrorMessage('Username must be at least 2 characters');
      return null;
    }
    if (!trimmedKey) {
      setErrorMessage(mode === 'login' ? 'Please enter your password' : 'Create a password (min 3 chars)');
      return null;
    }
    if (trimmedKey.length < 3) {
      setErrorMessage('Password must be at least 3 characters');
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
          setStatusMessage(`Syncing ${legacyItems.length} local items to your cloud list...`);
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
  };

  const handleSubmit = async () => {
    const validated = validateInputs();
    if (!validated) return;

    setLoading(true);
    setErrorMessage('');

    if (mode === 'login') {
      setStatusMessage('Signing in...');
      try {
        const userObj = await loginUser(validated.username, validated.passkey);
        await handlePostAuth(userObj.username, validated.passkey);
      } catch (err: any) {
        if (err instanceof ApiError && (err.status === 404 || err.code === 'USER_NOT_FOUND')) {
          setErrorMessage(`User "@${validated.username}" not found. Need to create an account?`);
        } else if (err instanceof ApiError && (err.status === 401 || err.code === 'INVALID_PASSKEY')) {
          setErrorMessage('Incorrect password for this username.');
        } else {
          setErrorMessage(err.message || 'Connection failed. Please check your internet connection.');
        }
      } finally {
        setLoading(false);
        setStatusMessage('');
      }
    } else {
      setStatusMessage('Creating account...');
      try {
        const userObj = await registerUser(validated.username, validated.passkey);
        await handlePostAuth(userObj.username, validated.passkey);
      } catch (err: any) {
        if (err instanceof ApiError && (err.status === 409 || err.code === 'USER_ALREADY_EXISTS')) {
          setErrorMessage('Username already taken. Please sign in or choose another name.');
        } else {
          setErrorMessage(err.message || 'Registration failed. Please try again.');
        }
      } finally {
        setLoading(false);
        setStatusMessage('');
      }
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

          {/* Header */}
          <View style={styles.header}>
            <View style={styles.iconCircle}>
              <Ionicons name="cloud-done-outline" size={26} color={colors.primary} />
            </View>
            <Text style={styles.title}>Cloud Sync & Backup</Text>
            <Text style={styles.subtitle}>
              Save and sync your anime watchlist across all your devices.
            </Text>
          </View>

          {/* Mode Switcher Tabs */}
          <View style={styles.tabContainer}>
            <Pressable
              style={[styles.tab, mode === 'login' && styles.activeTab]}
              onPress={() => {
                setMode('login');
                setErrorMessage('');
              }}
            >
              <Text style={[styles.tabText, mode === 'login' && styles.activeTabText]}>
                Sign In
              </Text>
            </Pressable>
            <Pressable
              style={[styles.tab, mode === 'register' && styles.activeTab]}
              onPress={() => {
                setMode('register');
                setErrorMessage('');
              }}
            >
              <Text style={[styles.tabText, mode === 'register' && styles.activeTabText]}>
                Create Account
              </Text>
            </Pressable>
          </View>

          {/* Error Message */}
          {errorMessage ? (
            <View style={styles.errorBox}>
              <Ionicons name="alert-circle" size={18} color={colors.danger} />
              <View style={styles.errorTextContainer}>
                <Text style={styles.errorText}>{errorMessage}</Text>
                {mode === 'login' && errorMessage.includes('Need to create an account?') && (
                  <Pressable
                    onPress={() => {
                      setMode('register');
                      setErrorMessage('');
                    }}
                    hitSlop={4}
                  >
                    <Text style={styles.switchModeLink}>Switch to Create Account →</Text>
                  </Pressable>
                )}
                {mode === 'register' && errorMessage.includes('sign in') && (
                  <Pressable
                    onPress={() => {
                      setMode('login');
                      setErrorMessage('');
                    }}
                    hitSlop={4}
                  >
                    <Text style={styles.switchModeLink}>Switch to Sign In →</Text>
                  </Pressable>
                )}
              </View>
            </View>
          ) : null}

          {/* Loading status */}
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
                }}
                autoCapitalize="none"
                autoCorrect={false}
                editable={!loading}
              />
            </View>
          </View>

          {/* Password Field */}
          <View style={styles.inputWrap}>
            <Text style={styles.inputLabel}>
              {mode === 'login' ? 'Password' : 'Password / Passkey'}
            </Text>
            <View style={styles.inputContainer}>
              <Ionicons name="lock-closed-outline" size={18} color={colors.textMuted} style={styles.inputIcon} />
              <TextInput
                style={styles.input}
                placeholder={mode === 'login' ? 'Enter your password' : 'Create a password'}
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
                accessibilityLabel={showPasskey ? 'Hide password' : 'Show password'}
              >
                <Ionicons
                  name={showPasskey ? 'eye-off-outline' : 'eye-outline'}
                  size={20}
                  color={colors.textMuted}
                />
              </Pressable>
            </View>
          </View>

          {/* Action Button */}
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
              <ActivityIndicator color="#ffffff" size="small" />
            ) : (
              <Text style={styles.submitBtnText}>
                {mode === 'login' ? 'Sign In' : 'Create Account & Sync'}
              </Text>
            )}
          </Pressable>

          {/* Guest / Offline Action */}
          {onClose && (
            <Pressable style={styles.skipBtn} onPress={onClose} hitSlop={8}>
              <Text style={styles.skipBtnText}>Continue as Guest (Offline Mode)</Text>
              <Text style={styles.skipBtnSubtext}>You can sync anytime later in Settings</Text>
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
  header: {
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  iconCircle: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: 'rgba(255, 107, 107, 0.12)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.xs,
  },
  title: {
    color: colors.text,
    fontSize: font.size.lg,
    fontWeight: font.weight.heavy,
    marginBottom: 4,
    textAlign: 'center',
  },
  subtitle: {
    color: colors.textMuted,
    fontSize: font.size.xs,
    lineHeight: 18,
    textAlign: 'center',
    paddingHorizontal: spacing.sm,
  },
  tabContainer: {
    flexDirection: 'row',
    backgroundColor: colors.card,
    borderRadius: radius.lg,
    padding: 3,
    marginBottom: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
  },
  tab: {
    flex: 1,
    paddingVertical: spacing.sm,
    alignItems: 'center',
    borderRadius: radius.md,
  },
  activeTab: {
    backgroundColor: colors.bgElevated,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 2,
  },
  tabText: {
    color: colors.textMuted,
    fontSize: font.size.sm,
    fontWeight: font.weight.semibold,
  },
  activeTabText: {
    color: colors.text,
    fontWeight: font.weight.bold,
  },
  errorBox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.xs,
    backgroundColor: 'rgba(255, 92, 122, 0.15)',
    borderColor: colors.danger,
    borderWidth: 1,
    borderRadius: radius.md,
    padding: spacing.md,
    marginBottom: spacing.md,
  },
  errorTextContainer: {
    flex: 1,
  },
  errorText: {
    color: colors.danger,
    fontSize: font.size.xs,
    fontWeight: font.weight.semibold,
    lineHeight: 18,
  },
  switchModeLink: {
    color: colors.primary,
    fontSize: font.size.xs,
    fontWeight: font.weight.bold,
    marginTop: 4,
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
    paddingVertical: 14,
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
    color: '#ffffff',
    fontSize: font.size.md,
    fontWeight: font.weight.bold,
  },
  skipBtn: {
    marginTop: spacing.md,
    paddingVertical: spacing.xs,
    alignItems: 'center',
    justifyContent: 'center',
  },
  skipBtnText: {
    color: colors.textMuted,
    fontSize: font.size.xs,
    fontWeight: font.weight.semibold,
  },
  skipBtnSubtext: {
    color: colors.textFaint,
    fontSize: 10,
    marginTop: 2,
  },
});
