import axios from 'axios';

const api = axios.create({
    baseURL: import.meta.env.VITE_BACKEND_URL,
});

// Request interceptor - add token
api.interceptors.request.use(
    (config) => {
        const token = localStorage.getItem('token');
        if (token) {
            config.headers.Authorization = `Bearer ${token}`;
        }
        return config;
    },
    (error) => Promise.reject(error)
);

// Response interceptor - handle 401 gracefully
api.interceptors.response.use(
    (response) => response,
    (error) => {
        if (error.response?.status === 401) {
            // Only redirect if we're pretty sure user should be logged in
            const token = localStorage.getItem('token');

            if (token) {
                // Token existed but is now invalid → clear & redirect
                localStorage.removeItem('token');
                localStorage.removeItem('user');

                // Avoid redirect loop
                if (window.location.pathname !== '/login') {
                    window.location.href = '/login?session_expired=true';
                }
            }
            // If no token was present → just reject (don't redirect)
            // This allows public routes / login page to work normally
        }

        return Promise.reject(error);
    }
);

export default api;