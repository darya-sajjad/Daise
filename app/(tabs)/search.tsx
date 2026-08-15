import { View, Text, Pressable, StyleSheet } from 'react-native';
import { router } from 'expo-router';

export default function AddMediaModal() {
  return (
    <View style={styles.container}>
      <Text style={styles.heading}>Add New Media 🍿</Text>
      <Text style={styles.subtext}>
        Search TMDb or Google Books to add items to your watchlist.
      </Text>

      <Pressable onPress={() => router.back()} style={styles.closeBtn}>
        <Text style={styles.closeBtnText}>Close</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    padding: 24,
    justifyContent: 'center',
    alignItems: 'center',
  },
  heading: { fontSize: 20, fontWeight: '700', marginBottom: 16 },
  subtext: { color: '#6B7280', textAlign: 'center', marginBottom: 24 },
  closeBtn: {
    backgroundColor: '#E9D5FF',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 999,
  },
  closeBtnText: { fontWeight: '600', color: '#581C87' },
});