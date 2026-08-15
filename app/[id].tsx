// app/media/[id].tsx
import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Image,
  ScrollView,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';

import {
  MediaItem,
  getMediaItemById,
  updateProgress,
  updateMediaStatus,
  deleteMediaItem,
} from '../services/mediaService';

const STATUS_OPTIONS: { label: string; value: MediaItem['status'] }[] = [
  { label: 'Watching', value: 'WATCHING' },
  { label: 'Plan to Watch', value: 'PLAN_TO_WATCH' },
  { label: 'Completed', value: 'COMPLETED' },
  { label: 'Dropped', value: 'DROPPED' },
];

export default function MediaDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();

  const [item, setItem] = useState<MediaItem | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (id) loadMedia();
  }, [id]);

  const loadMedia = async () => {
    setLoading(true);
    const data = await getMediaItemById(id);
    setItem(data);
    setLoading(false);
  };

  const handleStatusChange = async (status: MediaItem['status']) => {
    if (!item) return;
    await updateMediaStatus(item.id, status);
    loadMedia();
  };

  const handleProgressChange = async (change: number) => {
    if (!item) return;
    await updateProgress(item.id, item.media_type, change);
    loadMedia();
  };

  const handleDelete = () => {
    Alert.alert(
      'Delete Media',
      'Are you sure you want to remove this item from your collection?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            if (item) {
              await deleteMediaItem(item.id);
              router.back();
            }
          },
        },
      ]
    );
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <ActivityIndicator size="large" color="#FF8A8A" style={{ marginTop: 50 }} />
      </SafeAreaView>
    );
  }

  if (!item) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.notFoundContainer}>
          <Text style={styles.notFoundText}>Media item not found 😕</Text>
          <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
            <Text style={styles.backBtnText}>Go Back</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      {/* TOP NAVBAR (BACK ARROW & DELETE) */}
      <View style={styles.topBar}>
        <TouchableOpacity style={styles.iconCircle} onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={22} color="#1A1A1A" />
        </TouchableOpacity>
        <TouchableOpacity style={[styles.iconCircle, styles.deleteCircle]} onPress={handleDelete}>
          <Ionicons name="trash-outline" size={20} color="#D9534F" />
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* MEDIA COVER & TITLE */}
        <View style={styles.coverWrapper}>
          {item.poster_path ? (
            <Image source={{ uri: item.poster_path }} style={styles.posterImage} />
          ) : (
            <View style={styles.placeholderImage}>
              <Ionicons name="film-outline" size={48} color="#1A1A1A" />
            </View>
          )}
          <View style={styles.badgeRow}>
            <Text style={styles.mediaBadge}>{item.media_type}</Text>
          </View>
        </View>

        <Text style={styles.title}>{item.title}</Text>

        {/* TAGS SECTION (PLACEHOLDER FOR TAG ENGINE) */}
        <View style={styles.sectionContainer}>
          <Text style={styles.sectionHeader}>Tags 🏷️</Text>
          <View style={styles.tagsRow}>
            <TouchableOpacity style={styles.addTagPill}>
              <Ionicons name="add" size={14} color="#1A1A1A" />
              <Text style={styles.addTagText}>Add Tag</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* DESCRIPTION */}
        <View style={styles.sectionContainer}>
          <Text style={styles.sectionHeader}>Overview 📝</Text>
          <Text style={styles.overviewText}>
            {item.overview || 'No overview available.'}
          </Text>
        </View>

        {/* DETAIL EDIT BAR / ACTIONS */}
        <View style={styles.actionCard}>
          <Text style={styles.sectionHeader}>Tracking Progress ⚙️</Text>

          {/* PROGRESS EDIT (FOR TV & BOOKS) */}
          {item.media_type !== 'MOVIE' && (
            <View style={styles.progressRow}>
              <Text style={styles.progressLabel}>
                {item.media_type === 'TV' ? 'Episodes Completed' : 'Pages Read'}
              </Text>

              <View style={styles.counterControl}>
                <TouchableOpacity
                  style={styles.counterBtn}
                  onPress={() => handleProgressChange(-1)}
                >
                  <Ionicons name="remove" size={18} color="#1A1A1A" />
                </TouchableOpacity>

                <Text style={styles.counterValue}>
                  {item.media_type === 'TV'
                    ? `${item.current_episode} / ${item.total_episodes}`
                    : `${item.current_page} / ${item.total_pages}`}
                </Text>

                <TouchableOpacity
                  style={styles.counterBtn}
                  onPress={() => handleProgressChange(1)}
                >
                  <Ionicons name="add" size={18} color="#1A1A1A" />
                </TouchableOpacity>
              </View>
            </View>
          )}

          {/* STATUS SELECTOR */}
          <Text style={[styles.progressLabel, { marginTop: 14 }]}>Status</Text>
          <View style={styles.statusGrid}>
            {STATUS_OPTIONS.map((opt) => {
              const isSelected = item.status === opt.value;
              return (
                <TouchableOpacity
                  key={opt.value}
                  style={[styles.statusChip, isSelected && styles.activeStatusChip]}
                  onPress={() => handleStatusChange(opt.value)}
                >
                  <Text style={[styles.statusChipText, isSelected && styles.activeStatusChipText]}>
                    {opt.label}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>

          {/* ADD TO LIST PLACEHOLDER */}
          <TouchableOpacity style={styles.addToListBtn}>
            <Ionicons name="bookmark-outline" size={18} color="#1A1A1A" />
            <Text style={styles.addToListText}>Add to a List</Text>
          </TouchableOpacity>
        </View>
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
  deleteCircle: { backgroundColor: '#FFD1D1' },
  scrollContent: { padding: 20, paddingBottom: 60 },
  coverWrapper: { alignItems: 'center', marginBottom: 16 },
  posterImage: {
    width: 180,
    height: 260,
    borderRadius: 16,
    borderWidth: 2,
    borderColor: '#1A1A1A',
  },
  placeholderImage: {
    width: 180,
    height: 260,
    borderRadius: 16,
    borderWidth: 2,
    borderColor: '#1A1A1A',
    backgroundColor: '#E2F1E7',
    justifyContent: 'center',
    alignItems: 'center',
  },
  badgeRow: { marginTop: 10 },
  mediaBadge: {
    fontSize: 12,
    fontWeight: '900',
    backgroundColor: '#FFB6B6',
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: '#1A1A1A',
  },
  title: {
    fontSize: 24,
    fontWeight: '900',
    color: '#1A1A1A',
    textAlign: 'center',
    marginBottom: 20,
  },
  sectionContainer: { marginBottom: 20 },
  sectionHeader: { fontSize: 16, fontWeight: '800', color: '#1A1A1A', marginBottom: 8 },
  tagsRow: { flexDirection: 'row', gap: 8, flexWrap: 'wrap' },
  addTagPill: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: '#1A1A1A',
    borderStyle: 'dashed',
    gap: 4,
  },
  addTagText: { fontSize: 12, fontWeight: '700', color: '#1A1A1A' },
  overviewText: { fontSize: 14, color: '#444444', lineHeight: 20 },
  actionCard: {
    backgroundColor: '#FFFFFF',
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
  progressRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 8,
  },
  progressLabel: { fontSize: 14, fontWeight: '700', color: '#1A1A1A' },
  counterControl: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: '#FDFBF7',
    borderWidth: 1.5,
    borderColor: '#1A1A1A',
    borderRadius: 12,
    padding: 4,
  },
  counterBtn: {
    width: 32,
    height: 32,
    borderRadius: 8,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#1A1A1A',
    justifyContent: 'center',
    alignItems: 'center',
  },
  counterValue: { fontSize: 14, fontWeight: '800', color: '#1A1A1A' },
  statusGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 8 },
  statusChip: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: '#1A1A1A',
    backgroundColor: '#FDFBF7',
  },
  activeStatusChip: { backgroundColor: '#1A1A1A' },
  statusChipText: { fontSize: 12, fontWeight: '700', color: '#1A1A1A' },
  activeStatusChipText: { color: '#FFFFFF' },
  addToListBtn: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#E2F1E7',
    borderWidth: 1.5,
    borderColor: '#1A1A1A',
    borderRadius: 12,
    paddingVertical: 12,
    gap: 8,
    marginTop: 16,
  },
  addToListText: { fontSize: 14, fontWeight: '800', color: '#1A1A1A' },
  notFoundContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  notFoundText: { fontSize: 18, fontWeight: '800', color: '#1A1A1A', marginBottom: 12 },
  backBtn: {
    backgroundColor: '#1A1A1A',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 12,
  },
  backBtnText: { color: '#FFFFFF', fontWeight: '800' },
});