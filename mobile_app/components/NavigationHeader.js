import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';

export default function NavigationHeader({ 
  title, 
  showBack = false, 
  onBackPress, 
  showSettings = false, 
  onSettingsPress,
  showMenu = false,
  onMenuPress 
}) {
  return (
    <View style={styles.header}>
      <View style={styles.headerLeft}>
        {showBack && (
          <TouchableOpacity 
            style={styles.iconButton} 
            onPress={onBackPress}
            accessibilityRole="button"
            accessibilityLabel="Go back"
          >
            <MaterialIcons name="arrow-back" size={24} color="#ffffff" />
          </TouchableOpacity>
        )}
      </View>
      
      <Text style={styles.headerTitle}>{title}</Text>
      
      <View style={styles.headerRight}>
        {showSettings && (
          <TouchableOpacity 
            style={styles.iconButton} 
            onPress={onSettingsPress}
            accessibilityRole="button"
            accessibilityLabel="Settings"
          >
            <MaterialIcons name="settings" size={24} color="#ffffff" />
          </TouchableOpacity>
        )}
        
        {showMenu && (
          <TouchableOpacity 
            style={styles.iconButton} 
            onPress={onMenuPress}
            accessibilityRole="button"
            accessibilityLabel="Menu"
          >
            <MaterialIcons name="menu" size={24} color="#ffffff" />
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#162d44',
    borderBottomWidth: 1,
    borderBottomColor: '#1f3f5f',
  },
  headerLeft: {
    width: 40,
    alignItems: 'flex-start',
  },
  headerTitle: {
    color: '#ffffff',
    fontSize: 18,
    fontWeight: '600',
    textAlign: 'center',
    flex: 1,
  },
  headerRight: {
    width: 40,
    alignItems: 'flex-end',
  },
  iconButton: {
    padding: 8,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
  },
});
