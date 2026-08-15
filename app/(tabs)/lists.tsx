import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Modal,
  TextInput,
  Pressable,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { getCustomLists, createCustomList, CustomList } from '../../services/mediaService';
import { useRouter, useFocusEffect } from 'expo-router';

const LIST_TYPES = [
  { label: '🍿 Mixed / Any', value: 'ALL' },
  { label: '🎬 Movies Only', value: 'MOVIE' },
  { label: '📺 TV Shows Only', value: 'TV' },
  { label: '📚 Books Only', value: 'BOOK' },
] as const;

const PASTEL_COLORS = ['#E2F1E7', '#FFF3B0', '#FFB6B6', '#D1E8FF', '#F3D1FF'];

export default function ListsScreen() {
  const router = useRouter();
  const [lists, setLists] = useState<CustomList[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  
  // New List Form State
  const [title, setTitle] = useState('');
  const [emoji, setEmoji] = useState('🍿');
  const [selectedColor, setSelectedColor] = useState(PASTEL_COLORS[0]);
  const [selectedType, setSelectedType] = useState<'ALL' | 'MOVIE' | 'TV' | 'BOOK'>('ALL');

  useFocusEffect(
    useCallback(() => {
      loadLists();
    }, [])
  );

  const loadLists = async () => {
    const fetchedLists = await getCustomLists();
    setLists(fetchedLists);
  };

  const handleCreateList = async () => {
    if (!title.trim()) return;
    await createCustomList(title, emoji, selectedColor, selectedType);
    setTitle('');
    setIsModalOpen(false);
    loadLists();
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView contentContainerStyle={styles.container}>
        <View style={styles.header}>
          <Text style={styles.title}>My Lists</Text>
          <TouchableOpacity style={styles.addBtn} onPress={() => setIsModalOpen(true)}>
            <Ionicons name="add" size={24} color="#1A1A1A" />
          </TouchableOpacity>
        </View>

        {lists.length === 0 ? (
          <View style={styles.emptyState}>
            <Text style={styles.emptyText}>No lists created yet!</Text>
            <Text style={styles.emptySubText}>Tap "+ New List" above to make your first list.</Text>
          </View>
        ) : (
          <View style={styles.grid}>
            {lists.map((item) => (
              <TouchableOpacity
                key={item.id}
                style={[styles.listCard, { backgroundColor: item.cover_color }]}
                onPress={() => router.push(`/list/${item.id}`)}
              >
                <Text style={styles.cardEmoji}>{item.emoji_icon}</Text>
                <Text style={styles.cardTitle}>{item.title}</Text>
                <Text style={styles.cardBadge}>
                  {item.list_type === 'ALL' ? 'Mixed' : item.list_type}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        )}
      </ScrollView>

      {/* CREATE LIST MODAL SHEET */}
      <Modal visible={isModalOpen} transparent animationType="slide">
        <Pressable style={styles.modalOverlay} onPress={() => setIsModalOpen(false)}>
          <Pressable style={styles.modalSheet}>
            <Text style={styles.modalHeading}>Create New List</Text>

            {/* List Title Input */}
            <TextInput
              style={styles.input}
              placeholder="List Title (e.g. Favorite Movies)"
              placeholderTextColor="#888"
              value={title}
              onChangeText={setTitle}
            />

            {/* Emoji Selection */}
            <Text style={styles.label}>Choose Emoji Icon:</Text>
            <View style={styles.row}>
              {['🍿', '🎬', '📺', '📚', '💖', '⭐'].map((e) => (
                <TouchableOpacity
                  key={e}
                  style={[styles.emojiChip, emoji === e && styles.activeChip]}
                  onPress={() => setEmoji(e)}
                >
                  <Text style={{ fontSize: 20 }}>{e}</Text>
                </TouchableOpacity>
              ))}
            </View>

            {/* List Type Restriction */}
            <Text style={styles.label}>Allowed Media Type:</Text>
            <View style={styles.typeContainer}>
              {LIST_TYPES.map((t) => (
                <TouchableOpacity
                  key={t.value}
                  style={[
                    styles.typeChip,
                    selectedType === t.value && styles.activeTypeChip,
                  ]}
                  onPress={() => setSelectedType(t.value)}
                >
                  <Text style={styles.typeText}>{t.label}</Text>
                </TouchableOpacity>
              ))}
            </View>

            {/* Color Selection */}
            <Text style={styles.label}>Card Theme Color:</Text>
            <View style={styles.row}>
              {PASTEL_COLORS.map((c) => (
                <TouchableOpacity
                  key={c}
                  style={[
                    styles.colorCircle,
                    { backgroundColor: c },
                    selectedColor === c && styles.activeColorCircle,
                  ]}
                  onPress={() => setSelectedColor(c)}
                />
              ))}
            </View>

            {/* Submit Button */}
            <TouchableOpacity style={styles.submitBtn} onPress={handleCreateList}>
              <Text style={styles.submitBtnText}>Save List</Text>
            </TouchableOpacity>
          </Pressable>
        </Pressable>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: '#FDFBF7' },
  container: { padding: 20, paddingBottom: 110 },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  title: { fontSize: 26, fontWeight: '900', color: '#1A1A1A' },
  addBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFB6B6',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 16,
    borderWidth: 2,
    borderColor: '#1A1A1A',
    gap: 4,
  },
  grid: { gap: 14 },
  listCard: {
    borderRadius: 20,
    borderWidth: 2,
    borderColor: '#1A1A1A',
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    shadowColor: '#1A1A1A',
    shadowOffset: { width: 3, height: 3 },
    shadowOpacity: 1,
    shadowRadius: 0,
    elevation: 3,
  },
  cardEmoji: { fontSize: 28, marginRight: 12 },
  cardTitle: { flex: 1, fontSize: 18, fontWeight: '800', color: '#1A1A1A' },
  cardBadge: {
    fontSize: 10,
    fontWeight: '900',
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#1A1A1A',
  },
  emptyState: { padding: 40, alignItems: 'center' },
  emptyText: { fontSize: 18, fontWeight: '800', color: '#1A1A1A' },
  emptySubText: { fontSize: 13, color: '#666', marginTop: 4 },
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
    gap: 16,
  },
  modalHeading: { fontSize: 20, fontWeight: '900', color: '#1A1A1A' },
  input: {
    backgroundColor: '#FFFFFF',
    borderWidth: 2,
    borderColor: '#1A1A1A',
    borderRadius: 14,
    padding: 12,
    fontSize: 15,
    fontWeight: '600',
  },
  label: { fontSize: 13, fontWeight: '800', color: '#1A1A1A', marginTop: 4 },
  row: { flexDirection: 'row', gap: 10 },
  emojiChip: {
    padding: 8,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: '#1A1A1A',
    backgroundColor: '#FFF',
  },
  activeChip: { backgroundColor: '#FFB6B6' },
  typeContainer: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  typeChip: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: '#1A1A1A',
    backgroundColor: '#FFFFFF',
  },
  activeTypeChip: { backgroundColor: '#E2F1E7' },
  typeText: { fontSize: 12, fontWeight: '800', color: '#1A1A1A' },
  colorCircle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    borderWidth: 1.5,
    borderColor: '#1A1A1A',
  },
  activeColorCircle: { borderWidth: 3 },
  submitBtn: {
    backgroundColor: '#1A1A1A',
    borderRadius: 16,
    padding: 14,
    alignItems: 'center',
    marginTop: 8,
  },
  submitBtnText: { color: '#FFFFFF', fontWeight: '900', fontSize: 15 },
});