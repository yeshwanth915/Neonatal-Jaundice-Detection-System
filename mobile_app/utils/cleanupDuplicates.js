import AsyncStorage from '@react-native-async-storage/async-storage';

const STORAGE_KEYS = {
  SCREENING_HISTORY: 'screeningHistory',
};

export const cleanupDuplicateEntries = async () => {
  try {
    console.log('=== CLEANING UP DUPLICATE ENTRIES ===');
    
    // Get existing history
    const history = await AsyncStorage.getItem(STORAGE_KEYS.SCREENING_HISTORY);
    if (!history) {
      console.log('No history found, nothing to clean');
      return [];
    }
    
    const parsedHistory = JSON.parse(history);
    console.log(`Original history length: ${parsedHistory.length}`);
    
    // Remove duplicates - keep only the first occurrence of each unique result
    const uniqueResults = [];
    const seen = new Set();
    
    for (const result of parsedHistory) {
      // Create a unique key based on the actual data (not timestamp or id)
      const uniqueKey = `${result.jaundice_probability}_${result.yellow_tint_score}_${result.prediction_label}`;
      
      if (!seen.has(uniqueKey)) {
        seen.add(uniqueKey);
        uniqueResults.push(result);
      } else {
        console.log(`Removing duplicate: ${uniqueKey}`);
      }
    }
    
    console.log(`After cleanup: ${uniqueResults.length} entries`);
    
    // Save cleaned history
    await AsyncStorage.setItem(STORAGE_KEYS.SCREENING_HISTORY, JSON.stringify(uniqueResults));
    
    return uniqueResults;
  } catch (error) {
    console.error('Error cleaning up duplicates:', error);
    return [];
  }
};

export const getDuplicateCount = async () => {
  try {
    const history = await AsyncStorage.getItem(STORAGE_KEYS.SCREENING_HISTORY);
    if (!history) return 0;
    
    const parsedHistory = JSON.parse(history);
    const seen = new Set();
    let duplicateCount = 0;
    
    for (const result of parsedHistory) {
      const uniqueKey = `${result.jaundice_probability}_${result.yellow_tint_score}_${result.prediction_label}`;
      if (seen.has(uniqueKey)) {
        duplicateCount++;
      } else {
        seen.add(uniqueKey);
      }
    }
    
    return duplicateCount;
  } catch (error) {
    console.error('Error counting duplicates:', error);
    return 0;
  }
};
