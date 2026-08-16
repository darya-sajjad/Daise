// app/list/[id].tsx
import React, { useState, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Image,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  TextInput,
  Modal,
  Pressable,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter, useFocusEffect } from 'expo-router';

import {
  CustomList,
  MediaItem,
  getListById,
  getListItems,
  deleteMediaItem,
} from '../../services/mediaService';

const LIST_TYPE_LABELS: Record<CustomList['list_type'], string> = {
  ALL: 'Any Media',
  MOVIE: 'Movies',
  TV: 'TV Shows',
  BOOK: 'Books',
};

const STATUS_META: Record<MediaItem['status'], { label: string; color: string }> = {
  PLAN_TO_WATCH: { label: 'Plan to Watch', color: '#D1E8FF' },
  WATCHING: { label: 'Watching', color: '#FFF3B0' },
  COMPLETED: { label: 'Completed', color: '#E2F1E7' },
  DROPPED: { label: 'Dropped', color: '#FFB6B6' },
};

// Used for the "Status ↑ / ↓" sort — active stuff first, dropped stuff last.
const STATUS_ORDER: MediaItem['status'][] = ['WATCHING', 'PLAN_TO_WATCH', 'COMPLETED', 'DROPPED'];

type SortOption = 'DEFAULT' | 'TITLE_ASC' | 'TITLE_DESC' | 'STATUS_ASC' | 'STATUS_DESC';

const SORT_OPTIONS: { label: string; value: SortOption }[] = [
  { label: 'Default', value: 'DEFAULT' },
  { label: 'Title A→Z', value: 'TITLE_ASC' },
  { label: 'Title Z→A', value: 'TITLE_DESC' },
  { label: 'Status ↑', value: 'STATUS_ASC' },
  { label: 'Status ↓', value: 'STATUS_DESC' },
];

const FILTER_OPTIONS: { label: string; value: 'ALL' | MediaItem['status'] }[] = [
  { label: 'All', value: 'ALL' },
  { label: 'Watching', value: 'WATCHING' },
  { label: 'Plan to Watch', value: 'PLAN_TO_WATCH' },
  { label: 'Completed', value: 'COMPLETED' },
  { label: 'Dropped', value: 'DROPPED' },
];

