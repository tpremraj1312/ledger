// src/context/authContext.jsx

import { createContext, useContext, useEffect, useState, useMemo, useCallback } from "react";
import axios from "axios";

axios.defaults.baseURL = import.meta.env.VITE_BACKEND_URL;

const AuthContext = createContext();

const setAuthHeader = (token) => {
  if (token) {
    axios.defaults.headers.common["Authorization"] = `Bearer ${token}`;
  } else {
    delete axios.defaults.headers.common["Authorization"];
  }
};

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  const fetchUser = useCallback(async () => {
    try {
      const res = await axios.get("/api/auth/me");
      setUser(res.data);
      return res.data;
    } catch (err) {
      localStorage.removeItem("token");
      setAuthHeader(null);
      setUser(null);
      return null;
    }
  }, []);

  useEffect(() => {
    const init = async () => {
      const token = localStorage.getItem("token");

      if (!token) {
        setLoading(false);
        return;
      }

      try {
        setAuthHeader(token);
        await fetchUser();
      } catch (err) {
        // handled inside fetchUser
      } finally {
        setLoading(false);
      }
    };

    init();
  }, [fetchUser]);

  const login = async (token) => {
    localStorage.setItem("token", token);
    setAuthHeader(token);
    const res = await axios.get("/api/auth/me");
    setUser(res.data);
  };

  const logout = () => {
    localStorage.removeItem("token");
    setAuthHeader(null);
    setUser(null);
  };

  // Refresh user data (e.g., after creating/joining/leaving family)
  const refreshUser = useCallback(async () => {
    return await fetchUser();
  }, [fetchUser]);

  const value = useMemo(() => ({
    user,
    loading,
    isAuthenticated: !!user,
    login,
    logout,
    refreshUser,
    updateProfile: async (data) => {
      const res = await axios.patch("/api/settings/profile", data);
      setUser(res.data);
      return res.data;
    },
    updateSettings: async (category, preferences) => {
      const res = await axios.patch("/api/settings/preferences", { category, preferences });
      setUser(res.data);
      return res.data;
    },
  }), [user, loading, refreshUser]);

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);