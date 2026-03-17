import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ScrollView, Modal } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { useUser } from '../contexts/UserContext';
import ConnectionTest from '../components/ConnectionTest';
import ServerConfig from '../components/ServerConfig';

export default function HomeScreen({ navigation }) {
  const { screeningHistory, getLastScreeningDate } = useUser();
  const [showConnectionTest, setShowConnectionTest] = useState(false);
  const [showServerConfig, setShowServerConfig] = useState(false);
  
  const lastScreeningDate = getLastScreeningDate();
  const hasHistory = screeningHistory.length > 0;
  
  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.contentContainer}>
      <View style={styles.header}>
        <Text style={styles.title}>Neonatal Jaundice Monitor</Text>
        <Text style={styles.subtitle}>
          Capture or upload a baby skin image for jaundice classification using real yellow tint analysis.
        </Text>
      </View>
      
      {hasHistory && (
        <View style={styles.summaryCard}>
          <View style={styles.summaryHeader}>
            <MaterialIcons name="history" size={24} color="#20c997" />
            <Text style={styles.summaryTitle}>Recent Activity</Text>
          </View>
          <Text style={styles.summaryText}>
            {screeningHistory.length} screening{screeningHistory.length !== 1 ? 's' : ''} completed
          </Text>
          {lastScreeningDate && (
            <Text style={styles.summarySubtext}>
              Last: {lastScreeningDate.toLocaleDateString()}
            </Text>
          )}
        </View>
      )}
      
      <View style={styles.buttonContainer}>
        <TouchableOpacity
          style={styles.primaryButton}
          onPress={() => navigation.navigate('Camera')}
          accessibilityRole="button"
        >
          <MaterialIcons name="camera-alt" size={24} color="#0b1d2c" style={styles.buttonIcon} />
          <Text style={styles.buttonText}>Use Camera</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.uploadPrimaryButton}
          onPress={() => navigation.navigate('Camera', { openUpload: true })}
          accessibilityRole="button"
        >
          <MaterialIcons name="upload" size={24} color="#0b1d2c" style={styles.buttonIcon} />
          <Text style={styles.buttonText}>Upload Image</Text>
        </TouchableOpacity>
        
        <TouchableOpacity
          style={styles.secondaryButton}
          onPress={() => navigation.navigate('Dashboard')}
          accessibilityRole="button"
        >
          <MaterialIcons name="dashboard" size={24} color="#ffffff" style={styles.buttonIcon} />
          <Text style={styles.secondaryButtonText}>View Dashboard</Text>
        </TouchableOpacity>
        
        <TouchableOpacity
          style={styles.tertiaryButton}
          onPress={() => navigation.navigate('History')}
          accessibilityRole="button"
        >
          <MaterialIcons name="history" size={24} color="#ffffff" style={styles.buttonIcon} />
          <Text style={styles.secondaryButtonText}>View History</Text>
        </TouchableOpacity>
        
        <TouchableOpacity
          style={styles.debugButton}
          onPress={() => setShowConnectionTest(true)}
          accessibilityRole="button"
        >
          <MaterialIcons name="wifi" size={24} color="#ffffff" style={styles.buttonIcon} />
          <Text style={styles.secondaryButtonText}>Test Connection</Text>
        </TouchableOpacity>
        
        <TouchableOpacity
          style={styles.configButton}
          onPress={() => setShowServerConfig(true)}
          accessibilityRole="button"
        >
          <MaterialIcons name="settings" size={24} color="#ffffff" style={styles.buttonIcon} />
          <Text style={styles.secondaryButtonText}>Server Settings</Text>
        </TouchableOpacity>
      </View>
      
      <Modal
        visible={showConnectionTest}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setShowConnectionTest(false)}
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <TouchableOpacity onPress={() => setShowConnectionTest(false)}>
              <MaterialIcons name="close" size={24} color="#ffffff" />
            </TouchableOpacity>
            <Text style={styles.modalTitle}>Connection Test</Text>
            <View style={{ width: 24 }} />
          </View>
          <ScrollView style={styles.modalContent}>
            <ConnectionTest 
              onTestComplete={(success, endpoint) => {
                if (success) {
                  setShowConnectionTest(false);
                }
              }} 
            />
          </ScrollView>
        </View>
      </Modal>
      
      <ServerConfig
        visible={showServerConfig}
        onClose={() => setShowServerConfig(false)}
        onSave={(url) => {
          console.log('Server URL saved:', url);
          // Here you could save the URL to AsyncStorage or context
        }}
        currentUrl={'http://10.42.140.195:8000'}
      />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0b1d2c',
  },
  contentContainer: {
    flexGrow: 1,
    paddingHorizontal: 24,
    paddingBottom: 28,
  },
  header: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: 42,
    marginBottom: 20,
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    color: '#ffffff',
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 16,
    color: '#dfe8f5',
    textAlign: 'center',
    marginTop: 12,
    lineHeight: 22,
  },
  summaryCard: {
    backgroundColor: '#162d44',
    borderRadius: 16,
    padding: 20,
    marginBottom: 24,
  },
  summaryHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  summaryTitle: {
    color: '#ffffff',
    fontSize: 18,
    fontWeight: '600',
    marginLeft: 8,
  },
  summaryText: {
    color: '#dfe8f5',
    fontSize: 16,
    marginBottom: 4,
  },
  summarySubtext: {
    color: '#a9c7e3',
    fontSize: 14,
  },
  buttonContainer: {
    marginTop: 'auto',
    paddingBottom: 10,
    gap: 12,
  },
  primaryButton: {
    backgroundColor: '#20c997',
    paddingHorizontal: 32,
    paddingVertical: 16,
    borderRadius: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  secondaryButton: {
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    paddingHorizontal: 32,
    paddingVertical: 16,
    borderRadius: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
  },
  uploadPrimaryButton: {
    backgroundColor: '#5dade2',
    paddingHorizontal: 32,
    paddingVertical: 16,
    borderRadius: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  tertiaryButton: {
    backgroundColor: 'rgba(52, 152, 219, 0.2)',
    paddingHorizontal: 32,
    paddingVertical: 16,
    borderRadius: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(52, 152, 219, 0.4)',
  },
  debugButton: {
    backgroundColor: 'rgba(241, 196, 15, 0.2)',
    paddingHorizontal: 32,
    paddingVertical: 16,
    borderRadius: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(241, 196, 15, 0.4)',
  },
  configButton: {
    backgroundColor: 'rgba(52, 152, 219, 0.2)',
    paddingHorizontal: 32,
    paddingVertical: 16,
    borderRadius: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(52, 152, 219, 0.4)',
  },
  modalContainer: {
    flex: 1,
    backgroundColor: '#0b1d2c',
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#162d44',
  },
  modalTitle: {
    color: '#ffffff',
    fontSize: 18,
    fontWeight: '600',
  },
  modalContent: {
    flex: 1,
  },
  buttonIcon: {
    marginRight: 8,
  },
  buttonText: {
    color: '#0b1d2c',
    fontSize: 18,
    fontWeight: '600',
  },
  secondaryButtonText: {
    color: '#ffffff',
    fontSize: 18,
    fontWeight: '600',
  },
});
