import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, FlatList, Alert } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { useUser } from '../contexts/UserContext';
import NavigationHeader from '../components/NavigationHeader';

const riskColors = {
  Normal: '#2ecc71',
  'Low Risk': '#3498db',
  Monitor: '#f1c40f',
  'Mild Jaundice': '#e67e22',
  'Moderate Jaundice': '#e74c3c',
  'Severe Jaundice': '#8e44ad',
  'Serum Test Needed': '#e74c3c',
  'Urgent Referral': '#8e44ad',
};

export default function HistoryScreen({ navigation }) {
  const { screeningHistory, deleteScreeningResult } = useUser();
  
  console.log('=== HISTORY SCREEN ===');
  console.log('History Length:', screeningHistory.length);
  console.log('History Data:', JSON.stringify(screeningHistory, null, 2));

  const formatDate = (timestamp) =>
    new Date(timestamp).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });

  const handleDeleteResult = (id) => {
    Alert.alert('Delete Result', 'Are you sure you want to delete this screening result?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          await deleteScreeningResult(id);
        },
      },
    ]);
  };

  if (screeningHistory.length === 0) {
    return (
      <View style={styles.emptyContainer}>
        <MaterialIcons name="history" size={64} color="#a9c7e3" />
        <Text style={styles.emptyText}>No screening history yet</Text>
        <Text style={styles.emptySubtext}>Start screening to see your results here</Text>
        <TouchableOpacity style={styles.startButton} onPress={() => navigation.navigate('Camera')}>
          <Text style={styles.startButtonText}>Start Screening</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <NavigationHeader
        title="Screening History"
        showBack
        onBackPress={() => navigation.goBack()}
        showSettings
        onSettingsPress={() => navigation.navigate('Settings')}
      />

      <View style={styles.header}>
        <Text style={styles.subtitle}>{screeningHistory.length} results</Text>
      </View>

      <FlatList
        data={screeningHistory}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContainer}
        renderItem={({ item }) => (
          <View style={styles.historyItem}>
            <View style={styles.historyHeader}>
              <Text style={styles.historyDate}>{formatDate(item.timestamp)}</Text>
              <TouchableOpacity onPress={() => handleDeleteResult(item.id)} style={styles.deleteButton}>
                <MaterialIcons name="delete" size={20} color="#e74c3c" />
              </TouchableOpacity>
            </View>

            <View style={styles.rowBetween}>
              <Text style={styles.prediction}>{item.prediction_label}</Text>
              <View style={[styles.riskBadge, { backgroundColor: riskColors[item.risk] || '#a9c7e3' }]}>
                <Text style={styles.riskText}>{item.risk}</Text>
              </View>
            </View>

            <Text style={styles.detailText}>
              Jaundice Probability: {(Number(item.jaundice_probability || 0) * 100).toFixed(1)}%
            </Text>
            <Text style={styles.detailText}>
              Yellow Tint: {item.yellow_tint_percentage ? `${item.yellow_tint_percentage.toFixed(2)}%` : 'Unknown'} ({Number(item.yellow_tint_score || 0).toFixed(4)})
            </Text>
            <Text style={styles.detailText}>
              Yellow Pixels: {item.yellow_pixels || 'Unknown'} / {item.total_pixels || 'Unknown'}
            </Text>
            <Text style={styles.detailText}>
              Detection Method: {item.detection_method || 'HSV Analysis'}
            </Text>
            {item.confidence ? <Text style={styles.confidenceText}>Confidence: {item.confidence}</Text> : null}
          </View>
        )}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0b1d2c',
  },
  header: {
    padding: 16,
    paddingBottom: 8,
    alignItems: 'center',
  },
  subtitle: {
    color: '#a9c7e3',
    fontSize: 16,
  },
  listContainer: {
    paddingHorizontal: 20,
    paddingBottom: 24,
  },
  historyItem: {
    backgroundColor: '#162d44',
    borderRadius: 14,
    padding: 14,
    marginBottom: 12,
  },
  historyHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  historyDate: {
    color: '#a9c7e3',
    fontSize: 13,
    fontWeight: '500',
  },
  deleteButton: {
    padding: 4,
  },
  rowBetween: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  prediction: {
    color: '#ffffff',
    fontSize: 20,
    fontWeight: '700',
  },
  riskBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 10,
  },
  riskText: {
    color: '#0b1d2c',
    fontSize: 12,
    fontWeight: '700',
  },
  detailText: {
    color: '#dfe8f5',
    fontSize: 14,
    marginBottom: 4,
  },
  confidenceText: {
    color: '#a9c7e3',
    fontSize: 13,
    fontStyle: 'italic',
    marginTop: 4,
  },
  emptyContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
    backgroundColor: '#0b1d2c',
  },
  emptyText: {
    color: '#ffffff',
    fontSize: 20,
    fontWeight: '700',
    marginTop: 16,
    marginBottom: 8,
  },
  emptySubtext: {
    color: '#a9c7e3',
    fontSize: 16,
    textAlign: 'center',
    marginBottom: 24,
  },
  startButton: {
    backgroundColor: '#20c997',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 12,
  },
  startButtonText: {
    color: '#0b1d2c',
    fontSize: 16,
    fontWeight: '700',
  },
});

