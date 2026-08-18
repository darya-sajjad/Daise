// app/(tabs)/analytics.tsx
import React, { useState, useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect } from 'expo-router';

import { getMediaItemsByFilter, MediaItem } from '../../services/mediaService';

// Books have no runtime API to pull from — this is a documented estimate,
// not real data like the movie/TV numbers below it.
const ESTIMATED_MINUTES_PER_PAGE = 1.5;

function formatMinutes(totalMinutes: number): string {
  if (totalMinutes < 60) {
    return `${Math.round(totalMinutes)} min`;
  }
  return `${(totalMinutes / 60).toFixed(1)} hrs`;
}

function computeTotalMinutes(items: MediaItem[]): number {
  let minutes = 0;

  for (const item of items) {
    if (item.media_type === 'MOVIE') {
      // Real TMDb runtime, only counted once the movie is actually finished —
      // there's no partial-progress tracking for movies.
      if (item.status === 'COMPLETED') {
        minutes += item.runtime_minutes || 0;
      }
    } else if (item.media_type === 'TV') {
      // Real TMDb episode runtime x episodes actually watched so far.
      minutes += (item.current_episode || 0) * (item.episode_runtime_minutes || 0);
    } else if (item.media_type === 'BOOK') {
      // No real reading-speed data exists, so this is a flat per-page estimate
      // applied to real page-progress numbers.
      minutes += (item.current_page || 0) * ESTIMATED_MINUTES_PER_PAGE;
    }
  }

  return minutes;
}

interface MetricCardProps {
  label: string;
  value: string;
  sublabel: string;
  backgroundColor: string;
}

function MetricCard({ label, value, sublabel, backgroundColor }: MetricCardProps) {
  return (
    <View style={[styles.card, { backgroundColor }]}>
      <Text style={styles.cardLabel}>{label}</Text>
      <Text style={styles.cardValue}>{value}</Text>
      <Text style={styles.cardSublabel}>{sublabel}</Text>
    </View>
  );
}

export default function AnalyticsScreen() {
  const [items, setItems] = useState<MediaItem[]>([]);
  const [loading, setLoading] = useState(true);

  useFocusEffect(
    useCallback(() => {
      loadData();
    }, [])
  );

  const loadData = async () => {
    try {
      setLoading(true);
      const allItems = await getMediaItemsByFilter('ALL');
      setItems(allItems);
    } catch (error) {
      console.error('Failed to load analytics data:', error);
    } finally {
      setLoading(false);
    }
  };

  const totalItems = items.length;
  const completedItems = items.filter((i) => i.status === 'COMPLETED').length;
  const activeItems = items.filter((i) => i.status === 'WATCHING').length;
  const totalMinutes = computeTotalMinutes(items);

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <View style={styles.header}>
          <Text style={styles.title}>Analytics</Text>
          <Text style={styles.subtitle}>Your tracking summary</Text>
        </View>

        {loading ? (
          <ActivityIndicator size="large" color="#FF8A8A" style={{ marginTop: 40 }} />
        ) : (
          <View style={styles.grid}>
            <MetricCard
              label="Total Items"
              value={String(totalItems)}
              sublabel="movies, shows & books"
              backgroundColor="#D1E8FF"
            />
            <MetricCard
              label="Completed"
              value={String(completedItems)}
              sublabel="finished so far"
              backgroundColor="#E2F1E7"
            />
            <MetricCard
              label="Time Spent"
              value={formatMinutes(totalMinutes)}
              sublabel="watching & reading"
              backgroundColor="#FFF3B0"
            />
            <MetricCard
              label="Active Streak"
              value={String(activeItems)}
              sublabel="in progress right now"
              backgroundColor="#FFB6B6"
            />
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: '#FDFBF7' },
  scrollContent: { padding: 20, paddingBottom: 110 },
  header: { marginBottom: 20 },
  title: { fontSize: 26, fontWeight: '900', color: '#1A1A1A' },
  subtitle: { fontSize: 13, color: '#666', fontWeight: '600', marginTop: 4 },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    rowGap: 16,
  },
  card: {
    width: '48%',
    borderRadius: 20,
    borderWidth: 2,
    borderColor: '#1A1A1A',
    padding: 16,
    shadowColor: '#1A1A1A',
    shadowOffset: { width: 3, height: 3 },
    shadowOpacity: 1,
    shadowRadius: 0,
    elevation: 4,
  },
  cardLabel: { fontSize: 12, fontWeight: '800', color: '#1A1A1A', marginBottom: 10 },
  cardValue: { fontSize: 28, fontWeight: '900', color: '#1A1A1A', marginBottom: 4 },
  cardSublabel: { fontSize: 11, color: '#444444', fontWeight: '600' },
});