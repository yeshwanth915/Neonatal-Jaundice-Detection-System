import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Modal, Image } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';

export default function ImageUploadModal({ visible, onClose, onUpload, onCamera }) {
  return (
    <Modal
      visible={visible}
      transparent={true}
      animationType="slide"
      onRequestClose={onClose}
    >
      <View style={styles.modalOverlay}>
        <View style={styles.modalContent}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Select Image Source</Text>
            <TouchableOpacity onPress={onClose} style={styles.closeButton}>
              <MaterialIcons name="close" size={24} color="#a9c7e3" />
            </TouchableOpacity>
          </View>
          
          <View style={styles.optionsContainer}>
            <TouchableOpacity style={styles.optionButton} onPress={onCamera}>
              <View style={styles.optionIcon}>
                <MaterialIcons name="camera-alt" size={32} color="#20c997" />
              </View>
              <View style={styles.optionContent}>
                <Text style={styles.optionTitle}>Take Photo</Text>
                <Text style={styles.optionDescription}>Use camera to capture new image</Text>
              </View>
              <MaterialIcons name="chevron-right" size={24} color="#a9c7e3" />
            </TouchableOpacity>
            
            <TouchableOpacity style={styles.optionButton} onPress={onUpload}>
              <View style={styles.optionIcon}>
                <MaterialIcons name="photo-library" size={32} color="#3498db" />
              </View>
              <View style={styles.optionContent}>
                <Text style={styles.optionTitle}>Choose from Gallery</Text>
                <Text style={styles.optionDescription}>Select existing image from device</Text>
              </View>
              <MaterialIcons name="chevron-right" size={24} color="#a9c7e3" />
            </TouchableOpacity>
          </View>
          
          <View style={styles.infoContainer}>
            <View style={styles.infoItem}>
              <MaterialIcons name="info" size={16} color="#f1c40f" />
              <Text style={styles.infoText}>
                For best results, ensure good lighting and clear visibility of the skin
              </Text>
            </View>
            <View style={styles.infoItem}>
              <MaterialIcons name="warning" size={16} color="#e67e22" />
              <Text style={styles.infoText}>
                Yellowish skin tone may indicate jaundice - consult healthcare provider
              </Text>
            </View>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
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
    maxHeight: '80%',
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
  infoContainer: {
    paddingHorizontal: 24,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: '#1f3f5f',
  },
  infoItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  infoText: {
    color: '#a9c7e3',
    fontSize: 13,
    marginLeft: 8,
    flex: 1,
    lineHeight: 18,
  },
});
