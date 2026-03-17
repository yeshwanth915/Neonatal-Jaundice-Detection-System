import React from 'react';
import { TouchableOpacity, Text, StyleSheet, Share, Alert } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';

export default function ShareButton({ result, style }) {
  const handleShare = async () => {
    try {
      const shareContent = {
        title: 'Neonatal Jaundice Screening Results',
        message: `Jaundice Screening Results:
        
Prediction: ${result.prediction_label}
Jaundice Probability: ${(Number(result.jaundice_probability || 0) * 100).toFixed(1)}%
Normal Probability: ${(Number(result.normal_probability || 0) * 100).toFixed(1)}%
Risk Level: ${result.risk}
Confidence: ${result.confidence || 'High'}
Yellow Tint: ${result.yellow_indication || 'Unknown'} (${Number(result.yellow_tint_score || 0).toFixed(4)})
Yellow Tint Percentage: ${result.yellow_tint_percentage ? `${result.yellow_tint_percentage.toFixed(2)}%` : 'Unknown'}

Screened on: ${new Date().toLocaleDateString()}

This screening was performed using the Neonatal Jaundice Monitor mobile app. 
Please consult with healthcare professionals for medical decisions.`,
        url: 'https://github.com/neonatal-jaundice-monitor'
      };

      await Share.share(shareContent);
    } catch (error) {
      Alert.alert('Share Error', 'Unable to share results. Please try again.');
    }
  };

  return (
    <TouchableOpacity 
      style={[styles.shareButton, style]} 
      onPress={handleShare}
      accessibilityRole="button"
      accessibilityLabel="Share screening results"
    >
      <MaterialIcons name="share" size={20} color="#0b1d2c" style={styles.buttonIcon} />
      <Text style={styles.buttonText}>Share Results</Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  shareButton: {
    backgroundColor: '#3498db',
    paddingHorizontal: 24,
    paddingVertical: 14,
    borderRadius: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    flex: 1,
  },
  buttonIcon: {
    marginRight: 8,
  },
  buttonText: {
    color: '#0b1d2c',
    fontSize: 16,
    fontWeight: '600',
    textAlign: 'center',
  },
});
