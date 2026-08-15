// app/_layout.tsx
import { useEffect } from 'react';
import { Stack } from 'expo-router';
import { initDatabase } from '../services/database';

export default function RootLayout() {
  useEffect(() => {
    initDatabase().catch((err) => {
      console.error('Failed to initialize database:', err);
    });
  }, []);

  return (
    <Stack screenOptions={{ headerShown: false }}>
      {/* Main Tab Navigator */}
      <Stack.Screen name="(tabs)" options={{ headerShown: false }} />

      {/* Media Detail Screen - Opens full screen over tabs */}
      <Stack.Screen 
        name="[id]" 
        options={{ 
          headerShown: true, 
          title: 'Details',
          animation: 'slide_from_right' 
        }} 
      />
      <Stack.Screen 
        name="search" 
        options={{ 
          presentation: 'modal', 
          headerShown: true, 
          title: 'Add Media' 
        }} 
      />
    </Stack>
  );
}