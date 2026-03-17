import React, { useState, useRef, useCallback, useEffect } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Alert, Modal, ActivityIndicator } from 'react-native';
import { CameraView, useCameraPermissions } from 'expo-camera';
import * as ImagePicker from 'expo-image-picker';
import { useIsFocused } from '@react-navigation/native';
import { MaterialIcons } from '@expo/vector-icons';
import RoiOverlay from '../components/RoiOverlay';

const ImageUploadModal = ({ visible, onClose, onUpload, onCamera }) => (
  <Modal
    visible={visible}
    transparent
    animationType="slide"
    onRequestClose={onClose}
  >
    <View style={modalStyles.modalOverlay}>
      <View style={modalStyles.modalContent}>
        <View style={modalStyles.modalHeader}>
          <Text style={modalStyles.modalTitle}>Select Image Source</Text>
          <TouchableOpacity onPress={onClose} style={modalStyles.closeButton}>
            <MaterialIcons name="close" size={24} color="#a9c7e3" />
          </TouchableOpacity>
        </View>

        <View style={modalStyles.optionsContainer}>
          <TouchableOpacity style={modalStyles.optionButton} onPress={onCamera}>
            <View style={modalStyles.optionIcon}>
              <MaterialIcons name="camera-alt" size={32} color="#20c997" />
            </View>
            <View style={modalStyles.optionContent}>
              <Text style={modalStyles.optionTitle}>Take Photo</Text>
              <Text style={modalStyles.optionDescription}>Use camera to capture new image</Text>
            </View>
            <MaterialIcons name="chevron-right" size={24} color="#a9c7e3" />
          </TouchableOpacity>

          <TouchableOpacity style={modalStyles.optionButton} onPress={onUpload}>
            <View style={modalStyles.optionIcon}>
              <MaterialIcons name="photo-library" size={32} color="#3498db" />
            </View>
            <View style={modalStyles.optionContent}>
              <Text style={modalStyles.optionTitle}>Choose from Gallery</Text>
              <Text style={modalStyles.optionDescription}>Select existing image from device</Text>
            </View>
            <MaterialIcons name="chevron-right" size={24} color="#a9c7e3" />
          </TouchableOpacity>
        </View>
      </View>
    </View>
  </Modal>
);

