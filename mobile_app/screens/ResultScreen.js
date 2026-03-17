import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ScrollView } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { useUser } from '../contexts/UserContext';
import ShareButton from '../components/ShareButton';

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

const confidenceColors = {
  High: '#2ecc71',
  Medium: '#f1c40f',
  Low: '#e74c3c',
};

const yellowColors = {
  Normal: '#2ecc71',
  'Low Risk': '#3498db',
  Monitor: '#f1c40f',
  'Mild Jaundice': '#e67e22',
  'Moderate Jaundice': '#e74c3c',
  'Severe Jaundice': '#8e44ad',
  'Serum Test Needed': '#e74c3c',
  'Urgent Referral': '#8e44ad',
};

export default function ResultScreen({ navigation, route }) {
  const { result } = route.params || {};
  const { addScreeningResult } = useUser();
  const [hasSaved, setHasSaved] = React.useState(false);

  React.useEffect(() => {
    if (result && !hasSaved) {
      console.log('=== RESULT SCREEN MOUNTED ===');
      console.log('Result received:', JSON.stringify(result, null, 2));
      console.log('Calling addScreeningResult...');
      
      // Check if this result already exists in history to prevent duplicates
      addScreeningResult(result).then(saved => {
        console.log('addScreeningResult returned:', saved);
        setHasSaved(true);
      });
    } else if (!result) {
      console.log('=== NO RESULT RECEIVED ===');
    }
  }, [result?.id, hasSaved]); // Only depend on result.id and hasSaved state

  if (!result) {
    return (
      <View style={styles.centered}>
        <Text style={styles.missingText}>No results to display.</Text>
        <TouchableOpacity style={styles.retakeButton} onPress={() => navigation.replace('Camera')}>
          <Text style={styles.retakeText}>Retake</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const jaundicePct = (Number(result.jaundice_probability || 0) * 100).toFixed(1);
  const normalPct = (Number(result.normal_probability || 0) * 100).toFixed(1);
  const yellowScore = Number(result.yellow_tint_score || 0).toFixed(4);
  const yellowPercentage = Number(result.yellow_tint_percentage || 0).toFixed(2);
  const qualityScore = result.quality_score;
  const qualityPct = qualityScore !== undefined && qualityScore !== null
    ? (Number(qualityScore) * 100).toFixed(0)
    : null;

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.title}>Prediction Result</Text>
      <Text style={styles.timestamp}>{new Date().toLocaleString()}</Text>

      <View style={styles.card}>
        <Text style={styles.cardLabel}>Prediction</Text>
        <Text style={styles.predictionValue}>{result.prediction_label}</Text>
      </View>

      <View style={styles.card}>
        <Text style={styles.cardTitle}>Probability</Text>
        <ResultRow label="Jaundice" value={`${jaundicePct}%`} />
        <ResultRow label="Normal" value={`${normalPct}%`} />
      </View>

      
      <View style={styles.card}>
        <Text style={styles.cardTitle}>Yellow Tint Analysis</Text>
        <ResultRow label="Yellow Percentage" value={`${yellowPercentage}%`} />
        <ResultRow label="Yellow Score" value={yellowScore} />
        <ResultRow label="Yellow Pixels" value={`${result.yellow_pixels || 'Unknown'}`} />
        <ResultRow label="Total Pixels" value={`${result.total_pixels || 'Unknown'}`} />
        <ResultRow label="Detection Method" value={result.detection_method || 'HSV Analysis'} />
        <View style={styles.progressTrack}>
          <View
            style={[
              styles.progressFill,
              {
                width: `${Math.min(100, Math.max(0, Number(result.yellow_tint_percentage || 0)))}%`,
                backgroundColor: yellowColors[result.risk] || '#f1c40f',
              },
            ]}
          />
        </View>
        {result.note ? <Text style={styles.description}>{result.note}</Text> : null}
      </View>

      {qualityPct !== null && (
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Image Quality</Text>
          <ResultRow label="Quality Score" value={`${qualityPct}%`} />
          <View style={styles.progressTrack}>
            <View
              style={[
                styles.progressFill,
                {
                  width: `${Math.min(100, Math.max(0, Number(qualityScore || 0) * 100))}%`,
                  backgroundColor: '#20c997',
                },
              ]}
            />
          </View>
        </View>
      )}

      <View style={styles.card}>
        <Text style={styles.cardTitle}>Confidence</Text>
        <View style={styles.row}>
          <MaterialIcons
            name="verified"
            size={18}
            color={confidenceColors[result.confidence] || '#ffffff'}
            style={{ marginRight: 8 }}
          />
          <Text style={[styles.value, { color: confidenceColors[result.confidence] || '#ffffff' }]}>
            {result.confidence || 'Unknown'}
          </Text>
        </View>
        {result.note ? <Text style={styles.note}>{result.note}</Text> : null}
      </View>

      <View style={styles.buttonContainer}>
        <ShareButton result={result} style={styles.shareButton} />
        <TouchableOpacity
          style={styles.retakeButtonWide}
          onPress={() => navigation.replace('Camera', { sessionKey: Date.now() })}
        >
          <MaterialIcons name="camera-alt" size={20} color="#0b1d2c" style={{ marginRight: 8 }} />
          <Text style={styles.retakeWideText}>Retake</Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
}

function ResultRow({ label, value }) {
  return (
    <View style={styles.rowBetween}>
      <Text style={styles.label}>{label}</Text>
      <Text style={styles.value}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexGrow: 1,
    backgroundColor: '#0b1d2c',
    padding: 20,
  },
  centered: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#0b1d2c',
    padding: 20,
  },
  missingText: {
    color: '#ffffff',
    fontSize: 17,
    marginBottom: 14,
  },
  title: {
    color: '#ffffff',
    fontSize: 26,
    fontWeight: '700',
    textAlign: 'center',
  },
  timestamp: {
    color: '#a9c7e3',
    textAlign: 'center',
    marginTop: 6,
    marginBottom: 16,
  },
  card: {
    backgroundColor: '#162d44',
    borderRadius: 14,
    padding: 16,
    marginBottom: 14,
  },
  cardTitle: {
    color: '#ffffff',
    fontSize: 17,
    fontWeight: '700',
    marginBottom: 10,
  },
  cardLabel: {
    color: '#a9c7e3',
    fontSize: 14,
  },
  predictionValue: {
    color: '#ffffff',
    fontSize: 30,
    fontWeight: '800',
    marginTop: 4,
  },
  rowBetween: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  label: {
    color: '#a9c7e3',
    fontSize: 15,
  },
  value: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '700',
  },
  progressTrack: {
    height: 8,
    borderRadius: 5,
    backgroundColor: '#1f3f5f',
    overflow: 'hidden',
    marginTop: 6,
  },
  progressFill: {
    height: '100%',
  },
  description: {
    color: '#dfe8f5',
    fontSize: 13,
    marginTop: 8,
  },
  note: {
    color: '#f1c40f',
    marginTop: 8,
    fontSize: 13,
    lineHeight: 18,
  },
  buttonContainer: {
    marginTop: 8,
    gap: 10,
    marginBottom: 16,
  },
  shareButton: {
    width: '100%',
  },
  retakeButton: {
    backgroundColor: '#20c997',
    paddingHorizontal: 18,
    paddingVertical: 12,
    borderRadius: 10,
  },
  retakeText: {
    color: '#0b1d2c',
    fontWeight: '700',
  },
  retakeButtonWide: {
    backgroundColor: '#20c997',
    paddingVertical: 14,
    borderRadius: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  retakeWideText: {
    color: '#0b1d2c',
    fontWeight: '700',
    fontSize: 16,
  },
});
