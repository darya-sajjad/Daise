import { View, Text, StyleSheet, TouchableOpacity, Alert } from 'react-native';
import { useState } from 'react';
import { clearAllData } from '../../services/mediaService';

export default function SettingsScreen() {
  const [clearing, setClearing] = useState(false);

  const handleClearData = () => {
    Alert.alert(
      'Clear All Data?',
      'This deletes every item, list, and tag from the database. This cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Clear Everything',
          style: 'destructive',
          onPress: async () => {
            try {
              setClearing(true);
              await clearAllData();
              Alert.alert('Done', 'All data has been cleared.');
            } catch (error) {
              console.error('Failed to clear data:', error);
              Alert.alert('Error', 'Something went wrong while clearing data.');
            } finally {
              setClearing(false);
            }
          },
        },
      ]
    );
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>⚙️ Settings</Text>
      <Text style={styles.subtitle}>App options & preferences.</Text>

      {/* DEV ONLY — remove before shipping */}
      <TouchableOpacity
        style={styles.clearBtn}
        onPress={handleClearData}
        disabled={clearing}
      >
        <Text style={styles.clearBtnText}>
          {clearing ? 'Clearing...' : '🗑️ Clear All Data (Dev)'}
        </Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#FFF' },
  title: { fontSize: 22, fontWeight: 'bold', marginBottom: 8 },
  subtitle: { fontSize: 14, color: '#666', marginBottom: 32 },
  clearBtn: {
    backgroundColor: '#FFB6B6',
    borderWidth: 2,
    borderColor: '#1A1A1A',
    borderRadius: 16,
    paddingHorizontal: 20,
    paddingVertical: 12,
  },
  clearBtnText: { fontWeight: '700', fontSize: 14, color: '#1A1A1A' },
});