export default function ListDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();

  const [list, setList] = useState<CustomList | null>(null);
  const [items, setItems] = useState<MediaItem[]>([]);
  const [loading, setLoading] = useState(true);

  // In-list search — filters only the items already loaded for this list,
  // no API calls involved.
  const [searchActive, setSearchActive] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  // Sort & filter (from the Options sheet)
  const [sortBy, setSortBy] = useState<SortOption>('DEFAULT');
  const [filterStatus, setFilterStatus] = useState<'ALL' | MediaItem['status']>('ALL');
  const [optionsModalVisible, setOptionsModalVisible] = useState(false);

  // Multi-select edit mode
  const [selectionMode, setSelectionMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

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

  const toggleSearch = () => {
    setSearchActive((prev) => {
      if (prev) setSearchQuery('');
      return !prev;
    });
  };

  // Derived list applying search -> filter -> sort, in that order
  const displayedItems = useMemo(() => {
    let result = items;

    if (filterStatus !== 'ALL') {
      result = result.filter((i) => i.status === filterStatus);
    }

    if (searchQuery.trim()) {
      const q = searchQuery.trim().toLowerCase();
      result = result.filter((i) => i.title.toLowerCase().includes(q));
    }

    if (sortBy !== 'DEFAULT') {
      result = [...result].sort((a, b) => {
        switch (sortBy) {
          case 'TITLE_ASC':
            return a.title.localeCompare(b.title);
          case 'TITLE_DESC':
            return b.title.localeCompare(a.title);
          case 'STATUS_ASC':
            return STATUS_ORDER.indexOf(a.status) - STATUS_ORDER.indexOf(b.status);
          case 'STATUS_DESC':
            return STATUS_ORDER.indexOf(b.status) - STATUS_ORDER.indexOf(a.status);
          default:
            return 0;
        }
      });
    }

    return result;
  }, [items, searchQuery, sortBy, filterStatus]);

  const toggleItemSelected = (itemId: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(itemId)) {
        next.delete(itemId);
      } else {
        next.add(itemId);
      }
      return next;
    });
  };

  const enterSelectionMode = () => {
    setOptionsModalVisible(false);
    setSelectionMode(true);
    setSelectedIds(new Set());
  };

  const exitSelectionMode = () => {
    setSelectionMode(false);
    setSelectedIds(new Set());
  };

  const handleCardPress = (item: MediaItem) => {
    if (selectionMode) {
      toggleItemSelected(item.id);
    } else {
      router.push(`/${item.id}`);
    }
  };

  const handleDeleteSelected = () => {
    if (selectedIds.size === 0) return;
    const count = selectedIds.size;
    Alert.alert(
      'Delete Items',
      `Delete ${count} item${count === 1 ? '' : 's'}? This removes ${
        count === 1 ? 'it' : 'them'
      } from your whole library, not just this list. This can't be undone.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await Promise.all(Array.from(selectedIds).map((mediaId) => deleteMediaItem(mediaId)));
            } catch (error) {
              console.error('Failed to delete selected items:', error);
            } finally {
              exitSelectionMode();
              loadList();
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

  if (!list) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.notFoundContainer}>
          <Text style={styles.notFoundText}>List not found</Text>
          <TouchableOpacity style={styles.backBtnSolid} onPress={() => router.back()}>
            <Text style={styles.backBtnSolidText}>Go Back</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      {/* TOP BAR: BACK (LEFT) + LIST TITLE/TYPE (CENTER) + SEARCH TOGGLE (RIGHT) */}
      <View style={styles.topBar}>
        <TouchableOpacity style={styles.iconCircle} onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={22} color="#1A1A1A" />
        </TouchableOpacity>

        <View style={styles.topBarTitleWrap}>
          <Text style={styles.topBarTitle} numberOfLines={1}>
            {list.title}
          </Text>
          <Text style={styles.topBarSubtitle} numberOfLines={1}>
            {LIST_TYPE_LABELS[list.list_type]}
          </Text>
        </View>

        <TouchableOpacity style={styles.iconCircle} onPress={toggleSearch}>
          <Ionicons name={searchActive ? 'close' : 'search'} size={20} color="#1A1A1A" />
        </TouchableOpacity>
      </View>

      {/* IN-LIST SEARCH BAR (only searches items already in this list) */}
      {searchActive && (
        <View style={styles.searchBarWrapper}>
          <Ionicons name="search" size={16} color="#888" style={{ marginRight: 8 }} />
          <TextInput
            style={styles.searchInput}
            placeholder="Search in this list..."
            placeholderTextColor="#999"
            value={searchQuery}
            onChangeText={setSearchQuery}
            autoFocus
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity
              onPress={() => setSearchQuery('')}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            >
              <Ionicons name="close-circle" size={16} color="#999" />
            </TouchableOpacity>
          )}
        </View>
      )}

      {/* ITEM GRID */}
      <ScrollView contentContainerStyle={styles.scrollContent}>
        {displayedItems.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyText}>
              {items.length === 0 ? 'No items in this list yet!' : 'No matches found'}
            </Text>
            <Text style={styles.emptySubText}>
              {items.length === 0
                ? 'Tap "+ Add Media" below to search and add something.'
                : 'Try a different search or filter.'}
            </Text>
          </View>
        ) : (
          <View style={styles.grid}>
            {displayedItems.map((item) => {
              const statusMeta = STATUS_META[item.status];
              const isSelected = selectedIds.has(item.id);
              return (
                <TouchableOpacity
                  key={item.id}
                  style={[styles.gridCard, isSelected && styles.gridCardSelected]}
                  activeOpacity={0.85}
                  onPress={() => handleCardPress(item)}
                >
                  {selectionMode && (
                    <View style={[styles.selectCheckbox, isSelected && styles.selectCheckboxActive]}>
                      {isSelected && <Ionicons name="checkmark" size={12} color="#FFFFFF" />}
                    </View>
                  )}

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

      {/* BOTTOM RIGHT: ADD MEDIA (stacked above) + OPTIONS FAB, or the selection bar when selecting */}
      {!selectionMode ? (
        <View style={styles.fabColumn}>
          <TouchableOpacity
            style={styles.addMediaFab}
            onPress={() => router.push(`/search?listId=${list.id}`)}
          >
            <Ionicons name="add" size={20} color="#FFFFFF" />
          </TouchableOpacity>

          <TouchableOpacity style={styles.optionsFab} onPress={() => setOptionsModalVisible(true)}>
            <Ionicons name="ellipsis-horizontal" size={22} color="#FFFFFF" />
          </TouchableOpacity>
        </View>
      ) : (
        <View style={styles.selectionBar}>
          <TouchableOpacity style={styles.selectionCancelBtn} onPress={exitSelectionMode}>
            <Text style={styles.selectionCancelText}>Cancel</Text>
          </TouchableOpacity>

          <Text style={styles.selectionCountText}>{selectedIds.size} selected</Text>

          <TouchableOpacity
            style={[styles.selectionDeleteBtn, selectedIds.size === 0 && styles.selectionDeleteBtnDisabled]}
            onPress={handleDeleteSelected}
            disabled={selectedIds.size === 0}
          >
            <Ionicons name="trash-outline" size={16} color="#FFFFFF" />
            <Text style={styles.selectionDeleteText}>Delete</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* OPTIONS MODAL: sort, filter, and entry point into multi-select edit mode */}
      <Modal
        visible={optionsModalVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setOptionsModalVisible(false)}
      >
        <Pressable style={styles.modalOverlay} onPress={() => setOptionsModalVisible(false)}>
          <Pressable style={styles.modalSheet}>
            <Text style={styles.modalHeading}>List Options</Text>

            <Text style={styles.modalLabel}>Sort by</Text>
            <View style={styles.optionRow}>
              {SORT_OPTIONS.map((opt) => (
                <TouchableOpacity
                  key={opt.value}
                  style={[styles.optionChip, sortBy === opt.value && styles.optionChipActive]}
                  onPress={() => setSortBy(opt.value)}
                >
                  <Text
                    style={[
                      styles.optionChipText,
                      sortBy === opt.value && styles.optionChipTextActive,
                    ]}
                  >
                    {opt.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <Text style={styles.modalLabel}>Filter by status</Text>
            <View style={styles.optionRow}>
              {FILTER_OPTIONS.map((opt) => (
                <TouchableOpacity
                  key={opt.value}
                  style={[styles.optionChip, filterStatus === opt.value && styles.optionChipActive]}
                  onPress={() => setFilterStatus(opt.value)}
                >
                  <Text
                    style={[
                      styles.optionChipText,
                      filterStatus === opt.value && styles.optionChipTextActive,
                    ]}
                  >
                    {opt.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <View style={styles.modalDivider} />

            <TouchableOpacity style={styles.editListRow} onPress={enterSelectionMode}>
              <Ionicons name="checkbox-outline" size={18} color="#1A1A1A" />
              <Text style={styles.editListRowText}>Select & Delete Items</Text>
            </TouchableOpacity>
          </Pressable>
        </Pressable>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: '#FDFBF7' },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
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
  topBarTitleWrap: { flex: 1, alignItems: 'center', marginHorizontal: 8 },
  topBarTitle: { fontSize: 17, fontWeight: '900', color: '#1A1A1A', textAlign: 'center' },
  topBarSubtitle: {
    fontSize: 11,
    fontWeight: '700',
    color: '#666',
    marginTop: 2,
    textAlign: 'center',
  },
  searchBarWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderWidth: 2,
    borderColor: '#1A1A1A',
    borderRadius: 16,
    paddingHorizontal: 14,
    paddingVertical: 10,
    marginHorizontal: 20,
    marginBottom: 14,
  },
  searchInput: { flex: 1, fontSize: 14, fontWeight: '600', color: '#1A1A1A' },
  scrollContent: { padding: 20, paddingTop: 6, paddingBottom: 130 },
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
  gridCardSelected: {
    borderWidth: 2.5,
    borderColor: '#FF8A8A',
  },
  selectCheckbox: {
    position: 'absolute',
    top: 6,
    right: 6,
    zIndex: 2,
    width: 20,
    height: 20,
    borderRadius: 6,
    borderWidth: 1.5,
    borderColor: '#1A1A1A',
    backgroundColor: '#FFFFFF',
    justifyContent: 'center',
    alignItems: 'center',
  },
  selectCheckboxActive: { backgroundColor: '#FF8A8A' },
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

  // Bottom-right FAB column: Add Media stacked directly above Options
  fabColumn: {
    position: 'absolute',
    bottom: 30,
    right: 20,
    alignItems: 'flex-end',
    gap: 12,
  },
  addMediaFab: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: '#1A1A1A',
    justifyContent: 'center',
    alignItems: 'center',
  },
  optionsFab: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: '#1A1A1A',
    justifyContent: 'center',
    alignItems: 'center',
  },

  // Multi-select action bar (replaces the FAB column while selecting)
  selectionBar: {
    position: 'absolute',
    bottom: 24,
    left: 20,
    right: 20,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#FFFFFF',
    borderWidth: 2,
    borderColor: '#1A1A1A',
    borderRadius: 20,
    paddingHorizontal: 14,
    paddingVertical: 10,
    shadowColor: '#1A1A1A',
    shadowOffset: { width: 3, height: 3 },
    shadowOpacity: 1,
    shadowRadius: 0,
    elevation: 5,
  },
  selectionCancelBtn: { paddingVertical: 6, paddingHorizontal: 4 },
  selectionCancelText: { fontSize: 13, fontWeight: '800', color: '#666' },
  selectionCountText: { fontSize: 13, fontWeight: '800', color: '#1A1A1A' },
  selectionDeleteBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#D9534F',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 14,
  },
  selectionDeleteBtnDisabled: { backgroundColor: '#CCCCCC' },
  selectionDeleteText: { color: '#FFFFFF', fontWeight: '800', fontSize: 13 },

  // Options modal
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent: 'flex-end',
  },
  modalSheet: {
    backgroundColor: '#FDFBF7',
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    borderWidth: 2,
    borderColor: '#1A1A1A',
    padding: 24,
    gap: 10,
  },
  modalHeading: { fontSize: 19, fontWeight: '900', color: '#1A1A1A', marginBottom: 4 },
  modalLabel: { fontSize: 13, fontWeight: '800', color: '#1A1A1A', marginTop: 6 },
  optionRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  optionChip: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: '#1A1A1A',
    backgroundColor: '#FFFFFF',
  },
  optionChipActive: { backgroundColor: '#FFB6B6' },
  optionChipText: { fontSize: 12, fontWeight: '800', color: '#1A1A1A' },
  optionChipTextActive: { color: '#1A1A1A' },
  modalDivider: {
    height: 1,
    backgroundColor: '#E5E0D8',
    marginVertical: 8,
  },
  editListRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: '#FFFFFF',
    borderWidth: 2,
    borderColor: '#1A1A1A',
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  editListRowText: { fontSize: 14, fontWeight: '800', color: '#1A1A1A' },
});