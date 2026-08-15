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
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter, useLocalSearchParams } from 'expo-router';

import { searchMediaByRestriction, SearchResultItem } from '../../services/apiService';
import { addSearchResultToLibrary, getListById, CustomList } from '../../services/mediaService';

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

  const [list, setList] = useState<CustomList | null>(null);
  const [query, setQuery] = useState('');
  const [activeFilter, setActiveFilter] = useState<MediaFilter>('ALL');
  const [results, setResults] = useState<SearchResultItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [addedIds, setAddedIds] = useState<Set<string>>(new Set());

  // If we arrived from a specific list, load it and lock the filter
  // to that list's allowed media type (if it has one).
  useEffect(() => {
    if (!listId) return;
    (async () => {
      const listData = await getListById(listId);
      setList(listData);
      if (listData && listData.list_type !== 'ALL') {
        setActiveFilter(listData.list_type);
      }
    })();
  }, [listId]);

  // Debounced search — waits for a pause in typing before hitting the API
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

  const handleAdd = async (item: SearchResultItem) => {
    try {
      await addSearchResultToLibrary(item, listId);
      setAddedIds((prev) => new Set(prev).add(item.id));
    } catch (error) {
      console.error('Failed to add item:', error);
    }
  };

  const filterLocked = !!list && list.list_type !== 'ALL';

  return (
    <SafeAreaView style={styles.safeArea}>
      {/* TOP BAR */}
      <View style={styles.topBar}>
        <TouchableOpacity style={styles.iconCircle} onPress={() => router.back()}>
          <Ionicons name="close" size={22} color="#1A1A1A" />
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
                  onPress={() => handleAdd(item)}
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
});