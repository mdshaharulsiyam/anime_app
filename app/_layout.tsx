import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import React from 'react';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { ForceUpdateModal } from '../components/ForceUpdateModal';
import { UsernameModal } from '../components/UsernameModal';
import { colors } from '../constants/theme';
import { LibraryProvider, useLibrary } from '../lib/library';

function AppContent() {
  const {
    username,
    ready,
    saveUsername,
    versionError,
    isAuthModalOpen,
    closeAuthModal,
  } = useLibrary();

  const [dismissedInitialModal, setDismissedInitialModal] = React.useState(false);

  // Show username modal on first launch if not logged in (unless dismissed), or when explicitly triggered
  const showUsernameModal =
    (!versionError && isAuthModalOpen) ||
    (ready && !username && !versionError && !dismissedInitialModal);

  const handleClose = () => {
    setDismissedInitialModal(true);
    closeAuthModal();
  };

  return (
    <>
      <StatusBar style="light" />
      <Stack
        screenOptions={{
          headerStyle: { backgroundColor: colors.bg },
          headerTintColor: colors.text,
          headerTitleStyle: { fontWeight: '700' },
          headerShadowVisible: false,
          contentStyle: { backgroundColor: colors.bg },
        }}
      >
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen
          name="anime/[id]"
          options={{ headerTransparent: true, headerTitle: '' }}
        />
      </Stack>

      <UsernameModal
        visible={showUsernameModal}
        onClose={handleClose}
        onSuccess={async (newUsername, newPasskey) => {
          await saveUsername(newUsername, newPasskey);
          closeAuthModal();
        }}
      />

      <ForceUpdateModal
        visible={!!versionError}
        details={versionError}
      />
    </>
  );
}

export default function RootLayout() {
  return (
    <SafeAreaProvider>
      <LibraryProvider>
        <AppContent />
      </LibraryProvider>
    </SafeAreaProvider>
  );
}
