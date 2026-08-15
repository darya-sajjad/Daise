// app/list/[id].tsx
import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Image,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter, useFocusEffect } from 'expo-router';

import {
  CustomList,
  MediaItem,
  getListById,
  getListItems,
} from '../../services/mediaService';

const LIST_TYPE_LABELS: Record<CustomList['list_type'], string> = {
  ALL: '🍿 Mixed / Any',
  MOVIE: '🎬 Movies Only',
  TV: '📺 TV Shows Only',
  BOOK: '📚 Books Only',
};

const STATUS_META: Record<MediaItem['status'], { label: string; color: string }> = {
  PLAN_TO_WATCH: { label: 'Plan to Watch', color: '#D1E8FF' },
  WATCHING: { label: 'Watching', color: '#FFF3B0' },
  COMPLETED: { label: 'Completed 🎉', color: '#E2F1E7' },
  DROPPED: { label: 'Dropped 📦', color: '#FFB6B6' },
};

export default function ListDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();

  const [list, setList] = useState<CustomList | null>(null);
  const [items, setItems] = useState<MediaItem[]>([]);
  const [loading, setLoading] = useState(true);

  useFocusEffect(
    useCallback(() => {
      if (id) loadList();
    }, [id])
  );

  const loadList = async () => {
    try {
      setLoading(true);
      const [listData, listItems] = await Promise.all([
        getListById(id),
        getListItems(id),
      ]);
      setList(listData);
      setItems(listItems);
    } catch (error) {
      console.error('Failed to load list:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = () => {
    // TODO: wire up list editing (rename, change type/color, reorder, remove items)
    console.log('Edit list pressed:', id);
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <ActivityIndicator size="large" color="#FF8A8A" style={{ marginTop: 50 }} />
      </SafeAreaView>
    );
  }

  if (!list) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.notFoundContainer}>
          <Text style={styles.notFoundText}>List not found 😕</Text>
          <TouchableOpacity style={styles.backBtnSolid} onPress={() => router.back()}>
            <Text style={styles.backBtnSolidText}>Go Back</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      {/* TOP BAR: BACK (LEFT) + EDIT (RIGHT) */}
      <View style={styles.topBar}>
        <TouchableOpacity style={styles.iconCircle} onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={22} color="#1A1A1A" />
        </TouchableOpacity>
        <TouchableOpacity style={styles.iconCircle} onPress={handleEdit}>
          <Ionicons name="pencil" size={18} color="#1A1A1A" />
        </TouchableOpacity>
      </View>

      {/* LIST NAME + TYPE */}
      <View style={styles.headerInfo}>
        <Text style={styles.listEmoji}>{list.emoji_icon}</Text>
        <Text style={styles.listTitle}>{list.title}</Text>
        <View style={styles.typeBadge}>
          <Text style={styles.typeBadgeText}>{LIST_TYPE_LABELS[list.list_type]}</Text>
        </View>

        <TouchableOpacity
          style={styles.addMediaBtn}
          onPress={() => router.push(`/search?listId=${list.id}`)}
        >
          <Ionicons name="add" size={16} color="#FFFFFF" />
          <Text style={styles.addMediaBtnText}>Add Media</Text>
        </TouchableOpacity>
      </View>

      {/* ITEM GRID */}
      <ScrollView contentContainerStyle={styles.scrollContent}>
        {items.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyText}>No items in this list yet! ✨</Text>
            <Text style={styles.emptySubText}>
              Tap "+ Add Media" above to search and add something.
            </Text>
          </View>
        ) : (
          <View style={styles.grid}>
            {items.map((item) => {
              const statusMeta = STATUS_META[item.status];
              return (
                <TouchableOpacity
                  key={item.id}
                  style={styles.gridCard}
                  activeOpacity={0.85}
                  onPress={() => router.push(`/${item.id}`)}
                >
                  {item.poster_path ? (
                    <Image source={{ uri: item.poster_path }} style={styles.posterImage} />
                  ) : (
                    <View style={styles.placeholderImage}>
                      <Ionicons name="film-outline" size={24} color="#1A1A1A" />
                    </View>
                  )}

                  <Text style={styles.itemTitle} numberOfLines={2}>
                    {item.title}
                  </Text>

                  <View style={[styles.statusPill, { backgroundColor: statusMeta.color }]}>
                    <Text style={styles.statusPillText}>{statusMeta.label}</Text>
                  </View>
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
  topBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 12,
  },
  iconCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#FFFFFF',
    borderWidth: 2,
    borderColor: '#1A1A1A',
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerInfo: {
    alignItems: 'center',
    paddingHorizontal: 20,
    marginBottom: 20,
  },
  listEmoji: { fontSize: 34, marginBottom: 4 },
  listTitle: {
    fontSize: 24,
    fontWeight: '900',
    color: '#1A1A1A',
    textAlign: 'center',
    marginBottom: 8,
  },
  typeBadge: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1.5,
    borderColor: '#1A1A1A',
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 4,
  },
  typeBadgeText: { fontSize: 12, fontWeight: '800', color: '#1A1A1A' },
  addMediaBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1A1A1A',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 16,
    gap: 4,
    marginTop: 14,
  },
  addMediaBtnText: { color: '#FFFFFF', fontWeight: '800', fontSize: 13 },
  scrollContent: { padding: 20, paddingTop: 0, paddingBottom: 110 },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'flex-start',
    columnGap: 13,
    rowGap: 16,
  },
  gridCard: {
    width: '31%',
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#1A1A1A',
    padding: 8,
    shadowColor: '#1A1A1A',
    shadowOffset: { width: 3, height: 3 },
    shadowOpacity: 1,
    shadowRadius: 0,
    elevation: 4,
  },
  posterImage: {
    width: '100%',
    aspectRatio: 3 / 4,
    borderRadius: 10,
    borderWidth: 1.5,
    borderColor: '#1A1A1A',
    marginBottom: 8,
  },
  placeholderImage: {
    width: '100%',
    aspectRatio: 3 / 4,
    borderRadius: 10,
    borderWidth: 1.5,
    borderColor: '#1A1A1A',
    backgroundColor: '#E2F1E7',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  itemTitle: {
    fontSize: 12,
    fontWeight: '800',
    color: '#1A1A1A',
    marginBottom: 8,
    minHeight: 30,
  },
  statusPill: {
    alignSelf: 'flex-start',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#1A1A1A',
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  statusPillText: { fontSize: 10, fontWeight: '800', color: '#1A1A1A' },
  emptyContainer: { padding: 30, alignItems: 'center' },
  emptyText: { fontSize: 16, fontWeight: '800', textAlign: 'center', color: '#1A1A1A' },
  emptySubText: { fontSize: 13, color: '#666', textAlign: 'center', marginTop: 6 },
  notFoundContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  notFoundText: { fontSize: 18, fontWeight: '800', color: '#1A1A1A', marginBottom: 12 },
  backBtnSolid: {
    backgroundColor: '#1A1A1A',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 12,
  },
  backBtnSolidText: { color: '#FFFFFF', fontWeight: '800' },
});