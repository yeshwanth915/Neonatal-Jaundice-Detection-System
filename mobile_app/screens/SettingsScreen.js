import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ScrollView, Switch, Alert } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { useUser } from '../contexts/UserContext';

export default function SettingsScreen({ navigation }) {
  const { settings, updateSettings, clearAllHistory, exportHistory } = useUser();
  const [localSettings, setLocalSettings] = useState(settings);

  useEffect(() => {
    setLocalSettings(settings);
  }, [settings]);

  const handleSettingChange = (key, value) => {
    setLocalSettings((prev) => ({ ...prev, [key]: value }));
    updateSettings({ [key]: value });
  };

  const handleClearHistory = () => {
    Alert.alert(
      'Clear All History',
      'Are you sure you want to delete all screening history? This action cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Clear All',
          style: 'destructive',
          onPress: async () => {
            await clearAllHistory();
            Alert.alert('Success', 'All screening history has been cleared.');
          },
        },
      ]
    );
  };

  const handleExportData = async () => {
    try {
      const history = await exportHistory();
      if (history.length === 0) {
        Alert.alert('No Data', 'No screening history to export.');
        return;
      }

      Alert.alert('Export Ready', `Exported ${history.length} screening records.`);
    } catch (error) {
      Alert.alert('Export Error', 'Failed to export data.');
    }
  };

  const SettingItem = ({ icon, title, subtitle, value, onToggle, onPress }) => (
    <TouchableOpacity style={styles.settingItem} onPress={onPress}>
      <View style={styles.settingLeft}>
        <MaterialIcons name={icon} size={24} color="#20c997" style={styles.settingIcon} />
        <View style={styles.settingContent}>
          <Text style={styles.settingTitle}>{title}</Text>
          {subtitle && <Text style={styles.settingSubtitle}>{subtitle}</Text>}
        </View>
      </View>
      {onToggle ? (
        <Switch
          value={value}
          onValueChange={onToggle}
          trackColor={{ false: '#1f3f5f', true: '#20c997' }}
          thumbColor={value ? '#0b1d2c' : '#a9c7e3'}
        />
      ) : (
        <MaterialIcons name="chevron-right" size={24} color="#a9c7e3" />
      )}
    </TouchableOpacity>
  );

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Settings</Text>
        <Text style={styles.subtitle}>Customize your app experience</Text>
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Notifications</Text>

          <SettingItem
            icon="notifications"
            title="Push Notifications"
            subtitle="Receive alerts and reminders"
            value={localSettings.notifications}
            onToggle={(value) => handleSettingChange('notifications', value)}
          />

          <SettingItem
            icon="schedule"
            title="Screening Reminders"
            subtitle="Daily reminders for screenings"
            value={localSettings.reminders}
            onToggle={(value) => handleSettingChange('reminders', value)}
          />
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Appearance</Text>

          <SettingItem
            icon="dark-mode"
            title="Dark Mode"
            subtitle="Use dark theme"
            value={localSettings.darkMode}
            onToggle={(value) => handleSettingChange('darkMode', value)}
          />

          <SettingItem
            icon="straighten"
            title="Units"
            subtitle={`Currently: ${localSettings.units}`}
            onPress={() => {
              Alert.alert('Units', 'Unit selection coming soon');
            }}
          />
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Data Management</Text>

          <SettingItem
            icon="download"
            title="Export Data"
            subtitle="Download your screening history"
            onPress={handleExportData}
          />

          <SettingItem
            icon="delete"
            title="Clear All History"
            subtitle="Delete all screening records"
            onPress={handleClearHistory}
          />

          <SettingItem
            icon="backup"
            title="Backup & Restore"
            subtitle="Manage data backups"
            onPress={() => {
              Alert.alert('Backup', 'Backup feature coming soon');
            }}
          />
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>About</Text>

          <SettingItem
            icon="info"
            title="App Version"
            subtitle="v1.0.0"
          />

          <SettingItem
            icon="medical-services"
            title="Medical Disclaimer"
            subtitle="Important safety information"
            onPress={() => {
              Alert.alert(
                'Medical Disclaimer',
                'This app provides estimates only and should not replace professional medical advice. Always consult healthcare providers for medical decisions.'
              );
            }}
          />

          <SettingItem
            icon="help"
            title="Help & Support"
            subtitle="Get help with the app"
            onPress={() => {
              Alert.alert('Support', 'Contact support@jaundice-monitor.app for assistance');
            }}
          />
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0b1d2c',
  },
  header: {
    padding: 24,
    paddingBottom: 16,
    alignItems: 'center',
  },
  title: {
    color: '#ffffff',
    fontSize: 28,
    fontWeight: '700',
    marginBottom: 4,
  },
  subtitle: {
    color: '#a9c7e3',
    fontSize: 16,
  },
  content: {
    flex: 1,
    paddingHorizontal: 24,
  },
  section: {
    marginBottom: 32,
  },
  sectionTitle: {
    color: '#ffffff',
    fontSize: 20,
    fontWeight: '600',
    marginBottom: 16,
  },
  settingItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#162d44',
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
  },
  settingLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  settingIcon: {
    marginRight: 12,
  },
  settingContent: {
    flex: 1,
  },
  settingTitle: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 2,
  },
  settingSubtitle: {
    color: '#a9c7e3',
    fontSize: 14,
  },
});