export default function CameraScreen({ navigation, route }) {
  const isFocused = useIsFocused();
  const [permission, requestPermission] = useCameraPermissions();
  const [cameraReady, setCameraReady] = useState(false);
  const [cameraError, setCameraError] = useState(null);
  const [isCapturing, setIsCapturing] = useState(false);
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [permissionWaitExceeded, setPermissionWaitExceeded] = useState(false);
  const cameraRef = useRef(null);
  const remountKey = `${route?.params?.sessionKey || 'default'}-${isFocused ? 'focused' : 'blurred'}`;

  useEffect(() => {
    if (permission) {
      setPermissionWaitExceeded(false);
      return;
    }

    const timer = setTimeout(() => setPermissionWaitExceeded(true), 3000);
    return () => clearTimeout(timer);
  }, [permission]);

  useEffect(() => {
    if (!isFocused) {
      setCameraReady(false);
    }
  }, [isFocused]);

  const handleRequestPermission = async () => {
    await requestPermission();
  };

  const handleImageUpload = useCallback(async () => {
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [4, 3],
        quality: 0.9,
      });

      if (!result.canceled && result.assets?.[0]?.uri) {
        setShowUploadModal(false);
        navigation.navigate('Processing', { imageUri: result.assets[0].uri });
      }
    } catch {
      Alert.alert('Upload Failed', 'Unable to select image. Please try again.');
    }
  }, [navigation]);

  useEffect(() => {
    if (route?.params?.openUpload) {
      handleImageUpload();
      navigation.setParams({ openUpload: false });
    }
  }, [handleImageUpload, navigation, route?.params?.openUpload]);

  const handleCapture = useCallback(async () => {
    if (!cameraRef.current || !cameraReady) {
      Alert.alert('Camera Not Ready', 'Please wait for camera preview to initialize.');
      return;
    }

    try {
      setIsCapturing(true);
      const photo = await cameraRef.current.takePictureAsync({
        quality: 0.9,
        base64: false,
        skipProcessing: false,
      });

      if (!photo?.uri) {
        throw new Error('Camera did not return an image URI.');
      }

      navigation.navigate('Processing', { imageUri: photo.uri });
    } catch (error) {
      Alert.alert('Capture Failed', error?.message || 'Unable to capture image. Please try again.');
    } finally {
      setIsCapturing(false);
    }
  }, [cameraReady, navigation]);

  if (!permission) {
    return (
      <View style={styles.permissionContainer}>
        <ActivityIndicator size="large" color="#20c997" />
        <Text style={styles.permissionText}>
          {permissionWaitExceeded ? 'Permission check is taking longer than expected.' : 'Checking camera permission...'}
        </Text>
        {permissionWaitExceeded && (
          <TouchableOpacity style={styles.permissionButton} onPress={handleRequestPermission}>
            <Text style={styles.permissionButtonText}>Request Camera Permission</Text>
          </TouchableOpacity>
        )}
      </View>
    );
  }

  if (!permission.granted) {
    return (
      <View style={styles.permissionContainer}>
        <Text style={styles.permissionText}>Camera access is required to capture screening images.</Text>
        <TouchableOpacity style={styles.permissionButton} onPress={handleRequestPermission}>
          <Text style={styles.permissionButtonText}>Grant Permission</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.uploadButton} onPress={handleImageUpload}>
          <MaterialIcons name="upload" size={20} color="#0b1d2c" style={styles.buttonIcon} />
          <Text style={styles.uploadButtonText}>Upload Image Instead</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.cameraFrame}>
        {isFocused && !cameraError ? (
          <>
            <CameraView
              key={remountKey}
              ref={cameraRef}
              style={styles.camera}
              facing="back"
              onCameraReady={() => {
                setCameraReady(true);
                setCameraError(null);
              }}
              onMountError={(event) => {
                setCameraError(event?.message || 'Unable to initialize camera.');
                setCameraReady(false);
              }}
            />
            {cameraReady && !cameraError && <RoiOverlay />}
            {cameraReady && !cameraError && (
              <View style={styles.overlayHint}>
                <Text style={styles.overlayText}>Align baby's skin in the box. Use soft daylight.</Text>
              </View>
            )}
          </>
        ) : (
          <View style={styles.cameraFallback}>
            <MaterialIcons name="camera-alt" size={56} color="#a9c7e3" />
            <Text style={styles.fallbackTitle}>Camera Preview Unavailable</Text>
            <Text style={styles.fallbackText}>{cameraError || 'Try reopening the camera screen.'}</Text>
            <TouchableOpacity style={styles.uploadButton} onPress={handleImageUpload}>
              <MaterialIcons name="upload" size={20} color="#0b1d2c" style={styles.buttonIcon} />
              <Text style={styles.uploadButtonText}>Upload Image</Text>
            </TouchableOpacity>
          </View>
        )}

        {!cameraReady && !cameraError && (
          <View style={styles.previewLoading}>
            <ActivityIndicator size="small" color="#ffffff" />
            <Text style={styles.previewLoadingText}>Starting camera...</Text>
          </View>
        )}
      </View>

      <View style={styles.controls}>
        <TouchableOpacity
          style={[styles.uploadButton, styles.uploadButtonOverlay]}
          onPress={() => setShowUploadModal(true)}
          accessibilityRole="button"
        >
          <MaterialIcons name="upload" size={20} color="#ffffff" />
          <Text style={styles.uploadButtonTextOverlay}>Upload</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[
            styles.captureButton,
            (isCapturing || !cameraReady || !!cameraError) && styles.captureButtonDisabled,
          ]}
          onPress={handleCapture}
          disabled={isCapturing || !cameraReady || !!cameraError}
          accessibilityRole="button"
        >
          {isCapturing ? <ActivityIndicator color="#ffffff" /> : <Text style={styles.captureText}>Capture</Text>}
        </TouchableOpacity>
      </View>

      <ImageUploadModal
        visible={showUploadModal}
        onClose={() => setShowUploadModal(false)}
        onUpload={handleImageUpload}
        onCamera={() => setShowUploadModal(false)}
      />
    </View>
  );
}

