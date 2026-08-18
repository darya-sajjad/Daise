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
  Modal,
  TextInput,
  Pressable,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';

import {
  MediaItem,
  Tag,
  getMediaItemById,
  updateProgress,
  updateMediaStatus,
  deleteMediaItem,
  getTagsForMedia,
  getAllTags,
  createTag,
  addTagToMedia,
  removeTagFromMedia,
  deleteTag,
} from '../services/mediaService';

// Same underlying status values everywhere (WATCHING, PLAN_TO_WATCH, etc.) — only
// the displayed label changes based on media type, since "Watching" doesn't fit books.
const getStatusOptions = (
  mediaType: MediaItem['media_type']
): { label: string; value: MediaItem['status'] }[] => {
  const isBook = mediaType === 'BOOK';
  return [
    { label: isBook ? 'Reading' : 'Watching', value: 'WATCHING' },
    { label: isBook ? 'Plan to Read' : 'Plan to Watch', value: 'PLAN_TO_WATCH' },
    { label: 'Completed', value: 'COMPLETED' },
    { label: 'Dropped', value: 'DROPPED' },
  ];
};

const TAG_COLORS = ['#E2F1E7', '#FFF3B0', '#FFB6B6', '#D1E8FF', '#F3D1FF'];

export default function MediaDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();

  const [item, setItem] = useState<MediaItem | null>(null);
  const [loading, setLoading] = useState(true);

  // Tags
  const [mediaTags, setMediaTags] = useState<Tag[]>([]);
  const [allTags, setAllTags] = useState<Tag[]>([]);
  const [tagModalVisible, setTagModalVisible] = useState(false);
  const [newTagName, setNewTagName] = useState('');
  const [newTagColor, setNewTagColor] = useState(TAG_COLORS[0]);

  // Overview "Show more" state
  const [overviewExpanded, setOverviewExpanded] = useState(false);
  const [overviewNeedsTruncation, setOverviewNeedsTruncation] = useState(false);

  // Status dropdown
  const [statusDropdownOpen, setStatusDropdownOpen] = useState(false);

  useEffect(() => {
    if (id) loadMedia();
  }, [id]);

  const loadMedia = async () => {
    setLoading(true);
    const data = await getMediaItemById(id);
    setItem(data);
    setOverviewExpanded(false);
    setOverviewNeedsTruncation(false);
    if (data) await loadTags();
    setLoading(false);
  };

  const loadTags = async () => {
    const [assigned, everything] = await Promise.all([
      getTagsForMedia(id),
      getAllTags(),
    ]);
    setMediaTags(assigned);
    setAllTags(everything);
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

  // Tapping a tag in the modal toggles it on/off for this item
  const handleToggleTag = async (tag: Tag) => {
    if (!item) return;
    const isActive = mediaTags.some((t) => t.id === tag.id);
    if (isActive) {
      await removeTagFromMedia(item.id, tag.id);
    } else {
      await addTagToMedia(item.id, tag.id);
    }
    loadTags();
  };

  // Removing a tag directly from the pill on the main screen (no modal needed)
  const handleRemoveTag = async (tagId: string) => {
    if (!item) return;
    await removeTagFromMedia(item.id, tagId);
    loadTags();
  };

  const handleCreateTag = async () => {
    if (!item || !newTagName.trim()) return;
    const tag = await createTag(newTagName, newTagColor);
    await addTagToMedia(item.id, tag.id);
    setNewTagName('');
    loadTags();
  };

  // Deletes a tag globally — removes it from every item, not just this one
  const handleDeleteTag = (tag: Tag) => {
    Alert.alert(
      'Delete Tag',
      `"${tag.name}" will be removed from every item it's attached to, not just this one. This can't be undone.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            await deleteTag(tag.id);
            loadTags();
          },
        },
      ]
    );
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
          <Text style={styles.notFoundText}>Media item not found.</Text>
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

        {/* TAGS SECTION */}
        <View style={styles.sectionContainer}>
          <Text style={styles.sectionHeader}>Tags</Text>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.tagsRow}
          >
            {mediaTags.map((tag) => (
              <View key={tag.id} style={[styles.tagPill, { backgroundColor: tag.color_hex }]}>
                <Text style={styles.tagPillText}>{tag.name}</Text>
                <TouchableOpacity
                  onPress={() => handleRemoveTag(tag.id)}
                  hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
                >
                  <Ionicons name="close" size={12} color="#1A1A1A" />
                </TouchableOpacity>
              </View>
            ))}

            <TouchableOpacity style={styles.addTagPill} onPress={() => setTagModalVisible(true)}>
              <Ionicons name="add" size={14} color="#1A1A1A" />
              <Text style={styles.addTagText}>Add Tag</Text>
            </TouchableOpacity>
          </ScrollView>
        </View>

        {/* DESCRIPTION */}
        <View style={styles.sectionContainer}>
          <Text style={styles.sectionHeader}>Overview</Text>

          {/* Invisible measuring pass — determines whether the full text actually
              exceeds 3 lines, so "Show more" only appears when it's truly needed */}
          <Text
            style={[styles.overviewText, styles.hiddenMeasureText]}
            onTextLayout={(e) => setOverviewNeedsTruncation(e.nativeEvent.lines.length > 3)}
          >
            {item.overview || 'No overview available.'}
          </Text>

          <Text
            style={styles.overviewText}
            numberOfLines={overviewExpanded ? undefined : 3}
          >
            {item.overview || 'No overview available.'}
          </Text>

          {overviewNeedsTruncation && (
            <TouchableOpacity onPress={() => setOverviewExpanded((prev) => !prev)}>
              <Text style={styles.showMoreText}>
                {overviewExpanded ? 'Show less' : 'Show more'}
              </Text>
            </TouchableOpacity>
          )}
        </View>

        {/* DETAIL EDIT BAR / ACTIONS */}
        <View style={styles.actionCard}>
          {/* PROGRESS EDIT (FOR TV & BOOKS) */}
          {item.media_type !== 'MOVIE' && (
            (() => {
              const current = item.media_type === 'TV' ? item.current_episode ?? 0 : item.current_page;
              const total = item.media_type === 'TV' ? item.total_episodes ?? 0 : item.total_pages;
              // Only cap when we actually know the total — a total of 0 means it's
              // unknown/unfetched, not "zero episodes", so don't block those.
              const atMax = total > 0 && current >= total;

              return (
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
                      style={[styles.counterBtn, atMax && styles.counterBtnDisabled]}
                      onPress={() => handleProgressChange(1)}
                      disabled={atMax}
                    >
                      <Ionicons name="add" size={18} color={atMax ? '#AAAAAA' : '#1A1A1A'} />
                    </TouchableOpacity>
                  </View>
                </View>
              );
            })()
          )}

          {/* STATUS DROPDOWN */}
          <Text style={[styles.progressLabel, { marginTop: item.media_type !== 'MOVIE' ? 14 : 0 }]}>
            Status
          </Text>
          <TouchableOpacity
            style={styles.statusDropdownBtn}
            onPress={() => setStatusDropdownOpen(true)}
          >
            <Text style={styles.statusDropdownText}>
              {getStatusOptions(item.media_type).find((opt) => opt.value === item.status)?.label}
            </Text>
            <Ionicons name="chevron-down" size={18} color="#1A1A1A" />
          </TouchableOpacity>
        </View>
      </ScrollView>

      {/* STATUS DROPDOWN MODAL */}
      <Modal
        visible={statusDropdownOpen}
        transparent
        animationType="fade"
        onRequestClose={() => setStatusDropdownOpen(false)}
      >
        <Pressable style={styles.modalOverlay} onPress={() => setStatusDropdownOpen(false)}>
          <Pressable style={styles.dropdownSheet}>
            {getStatusOptions(item.media_type).map((opt) => {
              const isSelected = item.status === opt.value;
              return (
                <TouchableOpacity
                  key={opt.value}
                  style={[styles.dropdownOption, isSelected && styles.dropdownOptionActive]}
                  onPress={() => {
                    handleStatusChange(opt.value);
                    setStatusDropdownOpen(false);
                  }}
                >
                  <Text
                    style={[
                      styles.dropdownOptionText,
                      isSelected && styles.dropdownOptionTextActive,
                    ]}
                  >
                    {opt.label}
                  </Text>
                  {isSelected && <Ionicons name="checkmark" size={16} color="#FFFFFF" />}
                </TouchableOpacity>
              );
            })}
          </Pressable>
        </Pressable>
      </Modal>

      {/* MANAGE TAGS MODAL */}
      <Modal
        visible={tagModalVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setTagModalVisible(false)}
      >
        <KeyboardAvoidingView
          style={{ flex: 1 }}
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        >
          <Pressable style={styles.modalOverlay} onPress={() => setTagModalVisible(false)}>
            <Pressable style={styles.modalSheet}>
              <Text style={styles.modalHeading}>Manage Tags</Text>

              {allTags.length > 0 && (
                <View style={styles.tagOptionsWrap}>
                  {allTags.map((tag) => {
                    const isActive = mediaTags.some((t) => t.id === tag.id);
                    return (
                      <View
                        key={tag.id}
                        style={[
                          styles.tagOptionChip,
                          { backgroundColor: tag.color_hex },
                          isActive && styles.tagOptionChipActive,
                        ]}
                      >
                        <TouchableOpacity
                          style={styles.tagOptionTapArea}
                          onPress={() => handleToggleTag(tag)}
                        >
                          {isActive && (
                            <Ionicons
                              name="checkmark"
                              size={12}
                              color="#1A1A1A"
                              style={{ marginRight: 4 }}
                            />
                          )}
                          <Text style={styles.tagOptionText}>{tag.name}</Text>
                        </TouchableOpacity>

                        <TouchableOpacity
                          onPress={() => handleDeleteTag(tag)}
                          hitSlop={{ top: 6, bottom: 6, left: 4, right: 6 }}
                          style={styles.tagDeleteBtn}
                        >
                          <Ionicons name="trash-outline" size={12} color="#1A1A1A" />
                        </TouchableOpacity>
                      </View>
                    );
                  })}
                </View>
              )}

              <Text style={styles.label}>Create New Tag:</Text>
              <TextInput
                style={styles.input}
                placeholder="e.g. Comfort Rewatch"
                placeholderTextColor="#888"
                value={newTagName}
                onChangeText={setNewTagName}
              />

              <View style={styles.row}>
                {TAG_COLORS.map((c) => (
                  <TouchableOpacity
                    key={c}
                    style={[
                      styles.colorCircle,
                      { backgroundColor: c },
                      newTagColor === c && styles.activeColorCircle,
                    ]}
                    onPress={() => setNewTagColor(c)}
                  />
                ))}
              </View>

              <TouchableOpacity style={styles.submitBtn} onPress={handleCreateTag}>
                <Text style={styles.submitBtnText}>Create & Add Tag</Text>
              </TouchableOpacity>

              <TouchableOpacity style={styles.doneBtn} onPress={() => setTagModalVisible(false)}>
                <Text style={styles.doneBtnText}>Done</Text>
              </TouchableOpacity>
            </Pressable>
          </Pressable>
        </KeyboardAvoidingView>
      </Modal>
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
    width: 170,
    height: 250,
    borderRadius: 16,
    borderWidth: 2,
    borderColor: '#1A1A1A',
  },
  placeholderImage: {
    width: 170,
    height: 250,
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
    fontWeight: '800',
    backgroundColor: '#FFB6B6',
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: '#1A1A1A',
  },
  title: {
    fontSize: 22,
    fontWeight: '800',
    color: '#1A1A1A',
    textAlign: 'center',
    marginBottom: 20,
  },
  sectionContainer: { marginBottom: 20 },
  sectionHeader: { fontSize: 16, fontWeight: '800', color: '#1A1A1A', marginBottom: 8 },
  tagsRow: { flexDirection: 'row', gap: 8, paddingRight: 8 },
  tagPill: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: '#1A1A1A',
    gap: 6,
  },
  tagPillText: { fontSize: 12, fontWeight: '700', color: '#1A1A1A' },
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
  hiddenMeasureText: {
    position: 'absolute',
    opacity: 0,
    zIndex: -1,
    left: 0,
    right: 0,
  },
  showMoreText: {
    fontSize: 13,
    fontWeight: '800',
    color: '#FF8A8A',
    marginTop: 6,
  },
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
  counterBtnDisabled: {
    backgroundColor: '#F0F0F0',
    borderColor: '#CCCCCC',
  },
  counterValue: { fontSize: 14, fontWeight: '800', color: '#1A1A1A' },
  statusDropdownBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#FDFBF7',
    borderWidth: 1.5,
    borderColor: '#1A1A1A',
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    marginTop: 8,
  },
  statusDropdownText: { fontSize: 14, fontWeight: '800', color: '#1A1A1A' },
  dropdownSheet: {
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    borderWidth: 2,
    borderColor: '#1A1A1A',
    marginHorizontal: 40,
    overflow: 'hidden',
    marginBottom: 80,
  },
  dropdownOption: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 18,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#EEE',
  },
  dropdownOptionActive: { backgroundColor: '#1A1A1A' },
  dropdownOptionText: { fontSize: 14, fontWeight: '700', color: '#1A1A1A' },
  dropdownOptionTextActive: { color: '#FFFFFF' },
  notFoundContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  notFoundText: { fontSize: 18, fontWeight: '800', color: '#1A1A1A', marginBottom: 12 },
  backBtn: {
    backgroundColor: '#1A1A1A',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 12,
  },
  backBtnText: { color: '#FFFFFF', fontWeight: '800' },

  // Tag modal
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
    maxHeight: '80%',
  },
  modalHeading: { fontSize: 19, fontWeight: '900', color: '#1A1A1A' },
  tagOptionsWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  tagOptionChip: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: '#1A1A1A',
    paddingLeft: 12,
    paddingRight: 8,
    paddingVertical: 8,
    gap: 6,
  },
  tagOptionChipActive: { borderWidth: 2.5 },
  tagOptionTapArea: { flexDirection: 'row', alignItems: 'center' },
  tagOptionText: { fontSize: 12, fontWeight: '800', color: '#1A1A1A' },
  tagDeleteBtn: {
    paddingLeft: 4,
    borderLeftWidth: 1,
    borderLeftColor: 'rgba(26,26,26,0.25)',
  },
  label: { fontSize: 13, fontWeight: '800', color: '#1A1A1A' },
  input: {
    backgroundColor: '#FFFFFF',
    borderWidth: 2,
    borderColor: '#1A1A1A',
    borderRadius: 14,
    padding: 12,
    fontSize: 15,
    fontWeight: '600',
  },
  row: { flexDirection: 'row', gap: 10 },
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
  },
  submitBtnText: { color: '#FFFFFF', fontWeight: '900', fontSize: 15 },
  doneBtn: { alignItems: 'center', paddingVertical: 4 },
  doneBtnText: { color: '#666', fontWeight: '700', fontSize: 13 },
});