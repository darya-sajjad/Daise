import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Modal,
  Pressable,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';

import {
  MediaItem,
  getMediaItemsByFilter,
  incrementProgress,
  markAsCompleted,
  deleteMediaItem,
  seedSampleDataIfEmpty,
} from '../../services/mediaService';

type FilterType = 'IN_PROGRESS' | 'ALL' | 'COMPLETED';

const TYPE_COLORS: Record<string, string> = {
  TV: '#FFF3B0',     // Muted Butter Yellow
  BOOK: '#E2F1E7',   // Mint Green
  MOVIE: '#FFB6B6',  // Soft Coral
};

export default function HomeScreen() {
  const [isDarkMode, setIsDarkMode] = useState(false);
  const [activeFilter, setActiveFilter] = useState<FilterType>('IN_PROGRESS'); // Defaults to 'IN_PROGRESS' on open
  const [items, setItems] = useState<MediaItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedItem, setSelectedItem] = useState<MediaItem | null>(null);
  const [isModalVisible, setIsModalVisible] = useState(false);

  useEffect(() => {
    initAndLoad();
  }, [activeFilter]);

  const initAndLoad = async () => {
    try {
      setLoading(true);
      await seedSampleDataIfEmpty();
      const filteredData = await getMediaItemsByFilter(activeFilter);
      setItems(filteredData);
    } catch (error) {
      console.error('Error fetching filtered items:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleIncrement = async (item: MediaItem) => {
    try {
      await incrementProgress(item.id, item.media_type);
      const updatedData = await getMediaItemsByFilter(activeFilter);
      setItems(updatedData);
    } catch (error) {
      console.error('Failed to increment progress:', error);
    }
  };

  const handleMarkCompleted = async () => {
    if (!selectedItem) return;
    try {
      await markAsCompleted(selectedItem.id);
      closeModal();
      initAndLoad();
    } catch (error) {
      console.error('Failed to mark as completed:', error);
    }
  };

  const handleDeleteItem = async () => {
    if (!selectedItem) return;
    try {
      await deleteMediaItem(selectedItem.id);
      closeModal();
      initAndLoad();
    } catch (error) {
      console.error('Failed to delete item:', error);
    }
  };

  const handleLongPress = (item: MediaItem) => {
    setSelectedItem(item);
    setIsModalVisible(true);
  };

  const closeModal = () => {
    setIsModalVisible(false);
    setSelectedItem(null);
  };

  const containerBg = isDarkMode ? '#121212' : '#FDFBF7';
  const textColor = isDarkMode ? '#FFFFFF' : '#1A1A1A';
  const cardBorderColor = isDarkMode ? '#FFFFFF' : '#1A1A1A';

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: containerBg }]}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* HEADER */}
        <View style={styles.header}>
          <Text style={[styles.logoText, { color: textColor }]}>DAISE 🌸</Text>
          <TouchableOpacity
            style={[styles.themeToggle, { borderColor: textColor }]}
            onPress={() => setIsDarkMode(!isDarkMode)}
          >
            <Ionicons
              name={isDarkMode ? 'sunny' : 'moon'}
              size={20}
              color={textColor}
            />
          </TouchableOpacity>
        </View>

        {/* HORIZONTALLY SCROLLABLE FILTER PILLS */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.filterBar}
        >
          <TouchableOpacity
            style={[
              styles.pill,
              activeFilter === 'ALL' && styles.activePill,
            ]}
            onPress={() => setActiveFilter('ALL')}
          >
            <Text style={styles.pillText}>All Items</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.pill,
              activeFilter === 'IN_PROGRESS' && styles.activePill,
            ]}
            onPress={() => setActiveFilter('IN_PROGRESS')}
          >
            <Text style={styles.pillText}>In Progress</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.pill,
              activeFilter === 'COMPLETED' && styles.activePill,
            ]}
            onPress={() => setActiveFilter('COMPLETED')}
          >
            <Text style={styles.pillText}>Completed</Text>
          </TouchableOpacity>
        </ScrollView>

        {/* MEDIA FEED */}
        {loading ? (
          <ActivityIndicator size="large" color="#FF8A8A" style={{ marginTop: 40 }} />
        ) : items.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Text style={[styles.emptyText, { color: textColor }]}>
              No items found in this section! 🍿
            </Text>
          </View>
        ) : (
          <View style={styles.cardContainer}>
            {items.map((item) => {
              const cardBg = TYPE_COLORS[item.media_type] || '#FFF';
              return (
                <TouchableOpacity
                  key={item.id}
                  activeOpacity={0.8}
                  onLongPress={() => handleLongPress(item)}
                  style={[
                    styles.card,
                    { backgroundColor: cardBg, borderColor: cardBorderColor },
                  ]}
                >
                  <View style={styles.cardHeader}>
                    <Text style={styles.typeBadge}>{item.media_type}</Text>
                    {item.status !== 'COMPLETED' && item.media_type !== 'MOVIE' && (
                      <TouchableOpacity
                        style={styles.incrementBtn}
                        onPress={() => handleIncrement(item)}
                      >
                        <Text style={styles.incrementBtnText}>+1</Text>
                      </TouchableOpacity>
                    )}
                  </View>

                  <Text style={styles.cardTitle}>{item.title}</Text>

                  <Text style={styles.progressText}>
                    {item.status === 'COMPLETED'
                      ? 'Completed 🎉'
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

      {/* LONG-PRESS OPTIONS MODAL */}
      <Modal visible={isModalVisible} transparent animationType="fade">
        <Pressable style={styles.modalOverlay} onPress={closeModal}>
          <Pressable style={styles.modalCard}>
            <Text style={styles.modalTitle}>{selectedItem?.title}</Text>

            {selectedItem?.status !== 'COMPLETED' && (
              <TouchableOpacity style={styles.modalOption} onPress={handleMarkCompleted}>
                <Ionicons name="checkmark-circle-outline" size={20} color="#1A1A1A" />
                <Text style={styles.modalOptionText}>Mark as Completed</Text>
              </TouchableOpacity>
            )}

            {selectedItem?.media_type !== 'MOVIE' && (
              <TouchableOpacity
                style={styles.modalOption}
                onPress={() => {
                  closeModal();
                  alert(`Navigating to details for ${selectedItem?.title}`);
                }}
              >
                <Ionicons name="add-circle-outline" size={20} color="#1A1A1A" />
                <Text style={styles.modalOptionText}>
                  Update {selectedItem?.media_type === 'BOOK' ? 'Page' : 'Episode'} Details
                </Text>
              </TouchableOpacity>
            )}

            <TouchableOpacity style={styles.modalOption} onPress={closeModal}>
              <Ionicons name="bookmark-outline" size={20} color="#1A1A1A" />
              <Text style={styles.modalOptionText}>Add to Custom List</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.modalOption, styles.deleteOption]}
              onPress={handleDeleteItem}
            >
              <Ionicons name="trash-outline" size={20} color="#D9534F" />
              <Text style={[styles.modalOptionText, { color: '#D9534F' }]}>Delete Item</Text>
            </TouchableOpacity>
          </Pressable>
        </Pressable>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1 },
  scrollContent: { padding: 20, paddingBottom: 110 },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  logoText: { fontSize: 26, fontWeight: '900', letterSpacing: 0.5 },
  themeToggle: {
    padding: 8,
    borderRadius: 12,
    borderWidth: 2,
  },
  filterBar: {
    flexDirection: 'row',
    gap: 12,
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
    backgroundColor: '#FFB6B6', // Coral active highlight
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
  emptyText: { fontSize: 15, fontWeight: '600', textAlign: 'center' },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  modalCard: {
    width: '100%',
    backgroundColor: '#FDFBF7',
    borderRadius: 24,
    borderWidth: 2,
    borderColor: '#1A1A1A',
    padding: 20,
    gap: 12,
    shadowColor: '#1A1A1A',
    shadowOffset: { width: 4, height: 4 },
    shadowOpacity: 1,
    shadowRadius: 0,
  },
  modalTitle: { fontSize: 18, fontWeight: '800', color: '#1A1A1A', marginBottom: 8 },
  modalOption: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 10,
    paddingHorizontal: 12,
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: '#1A1A1A',
  },
  modalOptionText: { fontSize: 14, fontWeight: '700', color: '#1A1A1A' },
  deleteOption: { backgroundColor: '#FFD1D1' },
});