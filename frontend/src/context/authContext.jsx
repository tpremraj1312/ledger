// src/context/authContext.jsx
import { createContext, useContext, useEffect, useState, useCallback } from "react"; // Added useCallback
import axios from "axios";

// --- Axios Default Configuration ---
// Set the base URL for all requests
axios.defaults.baseURL = `${import.meta.env.VITE_BACKEND_URL}`; // Or your backend URL from .env

// Function to set the Authorization header default
const setAuthTokenHeader = (token) => {
  if (token) {
    axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
    console.log("Axios default header set"); // For debugging
  } else {
    delete axios.defaults.headers.common['Authorization'];
    console.log("Axios default header removed"); // For debugging
  }
};
// --- End Axios Config ---


const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true); // Keep track of initial load
  const [isAuthenticated, setIsAuthenticated] = useState(false); // Explicit auth state

  // Using useCallback to memoize fetchUser
  const fetchUser = useCallback(async () => {
    // No need to get token here if using default headers/interceptors
    // setLoading(true); // fetchUser doesn't necessarily mean app loading state
    try {
      // Request will automatically have the header if set via defaults
      const response = await axios.get("/api/auth/me");
      setUser(response.data);
      setIsAuthenticated(true);
      return true; // Indicate success
    } catch (err) {
      console.error("Auth error during fetchUser:", err);
      // Don't logout here automatically, let the caller decide
      setUser(null);
      setIsAuthenticated(false);
      setAuthTokenHeader(null); // Remove invalid token header
      localStorage.removeItem("token"); // Remove invalid token storage
      return false; // Indicate failure
    } finally {
      // setLoading(false); // Only set initial loading to false once
    }
  }, []); // No dependencies needed as it relies on axios defaults

  const login = useCallback(async (token) => {
    if (token) {
      localStorage.setItem("token", token);
      setAuthTokenHeader(token); // Set default header for subsequent requests
      const success = await fetchUser(); // Fetch user info immediately
      return success; // Return true/false based on fetchUser result
    }
    return false;
  }, [fetchUser]); // Depends on fetchUser

  const logout = useCallback(() => {
    localStorage.removeItem("token");
    setAuthTokenHeader(null); // Remove default header
    setUser(null);
    setIsAuthenticated(false);
     // Optional: redirect here or let the component calling logout handle it
     // window.location.href = '/login'; // Force reload/redirect
  }, []);

  // Initial load check
  useEffect(() => {
    const token = localStorage.getItem("token");
    if (token) {
      setAuthTokenHeader(token); // Set header for initial fetch
      fetchUser().finally(() => setLoading(false)); // Fetch user and update loading once done
    } else {
      setLoading(false); // No token, loading finished
    }
  }, [fetchUser]); // Depends on fetchUser

  return (
    <AuthContext.Provider
      value={{
        user,
        // isAuthenticated: !!user, // Use explicit state
        isAuthenticated,
        login,
        logout,
        loading, // Use this for initial app load check
        // Removed error state as errors are handled per action now
        fetchUser // Expose fetchUser if needed elsewhere
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);