import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import React from 'react';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { ForceUpdateModal } from '../components/ForceUpdateModal';
import { UsernameModal } from '../components/UsernameModal';
import { colors } from '../constants/theme';
import { LibraryProvider, useLibrary } from '../lib/library';

function AppContent() {
  const { username, ready, saveUsername, versionError } = useLibrary();

  // Show username onboarding modal whenever ready is true, username is null, and no version error exists
  const showUsernameModal = ready && !username && !versionError;

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
        onSuccess={async (newUsername) => {
          await saveUsername(newUsername);
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
