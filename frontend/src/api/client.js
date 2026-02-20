import axios from 'axios';

const client = axios.create({
    baseURL: 'http://localhost:8000',
    headers: {
        'Content-Type': 'application/json',
    },
});

client.interceptors.request.use(
    (config) => {
        const token = localStorage.getItem('token');
        if (token) {
            config.headers['Authorization'] = `Bearer ${token}`;
        }
        return config;
    },
    (error) => {
        return Promise.reject(error);
    }
);

// Global 401 handler – fires a custom event so AuthContext can react without
// needing to be imported here (would create a circular dependency).
client.interceptors.response.use(
    (response) => response,
    (error) => {
        if (error.response?.status === 401) {
            // Only act if we actually had a token (i.e. the session expired, not
            // an invalid login attempt which doesn't have a stored token yet).
            const hadToken = !!localStorage.getItem('token');
            if (hadToken) {
                localStorage.removeItem('token');
                window.dispatchEvent(new CustomEvent('session:expired'));
            }
        }
        return Promise.reject(error);
    }
);

export default client;
