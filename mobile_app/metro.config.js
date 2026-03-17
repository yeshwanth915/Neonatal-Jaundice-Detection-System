const { getDefaultConfig } = require('expo/metro-config');

const config = getDefaultConfig(__dirname);

// Simplified configuration to avoid module resolution issues
config.resolver.alias = {
  // Remove problematic alias that causes runtime errors
};

module.exports = config;
