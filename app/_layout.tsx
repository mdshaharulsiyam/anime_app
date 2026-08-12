import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import React from 'react';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { UsernameModal } from '../components/UsernameModal';
import { colors } from '../constants/theme';
import { LibraryProvider, useLibrary } from '../lib/library';

function AppContent() {
  const { username, ready, saveUsername } = useLibrary();

  // Show username onboarding modal whenever ready is true and username is null
  const showModal = ready && !username;

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
        visible={showModal}
        onSuccess={async (newUsername) => {
          await saveUsername(newUsername);
        }}
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
