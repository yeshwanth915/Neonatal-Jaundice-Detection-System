import React, { useEffect } from 'react';
import { View, Text, ActivityIndicator, StyleSheet, Alert } from 'react-native';
import { uploadImageForPrediction, APIError } from '../services/api';
import { useError } from '../contexts/ErrorContext';

export default function ProcessingScreen({ navigation, route }) {
  const { imageUri } = route.params || {};
  const { handleError } = useError();

  useEffect(() => {
    let isMounted = true;

    async function processImage() {
      if (!imageUri) {
        Alert.alert('Error', 'No image provided. Returning to camera.');
        navigation.replace('Camera');
        return;
      }

      try {
        const result = await uploadImageForPrediction(imageUri);
        if (isMounted) {
          navigation.replace('Result', { result, imageUri });
        }
      } catch (error) {
        if (isMounted) {
          if (error instanceof APIError) {
            handleError(error, 'api');
          } else {
            handleError(error, 'image_processing');
          }

          navigation.replace('Camera');
        }
      }
    }

    processImage();

    return () => {
      isMounted = false;
    };
  }, [imageUri, navigation, handleError]);

  return (
    <View style={styles.container}>
      <ActivityIndicator size="large" color="#20c997" />
      <Text style={styles.text}>Analyzing captured image...</Text>
      <Text style={styles.subtext}>Do not close the app or switch screens.</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#0b1d2c',
    paddingHorizontal: 24,
  },
  text: {
    color: '#ffffff',
    fontSize: 18,
    fontWeight: '600',
    marginTop: 16,
  },
  subtext: {
    color: '#dfe8f5',
    fontSize: 15,
    marginTop: 8,
    textAlign: 'center',
  },
});
