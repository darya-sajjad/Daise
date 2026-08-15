import { useEffect } from 'react';
import { Stack } from 'expo-router';
import { initDatabase } from '../db';

export default function RootLayout() {
  useEffect(() => {
    initDatabase().catch((err) => console.error('DB Init Error:', err));
  }, []);

  return (
    <Stack>
      <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
    </Stack>
  );
}