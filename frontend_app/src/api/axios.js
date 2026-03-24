import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { BACKEND_URL } from './config';

const api = axios.create({
  baseURL: BACKEND_URL,
});

// Request interceptor — attach token from AsyncStorage
api.interceptors.request.use(
  async (config) => {
    try {
      const token = await AsyncStorage.getItem('token');
      if (token) {
        config.headers.Authorization = `Bearer ${token}`;
      }
    } catch (err) {
      // AsyncStorage read failed — proceed without token
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Response interceptor — handle 401 + gamification results
api.interceptors.response.use(
  (response) => {
    // Process gamification results if present (same as web)
    if (response.data && response.data.gamificationResults) {
      // Emit event for gamification processing
      if (api._onGamificationResult) {
        api._onGamificationResult(response.data.gamificationResults);
      }
    }
    if (response.data && response.data.taxResults) {
      if (api._onTaxResult) {
        api._onTaxResult(response.data.taxResults);
      }
    }
    return response;
  },
  async (error) => {
    if (error.response?.status === 401) {
      try {
        const token = await AsyncStorage.getItem('token');
        if (token) {
          // Token existed but is now invalid → clear it
          await AsyncStorage.removeItem('token');
          await AsyncStorage.removeItem('user');
          // Navigation to login is handled by AuthContext
          if (api._onAuthExpired) {
            api._onAuthExpired();
          }
        }
      } catch (err) {
        // AsyncStorage error — ignore
      }
    }
    return Promise.reject(error);
  }
);

export default api;
