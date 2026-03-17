import React from 'react';
import { View, StyleSheet } from 'react-native';

export default function RoiOverlay() {
  return (
    <View pointerEvents="none" style={styles.container}>
      <View style={styles.rectangle} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    alignItems: 'center',
    justifyContent: 'center',
  },
  rectangle: {
    width: '50%',
    height: '35%',
    borderWidth: 2,
    borderColor: 'rgba(255, 255, 255, 0.8)',
    borderRadius: 12,
    backgroundColor: 'transparent',
  },
});
