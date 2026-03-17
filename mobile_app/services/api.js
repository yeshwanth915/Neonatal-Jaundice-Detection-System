import axios from 'axios';
import { Platform } from 'react-native';

const getBaseUrl = () => {
  // Platform-specific endpoint ordering for better compatibility
  const isAndroid = Platform.OS === 'android';
  const isIOS = Platform.OS === 'ios';
  
  // For Expo Go (real device) - prioritize the working IP first
  const expoGoEndpoints = [
    'http://10.42.140.195:8000',      // Working IP (priority)
    'http://10.32.61.195:8000',      // Previous network IP (backup)
    'http://192.168.1.100:8000',      // Common home network IP
    'http://192.168.0.100:8000',      // Alternative home network IP
    'http://localhost:8000',           // Fallback for development
  ];
  
  const androidEndpoints = [
    'http://10.42.140.195:8000',      // Working IP (priority for Expo Go)
    'http://10.0.2.2:8000',            // Android emulator special IP
    'http://10.0.3.2:8000',            // Android emulator alternative
    'http://localhost:8000',           // Local development
    'http://127.0.0.1:8000',           // Alternative localhost
    'http://10.32.61.195:8000',      // Previous network IP (backup)
    'http://10.170.189.195:8000',      // Original hardcoded IP
    'http://192.168.1.100:8000',      // Common home network IP
    'http://192.168.0.100:8000',      // Another common IP
  ];
  
  const iOSEndpoints = [
    'http://10.42.140.195:8000',      // Working IP (priority for Expo Go)
    'http://localhost:8000',           // iOS simulator uses localhost
    'http://127.0.0.1:8000',           // Alternative localhost
    'http://10.32.61.195:8000',      // Previous network IP (backup)
    'http://10.170.189.195:8000',      // Original hardcoded IP
    'http://192.168.1.100:8000',      // Common home network IP
    'http://192.168.0.100:8000',      // Another common IP
  ];
  
  // Detect if running on Expo Go (real device) vs emulator
  const isExpoGo = Platform.constants?.appOwnership === 'expo' && !__DEV__;
  
  if (isExpoGo) {
    return expoGoEndpoints[0]; // Use working IP for Expo Go
  }
  
  const endpoints = isAndroid ? androidEndpoints : iOSEndpoints;
  
  // Return first endpoint (platform-specific priority)
  return endpoints[0];
};

const API_TIMEOUT = 20000; // Reduced to 20 seconds
const MAX_RETRIES = 1; // Reduced to 1 retry for faster response
const RETRY_DELAY = 1000; // Reduced to 1 second delay

class APIError extends Error {
  constructor(message, code, status) {
    super(message);
    this.name = 'APIError';
    this.code = code;
    this.status = status;
  }
}

const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

// Test multiple server endpoints to find working connection
async function testConnectionEndpoints() {
  const isAndroid = Platform.OS === 'android';
  const isIOS = Platform.OS === 'ios';
  
  // Prioritize the working IP first
  const androidEndpoints = [
    'http://10.42.140.195:8000',      // Working IP (priority)
    'http://10.0.2.2:8000',            // Android emulator special IP
    'http://10.0.3.2:8000',            // Android emulator alternative
    'http://localhost:8000',
    'http://127.0.0.1:8000', 
    'http://10.32.61.195:8000',      // Previous network IP (backup)
    'http://10.170.189.195:8000',
    'http://192.168.1.100:8000',
    'http://192.168.0.100:8000'
  ];
  
  const iOSEndpoints = [
    'http://10.42.140.195:8000',      // Working IP (priority)
    'http://localhost:8000',
    'http://127.0.0.1:8000', 
    'http://10.32.61.195:8000',      // Previous network IP (backup)
    'http://10.170.189.195:8000',
    'http://192.168.1.100:8000',
    'http://192.168.0.100:8000'
  ];
  
  const endpoints = isAndroid ? androidEndpoints : iOSEndpoints;
  
  for (const endpoint of endpoints) {
    try {
      const response = await axios.get(`${endpoint}/health`, { timeout: 3000 });
      if (response.status === 200) {
        console.log(`✅ Connected to server at: ${endpoint}`);
        return endpoint;
      }
    } catch (error) {
      // Only log errors for the first few endpoints to reduce noise
      if (endpoints.indexOf(endpoint) < 3) {
        console.log(`❌ Failed to connect to ${endpoint}: Network Error`);
      }
    }
  }
  
  throw new Error('No working server endpoint found. Please ensure the backend server is running.');
}

