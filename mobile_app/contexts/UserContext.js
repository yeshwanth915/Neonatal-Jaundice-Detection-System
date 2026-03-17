import React, { createContext, useContext, useEffect, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { storageService } from '../services/storage';
// import { cleanupDuplicateEntries } from '../utils/cleanupDuplicates'; // Temporarily disabled


const ALLOWED_RISKS = new Set(['Normal', 'Low Risk', 'Monitor', 'Mild Jaundice', 'Moderate Jaundice', 'Severe Jaundice', 'Serum Test Needed', 'Urgent Referral']);
const ALLOWED_LABELS = new Set(['Normal', 'Jaundice', 'jaundice', 'normal']);
const ALLOWED_DETECTION_METHODS = new Set(['HSV_color_analysis', 'HSV Analysis', 'color_analysis']);

const isFiniteNumber = (value) => Number.isFinite(Number(value));

const normalizeHistory = (history) => {
  if (!Array.isArray(history)) return [];

  return history
    .filter((entry) => {
      if (!entry || typeof entry !== 'object') return false;
      if (entry.mock === true || entry.isMock === true) return false;
      if (!ALLOWED_RISKS.has(entry.risk)) return false;
      if (!ALLOWED_LABELS.has(entry.prediction_label)) return false;
      if (!entry.timestamp || Number.isNaN(new Date(entry.timestamp).getTime())) return false;
      if (!isFiniteNumber(entry.jaundice_probability)) return false;
      if (!isFiniteNumber(entry.normal_probability)) return false;
      if (!isFiniteNumber(entry.yellow_tint_score)) return false;
      if (!isFiniteNumber(entry.yellow_tint_percentage)) return false;
      if (entry.detection_method && !ALLOWED_DETECTION_METHODS.has(entry.detection_method)) return false;
      if (Number(entry.jaundice_probability) < 0 || Number(entry.jaundice_probability) > 1) return false;
      if (Number(entry.normal_probability) < 0 || Number(entry.normal_probability) > 1) return false;
      if (Number(entry.yellow_tint_percentage) < 0 || Number(entry.yellow_tint_percentage) > 100) return false;
      return true;
    })
    .map((entry) => ({
      ...entry,
      prediction_label: entry.prediction_label === 'jaundice' ? 'Jaundice' : entry.prediction_label,
      jaundice_probability: Number(entry.jaundice_probability),
      normal_probability: Number(entry.normal_probability),
      yellow_tint_score: Number(entry.yellow_tint_score),
      yellow_tint_percentage: Number(entry.yellow_tint_percentage),
      yellow_pixels: Number(entry.yellow_pixels) || null,
      total_pixels: Number(entry.total_pixels) || null,
      // Add fallback values for missing fields
      detection_method: entry.detection_method || 'HSV Analysis',
      confidence: entry.confidence || 'Medium',
    }))
    .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
};

const UserContext = createContext();

export const useUser = () => {
  const context = useContext(UserContext);
  if (!context) {
    throw new Error('useUser must be used within a UserProvider');
  }
  return context;
};

export const UserProvider = ({ children }) => {
  const [userProfile, setUserProfile] = useState(null);
  const [screeningHistory, setScreeningHistory] = useState([]);
  const [settings, setSettings] = useState({
    notifications: true,
    reminders: true,
    darkMode: true,
    units: 'mg/dL',
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadUserData = async () => {
      try {
        const [profile, history, appSettings] = await Promise.all([
          storageService.getUserProfile(),
          storageService.getScreeningHistory(),
          storageService.getSettings(),
        ]);

        const normalizedHistory = normalizeHistory(history);
        if (normalizedHistory.length !== history.length) {
          await AsyncStorage.setItem('screeningHistory', JSON.stringify(normalizedHistory));
        }

        setUserProfile(profile);
        setScreeningHistory(normalizedHistory);
        setSettings(appSettings);
      } catch (error) {
        console.error('Error loading user data:', error);
      } finally {
        setLoading(false);
      }
    };

    loadUserData();
  }, []);

  const addScreeningResult = async (result) => {
    console.log('=== USER CONTEXT ADDING RESULT ===');
    console.log('Result to add:', JSON.stringify(result, null, 2));

    // Check for duplicates - don't save if same result already exists in last 5 entries
    const currentHistory = screeningHistory.slice(0, 5);
    const isDuplicate = currentHistory.some(existing => 
      existing.jaundice_probability === result.jaundice_probability &&
      existing.yellow_tint_score === result.yellow_tint_score &&
      Math.abs(new Date(existing.timestamp) - new Date(result.timestamp || Date.now())) < 5000 // Within 5 seconds
    );

    if (isDuplicate) {
      console.log('=== DUPLICATE DETECTED - NOT SAVING ===');
      return null;
    }

    const savedResult = await storageService.saveScreeningResult(result);
    console.log('Saved result:', savedResult);

    if (savedResult) {
      setScreeningHistory((prev) => normalizeHistory([savedResult, ...prev]));
      console.log('=== STATE UPDATED ===');
      console.log('New history length:', normalizeHistory([savedResult, ...prev]).length);
    } else {
      console.log('=== FAILED TO SAVE RESULT ===');
    }
  };

  const getLastScreeningDate = () => {
    if (screeningHistory.length === 0) return null;
    return new Date(screeningHistory[0].timestamp);
  };

  const getAverageJaundiceProbability = () => {
    if (screeningHistory.length === 0) return 0;
    const sum = screeningHistory.reduce((acc, result) => acc + (result.jaundice_probability || 0), 0);
    return sum / screeningHistory.length;
  };

  const deleteScreeningResult = async (id) => {
    try {
      const history = await storageService.getScreeningHistory();
      const updatedHistory = history.filter(result => result.id !== id);
      await AsyncStorage.setItem('screeningHistory', JSON.stringify(updatedHistory));
      setScreeningHistory(normalizeHistory(updatedHistory));
    } catch (error) {
      console.error('Error deleting screening result:', error);
    }
  };

  const clearAllHistory = async () => {
    try {
      await AsyncStorage.setItem('screeningHistory', JSON.stringify([]));
      setScreeningHistory([]);
    } catch (error) {
      console.error('Error clearing history:', error);
    }
  };

  const exportHistory = async () => {
    try {
      const history = await storageService.getScreeningHistory();
      return history;
    } catch (error) {
      console.error('Error exporting history:', error);
      return [];
    }
  };

  const updateSettings = async (updates) => {
    const nextSettings = { ...settings, ...updates };
    setSettings(nextSettings);
    await storageService.saveSettings(nextSettings);
    return nextSettings;
  };

  const cleanupDuplicates = async () => {
    console.log('=== CLEANING UP DUPLICATES ===');
    // const cleanedHistory = await cleanupDuplicateEntries(); // Temporarily disabled
    // setScreeningHistory(normalizeHistory(cleanedHistory));
    // return cleanedHistory;
    console.log('Cleanup function temporarily disabled');
    return screeningHistory;
  };

  const value = {
    userProfile,
    screeningHistory,
    settings,
    loading,
    addScreeningResult,
    deleteScreeningResult,
    clearAllHistory,
    exportHistory,
    updateSettings,
    cleanupDuplicates,
    getLastScreeningDate,
    getAverageJaundiceProbability,
  };

  return (
    <UserContext.Provider value={value}>
      {children}
    </UserContext.Provider>
  );
};
