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
          headerShown: false, 
          title: 'Details',
          animation: 'slide_from_right' 
        }} 
      />

      {/* List Detail Screen - custom header built inside the component */}
      <Stack.Screen 
        name="list/[id]" 
        options={{ 
          headerShown: false, 
          animation: 'slide_from_right' 
        }} 
      />
    </Stack>
  );
}