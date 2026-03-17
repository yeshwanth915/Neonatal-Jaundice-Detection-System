import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Modal, TextInput, ScrollView } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';

export default function ServerConfig({ visible, onClose, onSave, currentUrl }) {
  const [customUrl, setCustomUrl] = useState(currentUrl || 'http://10.42.140.195:8000');
  const [testResults, setTestResults] = useState([]);
  const [isTesting, setIsTesting] = useState(false);

  const presetUrls = [
    { name: 'Computer IP (New Network)', url: 'http://10.42.140.195:8000' },
    { name: 'Computer IP (Previous)', url: 'http://10.32.61.195:8000' },
    { name: 'Android Emulator (Default)', url: 'http://10.0.2.2:8000' },
    { name: 'Android Emulator (Alternative)', url: 'http://10.0.3.2:8000' },
    { name: 'Localhost', url: 'http://localhost:8000' },
    { name: '127.0.0.1', url: 'http://127.0.0.1:8000' },
    { name: 'Custom IP', url: 'http://192.168.1.100:8000' },
  ];

  const testConnection = async (url) => {
    setIsTesting(true);
    setTestResults([]);
    
    try {
      const response = await fetch(`${url}/health`, {
        method: 'GET',
        timeout: 5000,
      });
      
      if (response.ok) {
        const data = await response.json();
        setTestResults([{
          status: 'success',
          message: `Connected! Model: ${data.model_type || 'Unknown'}`,
          url: url
        }]);
        setCustomUrl(url);
      } else {
        setTestResults([{
          status: 'error',
          message: `HTTP ${response.status}`,
          url: url
        }]);
      }
    } catch (error) {
      setTestResults([{
        status: 'error',
        message: error.message,
        url: url
      }]);
    } finally {
      setIsTesting(false);
    }
  };

  const handleSave = () => {
    onSave(customUrl);
    onClose();
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
    >
      <View style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={onClose}>
            <MaterialIcons name="close" size={24} color="#ffffff" />
          </TouchableOpacity>
          <Text style={styles.title}>Server Configuration</Text>
          <View style={{ width: 24 }} />
        </View>

        <ScrollView style={styles.content}>
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Quick Presets</Text>
            {presetUrls.map((preset, index) => (
              <TouchableOpacity
                key={index}
                style={[
                  styles.presetButton,
                  customUrl === preset.url && styles.selectedPreset
                ]}
                onPress={() => setCustomUrl(preset.url)}
              >
                <Text style={styles.presetName}>{preset.name}</Text>
                <Text style={styles.presetUrl}>{preset.url}</Text>
              </TouchableOpacity>
            ))}
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Custom URL</Text>
            <TextInput
              style={styles.input}
              value={customUrl}
              onChangeText={setCustomUrl}
              placeholder="http://10.42.140.195:8000"
              placeholderTextColor="#666"
              autoCapitalize="none"
              autoCorrect={false}
            />
          </View>

          <View style={styles.section}>
            <TouchableOpacity
              style={[styles.testButton, isTesting && styles.testingButton]}
              onPress={() => testConnection(customUrl)}
              disabled={isTesting}
            >
              <MaterialIcons 
                name={isTesting ? "hourglass-empty" : "network-check"} 
                size={20} 
                color="#ffffff" 
              />
              <Text style={styles.testButtonText}>
                {isTesting ? 'Testing...' : 'Test Connection'}
              </Text>
            </TouchableOpacity>

            {testResults.map((result, index) => (
              <View key={index} style={[
                styles.resultBox,
                { backgroundColor: result.status === 'success' ? '#2ecc71' : '#e74c3c' }
              ]}>
                <MaterialIcons 
                  name={result.status === 'success' ? 'check-circle' : 'error'} 
                  size={16} 
                  color="#ffffff" 
                />
                <Text style={styles.resultText}>{result.message}</Text>
              </View>
            ))}
          </View>

          <View style={styles.section}>
            <Text style={styles.helpTitle}>Network Connection Help:</Text>
            <Text style={styles.helpText}>• New Network: 10.42.140.195 (current)</Text>
            <Text style={styles.helpText}>• Previous Network: 10.32.61.195 (backup)</Text>
            <Text style={styles.helpText}>• Make sure server runs with --host 0.0.0.0</Text>
            <Text style={styles.helpText}>• Check Windows firewall settings</Text>
            <Text style={styles.helpText}>• Ensure both devices are on same network</Text>
          </View>
        </ScrollView>

        <View style={styles.footer}>
          <TouchableOpacity style={styles.saveButton} onPress={handleSave}>
            <MaterialIcons name="save" size={20} color="#ffffff" />
            <Text style={styles.saveButtonText}>Save Configuration</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0b1d2c',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#162d44',
  },
  title: {
    color: '#ffffff',
    fontSize: 18,
    fontWeight: '600',
  },
  content: {
    flex: 1,
    padding: 20,
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 12,
  },
  presetButton: {
    backgroundColor: '#162d44',
    padding: 12,
    borderRadius: 8,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: 'transparent',
  },
  selectedPreset: {
    borderColor: '#3498db',
    backgroundColor: '#1e3a52',
  },
  presetName: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '600',
  },
  presetUrl: {
    color: '#a9c7e3',
    fontSize: 12,
    marginTop: 2,
  },
  input: {
    backgroundColor: '#162d44',
    color: '#ffffff',
    padding: 12,
    borderRadius: 8,
    fontSize: 14,
    borderWidth: 1,
    borderColor: '#34495e',
  },
  testButton: {
    backgroundColor: '#3498db',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 12,
    borderRadius: 8,
    marginBottom: 12,
  },
  testingButton: {
    backgroundColor: '#7f8c8d',
  },
  testButtonText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '600',
    marginLeft: 8,
  },
  resultBox: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 8,
    marginBottom: 8,
  },
  resultText: {
    color: '#ffffff',
    fontSize: 13,
    marginLeft: 8,
    flex: 1,
  },
  helpTitle: {
    color: '#f39c12',
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 8,
  },
  helpText: {
    color: '#dfe8f5',
    fontSize: 12,
    marginBottom: 4,
    marginLeft: 8,
  },
  footer: {
    padding: 20,
    borderTopWidth: 1,
    borderTopColor: '#162d44',
  },
  saveButton: {
    backgroundColor: '#20c997',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
    borderRadius: 8,
  },
  saveButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 8,
  },
});
