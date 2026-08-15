// app/(tabs)/index.tsx
import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter, useFocusEffect } from 'expo-router';

import {
  MediaItem,
  getMediaItemsByFilter,
  updateProgress,
} from '../../services/mediaService';

type FilterType = 'IN_PROGRESS' | 'ALL' | 'COMPLETED' | 'DROPPED';

const TYPE_COLORS: Record<string, string> = {
  TV: '#FFF3B0',     // Muted Butter Yellow
  BOOK: '#E2F1E7',   // Mint Green
  MOVIE: '#FFB6B6',  // Soft Coral
};

export default function HomeScreen() {
  const router = useRouter();
  const [activeFilter, setActiveFilter] = useState<FilterType>('IN_PROGRESS');
  const [items, setItems] = useState<MediaItem[]>([]);
  const [loading, setLoading] = useState(true);

  // Reload data every time screen comes into focus
  useFocusEffect(
    useCallback(() => {
      loadData();
    }, [activeFilter])
  );

  const loadData = async () => {
    try {
      setLoading(true);
      const filteredData = await getMediaItemsByFilter(activeFilter);
      setItems(filteredData);
    } catch (error) {
      console.error('Error fetching items:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleIncrement = async (item: MediaItem) => {
    try {
      await updateProgress(item.id, item.media_type, 1);
      loadData();
    } catch (error) {
      console.error('Failed to increment progress:', error);
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* HEADER WITH + ADD BUTTON */}
        <View style={styles.header}>
          <Text style={styles.logoText}>DAISE 🌸</Text>
          <TouchableOpacity
            style={styles.addButton}
            onPress={() => router.push('/search')}
          >
            <Ionicons name="add" size={18} color="#FFFFFF" />
            <Text style={styles.addButtonText}>Add</Text>
          </TouchableOpacity>
        </View>

        {/* SCROLLABLE FILTER PILLS */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.filterBar}
        >
          <TouchableOpacity
            style={[styles.pill, activeFilter === 'IN_PROGRESS' && styles.activePill]}
            onPress={() => setActiveFilter('IN_PROGRESS')}
          >
            <Text style={styles.pillText}>⚡ In Progress</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.pill, activeFilter === 'ALL' && styles.activePill]}
            onPress={() => setActiveFilter('ALL')}
          >
            <Text style={styles.pillText}>✨ All Items</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.pill, activeFilter === 'COMPLETED' && styles.activePill]}
            onPress={() => setActiveFilter('COMPLETED')}
          >
            <Text style={styles.pillText}>🎉 Completed</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.pill, activeFilter === 'DROPPED' && styles.activePill]}
            onPress={() => setActiveFilter('DROPPED')}
          >
            <Text style={styles.pillText}>📦 Dropped</Text>
          </TouchableOpacity>
        </ScrollView>

        {/* MEDIA FEED */}
        {loading ? (
          <ActivityIndicator size="large" color="#FF8A8A" style={{ marginTop: 40 }} />
        ) : items.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyText}>No items in this filter yet! 🍿</Text>
            <Text style={styles.emptySubText}>
              Tap '+ Add' above to search and add media into your lists.
            </Text>
          </View>
        ) : (
          <View style={styles.cardContainer}>
            {items.map((item) => {
              const cardBg = TYPE_COLORS[item.media_type] || '#FFF';
              return (
                <TouchableOpacity
                  key={item.id}
                  activeOpacity={0.85}
                  onPress={() => router.push(`/${item.id}`)}
                  style={[styles.card, { backgroundColor: cardBg }]}
                >
                  <View style={styles.cardHeader}>
                    <Text style={styles.typeBadge}>{item.media_type}</Text>
                    {item.status !== 'COMPLETED' && item.media_type !== 'MOVIE' && (
                      <TouchableOpacity
                        style={styles.incrementBtn}
                        onPress={(e) => {
                          e.stopPropagation();
                          handleIncrement(item);
                        }}
                      >
                        <Text style={styles.incrementBtnText}>+1</Text>
                      </TouchableOpacity>
                    )}
                  </View>

                  <Text style={styles.cardTitle}>{item.title}</Text>

                  <Text style={styles.progressText}>
                    {item.status === 'COMPLETED'
                      ? 'Completed 🎉'
                      : item.status === 'DROPPED'
                      ? 'Dropped 📦'
                      : item.media_type === 'BOOK'
                      ? `Page ${item.current_page} of ${item.total_pages}`
                      : item.media_type === 'TV'
                      ? `Episode ${item.current_episode} / ${item.total_episodes}`
                      : 'Ready to Watch'}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: '#FDFBF7' },
  scrollContent: { padding: 20, paddingBottom: 110 },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  logoText: { fontSize: 26, fontWeight: '900', color: '#1A1A1A' },
  addButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1A1A1A',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 16,
    gap: 4,
  },
  addButtonText: { color: '#FFFFFF', fontWeight: '800', fontSize: 14 },
  filterBar: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 20,
    paddingRight: 10,
  },
  pill: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 20,
    borderWidth: 2,
    borderColor: '#1A1A1A',
    backgroundColor: '#FFFFFF',
  },
  activePill: {
    backgroundColor: '#FFB6B6',
    shadowColor: '#1A1A1A',
    shadowOffset: { width: 2, height: 2 },
    shadowOpacity: 1,
    shadowRadius: 0,
    elevation: 3,
  },
  pillText: { fontSize: 14, fontWeight: '800', color: '#1A1A1A' },
  cardContainer: { gap: 16 },
  card: {
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
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  typeBadge: {
    fontSize: 11,
    fontWeight: '900',
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#1A1A1A',
    overflow: 'hidden',
  },
  incrementBtn: {
    backgroundColor: '#1A1A1A',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  incrementBtnText: { color: '#FFFFFF', fontWeight: '900', fontSize: 13 },
  cardTitle: { fontSize: 18, fontWeight: '800', color: '#1A1A1A', marginBottom: 6 },
  progressText: { fontSize: 13, color: '#444444', fontWeight: '600' },
  emptyContainer: { padding: 30, alignItems: 'center' },
  emptyText: { fontSize: 16, fontWeight: '800', textAlign: 'center', color: '#1A1A1A' },
  emptySubText: { fontSize: 13, color: '#666', textAlign: 'center', marginTop: 6 },
});