export async function uploadImageForPrediction(fileUri, retryCount = 0) {
  if (!fileUri) {
    throw new APIError('Missing image URI for upload.', 'MISSING_URI');
  }

  console.log(`=== PREDICTION REQUEST ===`);
  console.log(`Platform: ${Platform.OS}`);
  console.log(`Retry count: ${retryCount}`);
  console.log(`File URI: ${fileUri}`);

  try {
    // Use the known working endpoint directly for faster response
    let baseUrl = getBaseUrl();
    console.log(`🚀 Using endpoint: ${baseUrl}`);

    // Only do connection test if this is a retry
    if (retryCount > 0) {
      try {
        baseUrl = await testConnectionEndpoints();
        console.log(`✅ Using working endpoint: ${baseUrl}`);
      } catch (connectionError) {
        console.log('⚠️ Connection test failed, using default URL:', connectionError.message);
        baseUrl = getBaseUrl();
        console.log(`🔄 Using fallback endpoint: ${baseUrl}`);
      }
    }

    const formData = new FormData();
    formData.append('file', {
      uri: fileUri,
      name: 'capture.jpg',
      type: 'image/jpeg',
    });

    console.log(`📤 Sending request to: ${baseUrl}/predict`);

    const response = await axios.post(
      `${baseUrl}/predict`,
      formData,
      {
        headers: {
          'Content-Type': 'multipart/form-data',
          'Accept': 'application/json',
        },
        timeout: API_TIMEOUT,
      }
    );

    console.log(`✅ Prediction successful:`, response.data);
    return response.data;
  } catch (error) {
    if (error.response) {
      // Server responded with error status
      const status = error.response.status;
      const message = error.response.data?.detail || error.response.data?.error || 'Server error';
      
      if (status === 400) {
        throw new APIError(message, 'BAD_REQUEST', status);
      } else if (status === 503) {
        throw new APIError('Service unavailable. Models are loading.', 'SERVICE_UNAVAILABLE', status);
      } else {
        throw new APIError(`Server error: ${message}`, 'SERVER_ERROR', status);
      }
    } else if (error.request) {
      // Network error
      if (retryCount < MAX_RETRIES) {
        console.log(`Retrying request (${retryCount + 1}/${MAX_RETRIES})...`);
        await sleep(RETRY_DELAY * (retryCount + 1)); // Exponential backoff
        return uploadImageForPrediction(fileUri, retryCount + 1);
      }
      
      if (error.code === 'ECONNABORTED') {
        throw new APIError('Request timed out', 'TIMEOUT');
      } else {
        throw new APIError('Network connection failed', 'NETWORK_ERROR');
      }
    } else {
      // Other errors
      throw new APIError(error.message || 'Unknown error occurred', 'UNKNOWN_ERROR');
    }
  }
}

// Health check function with endpoint testing
export async function checkServerHealth() {
  try {
    // Try to find a working endpoint first
    const workingEndpoint = await testConnectionEndpoints();
    const response = await axios.get(`${workingEndpoint}/health`, {
      timeout: 10000,
    });
    
    return response.status === 200;
  } catch (error) {
    // If endpoint testing fails, try the default URL
    try {
      const response = await axios.get(`${getBaseUrl()}/health`, {
        timeout: 5000,
      });
      return response.status === 200;
    } catch (fallbackError) {
      if (fallbackError.response) {
        throw new APIError('Server is not responding correctly', 'SERVER_ERROR', fallbackError.response.status);
      } else {
        throw new APIError('Cannot reach server', 'NETWORK_ERROR');
      }
    }
  }
}

export { APIError };