const modalStyles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#162d44',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingTop: 20,
    paddingBottom: 30,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#1f3f5f',
  },
  modalTitle: {
    color: '#ffffff',
    fontSize: 20,
    fontWeight: '600',
  },
  closeButton: {
    padding: 4,
  },
  optionsContainer: {
    paddingHorizontal: 24,
    paddingVertical: 20,
  },
  optionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#0b1d2c',
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
  },
  optionIcon: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 16,
  },
  optionContent: {
    flex: 1,
  },
  optionTitle: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 4,
  },
  optionDescription: {
    color: '#a9c7e3',
    fontSize: 14,
  },
});

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0b1d2c',
  },
  cameraFrame: {
    flex: 1,
    margin: 12,
    borderRadius: 20,
    overflow: 'hidden',
    backgroundColor: '#000000',
  },
  camera: {
    flex: 1,
  },
  overlayHint: {
    position: 'absolute',
    left: 16,
    right: 16,
    bottom: 16,
    backgroundColor: 'rgba(0, 0, 0, 0.45)',
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  overlayText: {
    color: '#ffffff',
    fontSize: 12,
    textAlign: 'center',
  },
  cameraFallback: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 24,
  },
  fallbackTitle: {
    color: '#ffffff',
    fontSize: 20,
    fontWeight: '700',
    marginTop: 12,
    marginBottom: 6,
  },
  fallbackText: {
    color: '#a9c7e3',
    fontSize: 14,
    textAlign: 'center',
    marginBottom: 20,
  },
  previewLoading: {
    position: 'absolute',
    top: 16,
    alignSelf: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.45)',
    borderRadius: 14,
    paddingHorizontal: 12,
    paddingVertical: 8,
    flexDirection: 'row',
    alignItems: 'center',
  },
  previewLoadingText: {
    color: '#ffffff',
    marginLeft: 8,
    fontSize: 13,
  },
  controls: {
    paddingHorizontal: 16,
    paddingBottom: 20,
    flexDirection: 'row',
    gap: 10,
  },
  captureButton: {
    backgroundColor: '#20c997',
    height: 56,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    flex: 1.2,
  },
  captureButtonDisabled: {
    backgroundColor: '#1a7d66',
  },
  captureText: {
    color: '#ffffff',
    fontSize: 18,
    fontWeight: '700',
  },
  uploadButton: {
    backgroundColor: '#5dade2',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  uploadButtonOverlay: {
    flex: 1,
    backgroundColor: '#3498db',
    height: 56,
  },
  uploadButtonText: {
    color: '#0b1d2c',
    fontWeight: '700',
    fontSize: 16,
    marginLeft: 6,
  },
  uploadButtonTextOverlay: {
    color: '#ffffff',
    fontWeight: '700',
    fontSize: 16,
    marginLeft: 6,
  },
  buttonIcon: {
    marginRight: 2,
  },
  permissionContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
    backgroundColor: '#0b1d2c',
  },
  permissionText: {
    color: '#ffffff',
    fontSize: 16,
    textAlign: 'center',
    marginVertical: 12,
  },
  permissionButton: {
    backgroundColor: '#20c997',
    paddingHorizontal: 24,
    paddingVertical: 14,
    borderRadius: 12,
    marginBottom: 12,
  },
  permissionButtonText: {
    color: '#0b1d2c',
    fontWeight: '700',
    fontSize: 16,
  },
});
