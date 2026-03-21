import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'
import axios from 'axios';
import { useGamificationStore } from './store/useGamificationStore';

// Global interceptor for standard axios calls
axios.interceptors.response.use(
  (response) => {
    if (response.data && response.data.gamificationResults) {
      useGamificationStore.getState().processResults(response.data.gamificationResults);
      window.dispatchEvent(new CustomEvent('gamification_sync_required'));
    }
    return response;
  },
  (error) => Promise.reject(error)
);

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
