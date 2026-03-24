// Backend URL configuration
// For Android emulator: use 10.0.2.2 instead of localhost
// For iOS simulator: localhost works
// For physical device: use your machine's local IP or deployed URL

import { Platform } from 'react-native';

const getBaseUrl = () => {
  // --- CONFIGURATION ---
  // Replace with your machine's local IP (e.g., '192.168.1.5') for physical device testing
  const LOCAL_IP = '10.10.3.163'; // <-- UPDATE THIS
  
  if (__DEV__) {
    if (Platform.OS === 'android') {
      // Use 10.0.2.2 for emulator, LOCAL_IP for physical device
      return `http://${LOCAL_IP}:5000`;
    }
    if (Platform.OS === 'ios') {
      return `http://${LOCAL_IP}:5000`;
    }
    return 'http://localhost:5000'; // Web
  }
  return 'https://ledger-kohl.vercel.app';
};

export const BACKEND_URL = getBaseUrl();
