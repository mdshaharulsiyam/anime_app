import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { colors } from '../constants/theme';
import { LibraryProvider } from '../lib/library';

export default function RootLayout() {
  return (
    <SafeAreaProvider>
      <LibraryProvider>
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
      </LibraryProvider>
    </SafeAreaProvider>
  );
}
