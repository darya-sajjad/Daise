// app/(tabs)/search.tsx
import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  FlatList,
  Image,
  ActivityIndicator,
  Modal,
  Pressable,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter, useLocalSearchParams } from 'expo-router';

import { searchMediaByRestriction, SearchResultItem } from '../../services/apiService';
import {
  addSearchResultToLibrary,
  getListById,
  getCustomLists,
  CustomList,
} from '../../services/mediaService';

type MediaFilter = 'ALL' | 'MOVIE' | 'TV' | 'BOOK';

const FILTER_TABS: { label: string; value: MediaFilter }[] = [
  { label: '✨ All', value: 'ALL' },
  { label: '🎬 Movies', value: 'MOVIE' },
  { label: '📺 TV', value: 'TV' },
  { label: '📚 Books', value: 'BOOK' },
];

export default function SearchScreen() {
  const router = useRouter();
  const { listId } = useLocalSearchParams<{ listId?: string }>();
  const isListContext = !!listId;

  const [list, setList] = useState<CustomList | null>(null);
  const [allLists, setAllLists] = useState<CustomList[]>([]);
  const [query, setQuery] = useState('');
  const [activeFilter, setActiveFilter] = useState<MediaFilter>('ALL');
  const [results, setResults] = useState<SearchResultItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [addedIds, setAddedIds] = useState<Set<string>>(new Set());

  // List-picker modal state (Home-mode only)
  const [pickerItem, setPickerItem] = useState<SearchResultItem | null>(null);
  const [selectedListIds, setSelectedListIds] = useState<Set<string>>(new Set());

  // Reset everything each time this screen is entered in a new context.
  // Tab screens stay mounted in Expo Router, so without this, state from a
  // previous visit (e.g. a locked filter from inside a list) would silently
  // leak into the next visit (e.g. adding from Home) instead of resetting.
  useEffect(() => {
    if (listId) {
      (async () => {
        const listData = await getListById(listId);
        setList(listData);
        setActiveFilter(listData && listData.list_type !== 'ALL' ? listData.list_type : 'ALL');
      })();
    } else {
      setList(null);
      setActiveFilter('ALL');
    }

    setQuery('');
    setResults([]);
    setAddedIds(new Set());
    setPickerItem(null);
    setSelectedListIds(new Set());
  }, [listId]);

  // If arriving from Home (no listId), preload all lists for the picker
  useEffect(() => {
    if (isListContext) return;
    (async () => {
      const lists = await getCustomLists();
      setAllLists(lists);
    })();
  }, [isListContext]);

  // Debounced search
  useEffect(() => {
    if (!query.trim()) {
      setResults([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    const timeout = setTimeout(async () => {
      try {
        const data = await searchMediaByRestriction(query, activeFilter);
        setResults(data);
      } catch (error) {
        console.error('Search failed:', error);
        setResults([]);
      } finally {
        setLoading(false);
      }
    }, 500);

    return () => clearTimeout(timeout);
  }, [query, activeFilter]);

  // List-context: tapping + saves straight into that one list, no picker needed
  const handleDirectAdd = async (item: SearchResultItem) => {
    try {
      await addSearchResultToLibrary(item, [listId as string]);
      setAddedIds((prev) => new Set(prev).add(item.id));
    } catch (error) {
      console.error('Failed to add item:', error);
    }
  };

  // Home-mode: tapping + opens the list picker instead of saving immediately
  const openPicker = (item: SearchResultItem) => {
    setPickerItem(item);
    setSelectedListIds(new Set());
  };

  const closePicker = () => {
    setPickerItem(null);
    setSelectedListIds(new Set());
  };

  const toggleListSelection = (id: string) => {
    setSelectedListIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const confirmPickerAdd = async () => {
    if (!pickerItem || selectedListIds.size === 0) return;
    try {
      await addSearchResultToLibrary(pickerItem, Array.from(selectedListIds));
      setAddedIds((prev) => new Set(prev).add(pickerItem.id));
      closePicker();
    } catch (error) {
      console.error('Failed to add item:', error);
    }
  };

  const handleAddPress = (item: SearchResultItem) => {
    if (isListContext) {
      handleDirectAdd(item);
    } else {
      openPicker(item);
    }
  };

  const filterLocked = !!list && list.list_type !== 'ALL';

  // Lists compatible with the item currently in the picker (type-restricted lists
  // can't hold items outside their type)
  const compatibleLists = pickerItem
    ? allLists.filter((l) => l.list_type === 'ALL' || l.list_type === pickerItem.media_type)
    : [];

  // router.back() is unreliable here: entering search from a list screen crosses
  // from the root stack into the tabs navigator, which isn't a normal stack push,
  // so "back" can land on Home instead of the list you actually came from.
  // Explicitly navigating to the known destination sidesteps that entirely.
  const handleClose = () => {
    if (isListContext) {
      router.dismissTo(`/list/${listId}`);
    } else {
      router.back();
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      {/* TOP BAR */}
      <View style={styles.topBar}>
        <TouchableOpacity style={styles.iconCircle} onPress={handleClose}>
          <Ionicons name="arrow-back" size={22} color="#1A1A1A" />
        </TouchableOpacity>
        <Text style={styles.topBarTitle} numberOfLines={1}>
          {list ? `Add to "${list.title}"` : 'Add Media'}
        </Text>
        <View style={styles.iconCircle} />
      </View>

      {/* SEARCH INPUT */}
      <View style={styles.searchBarWrapper}>
        <Ionicons name="search" size={18} color="#888" style={{ marginRight: 8 }} />
        <TextInput
          style={styles.searchInput}
          placeholder="Search movies, TV shows, or books..."
          placeholderTextColor="#999"
          value={query}
          onChangeText={setQuery}
          autoFocus
        />
        {query.length > 0 && (
          <TouchableOpacity
            onPress={() => setQuery('')}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <Ionicons name="close-circle" size={18} color="#999" />
          </TouchableOpacity>
        )}
      </View>

      {/* MEDIA TYPE FILTER TABS (hidden if list restricts to one type) */}
      {!filterLocked && (
        <View style={styles.filterRow}>
          {FILTER_TABS.map((tab) => (
            <TouchableOpacity
              key={tab.value}
              style={[styles.filterPill, activeFilter === tab.value && styles.activeFilterPill]}
              onPress={() => setActiveFilter(tab.value)}
            >
              <Text style={styles.filterPillText}>{tab.label}</Text>
            </TouchableOpacity>
          ))}
        </View>
      )}

      {/* RESULTS */}
      {loading ? (
        <ActivityIndicator size="large" color="#FF8A8A" style={{ marginTop: 40 }} />
      ) : results.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyText}>
            {query.trim() ? 'No results found 😕' : 'Start typing to search 🔎'}
          </Text>
        </View>
      ) : (
        <FlatList
          data={results}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.resultsList}
          keyboardShouldPersistTaps="handled"
          renderItem={({ item }) => {
            const isAdded = addedIds.has(item.id);
            return (
              <View style={styles.resultRow}>
                {item.poster_path ? (
                  <Image source={{ uri: item.poster_path }} style={styles.resultPoster} />
                ) : (
                  <View style={styles.resultPlaceholder}>
                    <Ionicons name="film-outline" size={22} color="#1A1A1A" />
                  </View>
                )}

                <View style={styles.resultInfo}>
                  <Text style={styles.resultTitle} numberOfLines={2}>
                    {item.title}
                  </Text>
                  <Text style={styles.resultSubtitle}>
                    {item.media_type}
                    {item.release_date ? ` • ${item.release_date.slice(0, 4)}` : ''}
                  </Text>
                </View>

                <TouchableOpacity
                  style={[styles.addBtn, isAdded && styles.addedBtn]}
                  onPress={() => handleAddPress(item)}
                  disabled={isAdded}
                >
                  <Ionicons
                    name={isAdded ? 'checkmark' : 'add'}
                    size={20}
                    color={isAdded ? '#1A1A1A' : '#FFFFFF'}
                  />
                </TouchableOpacity>
              </View>
            );
          }}
        />
      )}

      {/* LIST PICKER MODAL (Home-mode only) */}
      <Modal visible={!!pickerItem} transparent animationType="slide" onRequestClose={closePicker}>
        <Pressable style={styles.modalOverlay} onPress={closePicker}>
          <Pressable style={styles.modalSheet}>
            <Text style={styles.modalHeading}>Add to which list?</Text>
            <Text style={styles.modalSubtext} numberOfLines={1}>
              {pickerItem?.title}
            </Text>

            {compatibleLists.length === 0 ? (
              <View style={styles.noListsContainer}>
                <Text style={styles.noListsText}>
                  You don't have a compatible list yet — every item needs to belong to at
                  least one list.
                </Text>
                <TouchableOpacity
                  style={styles.createListBtn}
                  onPress={() => {
                    closePicker();
                    router.push('/lists');
                  }}
                >
                  <Text style={styles.createListBtnText}>Go Create a List</Text>
                </TouchableOpacity>
              </View>
            ) : (
              <>
                <View style={styles.listOptions}>
                  {compatibleLists.map((l) => {
                    const isSelected = selectedListIds.has(l.id);
                    return (
                      <TouchableOpacity
                        key={l.id}
                        style={[styles.listOptionRow, isSelected && styles.listOptionRowActive]}
                        onPress={() => toggleListSelection(l.id)}
                      >
                        <Text style={styles.listOptionEmoji}>{l.emoji_icon}</Text>
                        <Text style={styles.listOptionText}>{l.title}</Text>
                        <View style={[styles.checkbox, isSelected && styles.checkboxActive]}>
                          {isSelected && <Ionicons name="checkmark" size={14} color="#FFFFFF" />}
                        </View>
                      </TouchableOpacity>
                    );
                  })}
                </View>

                <TouchableOpacity
                  style={[styles.confirmBtn, selectedListIds.size === 0 && styles.confirmBtnDisabled]}
                  onPress={confirmPickerAdd}
                  disabled={selectedListIds.size === 0}
                >
                  <Text style={styles.confirmBtnText}>
                    Add to {selectedListIds.size || ''} List{selectedListIds.size === 1 ? '' : 's'}
                  </Text>
                </TouchableOpacity>
              </>
            )}
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
  topBarTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: '#1A1A1A',
    flex: 1,
    textAlign: 'center',
    marginHorizontal: 8,
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
  searchInput: { flex: 1, fontSize: 15, fontWeight: '600', color: '#1A1A1A' },
  filterRow: {
    flexDirection: 'row',
    gap: 8,
    paddingHorizontal: 20,
    marginBottom: 14,
  },
  filterPill: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: '#1A1A1A',
    backgroundColor: '#FFFFFF',
  },
  activeFilterPill: { backgroundColor: '#FFB6B6' },
  filterPillText: { fontSize: 12, fontWeight: '800', color: '#1A1A1A' },
  resultsList: { paddingHorizontal: 20, paddingBottom: 40, gap: 12 },
  resultRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderWidth: 2,
    borderColor: '#1A1A1A',
    borderRadius: 16,
    padding: 10,
    gap: 12,
    shadowColor: '#1A1A1A',
    shadowOffset: { width: 2, height: 2 },
    shadowOpacity: 1,
    shadowRadius: 0,
    elevation: 3,
  },
  resultPoster: {
    width: 50,
    height: 74,
    borderRadius: 8,
    borderWidth: 1.5,
    borderColor: '#1A1A1A',
  },
  resultPlaceholder: {
    width: 50,
    height: 74,
    borderRadius: 8,
    borderWidth: 1.5,
    borderColor: '#1A1A1A',
    backgroundColor: '#E2F1E7',
    justifyContent: 'center',
    alignItems: 'center',
  },
  resultInfo: { flex: 1 },
  resultTitle: { fontSize: 14, fontWeight: '800', color: '#1A1A1A', marginBottom: 4 },
  resultSubtitle: { fontSize: 12, color: '#666', fontWeight: '600' },
  addBtn: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: '#1A1A1A',
    justifyContent: 'center',
    alignItems: 'center',
  },
  addedBtn: {
    backgroundColor: '#E2F1E7',
    borderWidth: 1.5,
    borderColor: '#1A1A1A',
  },
  emptyContainer: { padding: 40, alignItems: 'center' },
  emptyText: { fontSize: 15, fontWeight: '700', color: '#666', textAlign: 'center' },

  // List picker modal
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
    gap: 14,
    maxHeight: '75%',
  },
  modalHeading: { fontSize: 19, fontWeight: '900', color: '#1A1A1A' },
  modalSubtext: { fontSize: 13, color: '#666', fontWeight: '600', marginTop: -8 },
  listOptions: { gap: 10 },
  listOptionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderWidth: 2,
    borderColor: '#1A1A1A',
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 12,
    gap: 10,
  },
  listOptionRowActive: { backgroundColor: '#FFF3B0' },
  listOptionEmoji: { fontSize: 20 },
  listOptionText: { flex: 1, fontSize: 14, fontWeight: '800', color: '#1A1A1A' },
  checkbox: {
    width: 22,
    height: 22,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: '#1A1A1A',
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
  },
  checkboxActive: { backgroundColor: '#1A1A1A' },
  confirmBtn: {
    backgroundColor: '#1A1A1A',
    borderRadius: 16,
    padding: 14,
    alignItems: 'center',
  },
  confirmBtnDisabled: { backgroundColor: '#CCCCCC' },
  confirmBtnText: { color: '#FFFFFF', fontWeight: '900', fontSize: 15 },
  noListsContainer: { alignItems: 'center', paddingVertical: 12, gap: 14 },
  noListsText: { fontSize: 14, color: '#666', fontWeight: '600', textAlign: 'center' },
  createListBtn: {
    backgroundColor: '#1A1A1A',
    borderRadius: 14,
    paddingHorizontal: 20,
    paddingVertical: 12,
  },
  createListBtnText: { color: '#FFFFFF', fontWeight: '800', fontSize: 14 },
});