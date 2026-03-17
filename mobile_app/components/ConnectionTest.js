import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ScrollView, ActivityIndicator, Platform } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { checkServerHealth, APIError } from '../services/api';

export default function ConnectionTest({ onTestComplete }) {
  const [isTesting, setIsTesting] = useState(false);
  const [testResults, setTestResults] = useState([]);
  const [overallStatus, setOverallStatus] = useState('pending');

  const addResult = (endpoint, status, message, details = null) => {
    setTestResults(prev => [...prev, { endpoint, status, message, details }]);
  };

  const testConnection = async () => {
    setIsTesting(true);
    setTestResults([]);
    setOverallStatus('testing');

    const isAndroid = Platform.OS === 'android';
    const isIOS = Platform.OS === 'ios';
    
    const androidEndpoints = [
      { name: 'Computer IP (New Network)', url: 'http://10.42.140.195:8000' },
      { name: 'Computer IP (Previous)', url: 'http://10.32.61.195:8000' },
      { name: 'Android Emulator (10.0.2.2)', url: 'http://10.0.2.2:8000' },
      { name: 'Android Emulator (10.0.3.2)', url: 'http://10.0.3.2:8000' },
      { name: 'Localhost', url: 'http://localhost:8000' },
      { name: '127.0.0.1', url: 'http://127.0.0.1:8000' },
      { name: 'Original IP', url: 'http://10.170.189.195:8000' },
      { name: 'Home Network 1', url: 'http://192.168.1.100:8000' },
      { name: 'Home Network 2', url: 'http://192.168.0.100:8000' },
    ];
    
    const iOSEndpoints = [
      { name: 'Computer IP (New Network)', url: 'http://10.42.140.195:8000' },
      { name: 'Computer IP (Previous)', url: 'http://10.32.61.195:8000' },
      { name: 'Localhost', url: 'http://localhost:8000' },
      { name: '127.0.0.1', url: 'http://127.0.0.1:8000' },
      { name: 'Original IP', url: 'http://10.170.189.195:8000' },
      { name: 'Home Network 1', url: 'http://192.168.1.100:8000' },
      { name: 'Home Network 2', url: 'http://192.168.0.100:8000' },
    ];

    const endpoints = isAndroid ? androidEndpoints : iOSEndpoints;

    let workingEndpoint = null;

    for (const endpoint of endpoints) {
      try {
        console.log(`Testing connection to: ${endpoint.url}`);
        const response = await fetch(`${endpoint.url}/health`, {
          method: 'GET',
          timeout: 5000,
        });
        
        if (response.ok) {
          const data = await response.json();
          addResult(endpoint.name, 'success', 'Connected', `Model: ${data.model_type || 'Unknown'}`);
          workingEndpoint = endpoint.url;
          break;
        } else {
          addResult(endpoint.name, 'error', `HTTP ${response.status}`, response.statusText);
        }
      } catch (error) {
        addResult(endpoint.name, 'error', 'Connection failed', error.message);
      }
    }

    if (workingEndpoint) {
      setOverallStatus('success');
      onTestComplete?.(true, workingEndpoint);
    } else {
      setOverallStatus('failed');
      onTestComplete?.(false, null);
    }

    setIsTesting(false);
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <MaterialIcons name="wifi" size={24} color="#3498db" />
        <Text style={styles.title}>Connection Test</Text>
      </View>

      <TouchableOpacity 
        style={[styles.testButton, isTesting && styles.testingButton]} 
        onPress={testConnection}
        disabled={isTesting}
      >
        {isTesting ? (
          <ActivityIndicator size="small" color="#ffffff" />
        ) : (
          <MaterialIcons name="network-check" size={20} color="#ffffff" />
        )}
        <Text style={styles.testButtonText}>
          {isTesting ? 'Testing...' : 'Test Connection'}
        </Text>
      </TouchableOpacity>

      {overallStatus !== 'pending' && (
        <View style={[styles.statusCard, {
          backgroundColor: overallStatus === 'success' ? '#2ecc71' : 
                           overallStatus === 'failed' ? '#e74c3c' : '#f39c12'
        }]}>
          <MaterialIcons 
            name={overallStatus === 'success' ? 'check-circle' : 
                  overallStatus === 'failed' ? 'error' : 'warning'} 
            size={20} 
            color="#ffffff" 
          />
          <Text style={styles.statusText}>
            {overallStatus === 'success' ? 'Server connection successful!' :
             overallStatus === 'failed' ? 'No working server found' :
             'Testing connection...'}
          </Text>
        </View>
      )}

      {testResults.length > 0 && (
        <ScrollView style={styles.resultsContainer}>
          <Text style={styles.resultsTitle}>Test Results:</Text>
          {testResults.map((result, index) => (
            <View key={index} style={[
              styles.resultItem,
              { borderLeftColor: result.status === 'success' ? '#2ecc71' : '#e74c3c' }
            ]}>
              <View style={styles.resultHeader}>
                <Text style={styles.resultEndpoint}>{result.endpoint}</Text>
                <MaterialIcons 
                  name={result.status === 'success' ? 'check-circle' : 'cancel'} 
                  size={16} 
                  color={result.status === 'success' ? '#2ecc71' : '#e74c3c'} 
                />
              </View>
              <Text style={styles.resultMessage}>{result.message}</Text>
              {result.details && (
                <Text style={styles.resultDetails}>{result.details}</Text>
              )}
            </View>
          ))}
        </ScrollView>
      )}

      {overallStatus === 'failed' && (
        <View style={styles.helpCard}>
          <MaterialIcons name="help" size={20} color="#f39c12" />
          <Text style={styles.helpTitle}>Troubleshooting:</Text>
          <Text style={styles.helpText}>1. Make sure the backend server is running</Text>
          <Text style={styles.helpText}>2. Run: python start_server.py in the jaundice_ml folder</Text>
          <Text style={styles.helpText}>3. Check if firewall is blocking port 8000</Text>
          <Text style={styles.helpText}>4. Try different network connections</Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#162d44',
    borderRadius: 16,
    padding: 20,
    margin: 16,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  title: {
    color: '#ffffff',
    fontSize: 18,
    fontWeight: '600',
    marginLeft: 8,
  },
  testButton: {
    backgroundColor: '#3498db',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 12,
    borderRadius: 8,
    marginBottom: 16,
  },
  testingButton: {
    backgroundColor: '#7f8c8d',
  },
  testButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 8,
  },
  statusCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 8,
    marginBottom: 16,
  },
  statusText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '600',
    marginLeft: 8,
    flex: 1,
  },
  resultsContainer: {
    maxHeight: 200,
    marginBottom: 16,
  },
  resultsTitle: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 8,
  },
  resultItem: {
    backgroundColor: '#0b1d2c',
    padding: 12,
    borderRadius: 8,
    marginBottom: 8,
    borderLeftWidth: 3,
  },
  resultHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  resultEndpoint: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '600',
  },
  resultMessage: {
    color: '#dfe8f5',
    fontSize: 13,
    marginBottom: 2,
  },
  resultDetails: {
    color: '#a9c7e3',
    fontSize: 12,
    fontStyle: 'italic',
  },
  helpCard: {
    backgroundColor: '#0b1d2c',
    padding: 12,
    borderRadius: 8,
    flexDirection: 'column',
  },
  helpTitle: {
    color: '#f39c12',
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 8,
    marginLeft: 8,
  },
  helpText: {
    color: '#dfe8f5',
    fontSize: 12,
    marginBottom: 4,
    marginLeft: 28,
  },
});
