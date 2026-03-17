import AsyncStorage from '@react-native-async-storage/async-storage';

const STORAGE_KEYS = {
  USER_PROFILE: 'user_profile',
  SCREENING_HISTORY: 'screening_history',
  APP_SETTINGS: 'app_settings',
};

export const storageService = {
  // User Profile Management
  async saveUserProfile(profile) {
    try {
      await AsyncStorage.setItem(STORAGE_KEYS.USER_PROFILE, JSON.stringify(profile));
      return true;
    } catch (error) {
      console.error('Error saving user profile:', error);
      return false;
    }
  },

  async getUserProfile() {
    try {
      const profile = await AsyncStorage.getItem(STORAGE_KEYS.USER_PROFILE);
      return profile ? JSON.parse(profile) : null;
    } catch (error) {
      console.error('Error getting user profile:', error);
      return null;
    }
  },

  // Screening History Management
  async saveScreeningResult(result) {
    try {
      const existingHistory = await this.getScreeningHistory();
      
      // Check for duplicates - don't save if same result already exists in last 5 entries
      const recentHistory = existingHistory.slice(0, 5);
      const isDuplicate = recentHistory.some(existing => 
        existing.jaundice_probability === result.jaundice_probability &&
        existing.yellow_tint_score === result.yellow_tint_score &&
        Math.abs(new Date(existing.timestamp) - new Date(result.timestamp || Date.now())) < 5000 // Within 5 seconds
      );

      if (isDuplicate) {
        console.log('=== STORAGE: DUPLICATE DETECTED - NOT SAVING ===');
        return null;
      }

      const newResult = {
        ...result,
        id: Date.now().toString(),
        timestamp: new Date().toISOString(),
      };
      const updatedHistory = [newResult, ...existingHistory];
      await AsyncStorage.setItem(STORAGE_KEYS.SCREENING_HISTORY, JSON.stringify(updatedHistory));
      return newResult;
    } catch (error) {
      console.error('Error saving screening result:', error);
      return null;
    }
  },

  async getScreeningHistory() {
    try {
      const history = await AsyncStorage.getItem(STORAGE_KEYS.SCREENING_HISTORY);
      return history ? JSON.parse(history) : [];
    } catch (error) {
      console.error('Error getting screening history:', error);
      return [];
    }
  },

  async deleteScreeningResult(id) {
    try {
      const existingHistory = await this.getScreeningHistory();
      const updatedHistory = existingHistory.filter(item => item.id !== id);
      await AsyncStorage.setItem(STORAGE_KEYS.SCREENING_HISTORY, JSON.stringify(updatedHistory));
      return true;
    } catch (error) {
      console.error('Error deleting screening result:', error);
      return false;
    }
  },

  // Settings Management
  async saveSettings(settings) {
    try {
      await AsyncStorage.setItem(STORAGE_KEYS.APP_SETTINGS, JSON.stringify(settings));
      return true;
    } catch (error) {
      console.error('Error saving settings:', error);
      return false;
    }
  },

  async getSettings() {
    try {
      const settings = await AsyncStorage.getItem(STORAGE_KEYS.APP_SETTINGS);
      return settings ? JSON.parse(settings) : {
        notifications: true,
        darkMode: true,
        units: 'mg/dL',
      };
    } catch (error) {
      console.error('Error getting settings:', error);
      return {
        notifications: true,
        darkMode: true,
        units: 'mg/dL',
      };
    }
  },

  // Clear all data
  async clearAllData() {
    try {
      await AsyncStorage.multiRemove([
        STORAGE_KEYS.USER_PROFILE,
        STORAGE_KEYS.SCREENING_HISTORY,
        STORAGE_KEYS.APP_SETTINGS,
      ]);
      return true;
    } catch (error) {
      console.error('Error clearing data:', error);
      return false;
    }
  },
};
