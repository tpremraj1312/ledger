import React, { createContext, useContext, useEffect, useState, useMemo, useCallback } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import api from '../api/axios';

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  const fetchUser = useCallback(async () => {
    try {
      const res = await api.get('/api/auth/me');
      setUser(res.data);
      return res.data;
    } catch (err) {
      await AsyncStorage.removeItem('token');
      setUser(null);
      return null;
    }
  }, []);

  useEffect(() => {
    const init = async () => {
      try {
        const token = await AsyncStorage.getItem('token');
        if (!token) {
          setLoading(false);
          return;
        }
        await fetchUser();
      } catch (err) {
        // handled inside fetchUser
      } finally {
        setLoading(false);
      }
    };

    // Register auth expiry callback
    api._onAuthExpired = () => {
      setUser(null);
    };

    init();

    return () => {
      api._onAuthExpired = null;
    };
  }, [fetchUser]);

  const login = useCallback(async (token) => {
    await AsyncStorage.setItem('token', token);
    const res = await api.get('/api/auth/me');
    setUser(res.data);
  }, []);

  const logout = useCallback(async () => {
    await AsyncStorage.removeItem('token');
    setUser(null);
  }, []);

  const refreshUser = useCallback(async () => {
    return await fetchUser();
  }, [fetchUser]);

  const updateProfile = useCallback(async (data) => {
    const res = await api.patch('/api/settings/profile', data);
    setUser(res.data);
    return res.data;
  }, []);

  const updateSettings = useCallback(async (category, preferences) => {
    const res = await api.patch('/api/settings/preferences', { category, preferences });
    setUser(res.data);
    return res.data;
  }, []);

  const value = useMemo(() => ({
    user,
    loading,
    isAuthenticated: !!user,
    login,
    logout,
    refreshUser,
    updateProfile,
    updateSettings,
  }), [user, loading, login, logout, refreshUser, updateProfile, updateSettings]);

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
