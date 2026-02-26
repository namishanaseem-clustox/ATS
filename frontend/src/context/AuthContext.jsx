import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import client from '../api/client';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
    const [user, setUser] = useState(null);
    const [token, setToken] = useState(localStorage.getItem('token'));
    const [loading, setLoading] = useState(true);
    const [sessionMessage, setSessionMessage] = useState(null);
    const [avatarCacheBust, setAvatarCacheBust] = useState(Date.now());

    const setUserAndBust = (updatedUser) => {
        setUser(updatedUser);
        setAvatarCacheBust(Date.now());
    };

    // Set default auth header for all requests
    if (token) {
        client.defaults.headers.common['Authorization'] = `Bearer ${token}`;
    }

    const logout = useCallback(() => {
        localStorage.removeItem('token');
        setToken(null);
        setUser(null);
        delete client.defaults.headers.common['Authorization'];
    }, []);

    // Listen for session expiry fired by the Axios 401 interceptor
    useEffect(() => {
        const handleSessionExpired = () => {
            logout();
            setSessionMessage('Your session has expired. Please sign in again.');
        };
        window.addEventListener('session:expired', handleSessionExpired);
        return () => window.removeEventListener('session:expired', handleSessionExpired);
    }, [logout]);

    const fetchUser = async () => {
        try {
            if (!token) {
                setLoading(false);
                return;
            }
            const response = await client.get('/users/me');
            setUser(response.data);
        } catch (error) {
            // 401 is already handled by the interceptor – avoid double logout
            if (error.response?.status !== 401) {
                console.error("Failed to fetch user", error);
                logout();
            }
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchUser();
    }, [token]);

    const login = async (email, password) => {
        const params = new URLSearchParams();
        params.append('username', email);
        params.append('password', password);

        try {
            const response = await client.post('/token', params, {
                headers: {
                    'Content-Type': 'application/x-www-form-urlencoded',
                },
            });
            const { access_token } = response.data;
            localStorage.setItem('token', access_token);
            setToken(access_token);
            setSessionMessage(null);
            client.defaults.headers.common['Authorization'] = `Bearer ${access_token}`;
            await fetchUser();
            return true;
        } catch (error) {
            throw error;
        }
    };

    const clearSessionMessage = () => setSessionMessage(null);

    const value = {
        user,
        setUser: setUserAndBust,
        avatarCacheBust,
        login,
        logout,
        loading,
        isAuthenticated: !!user,
        sessionMessage,
        clearSessionMessage,
        client,
        fetchUser, // Expose so components can manually re-fetch user from server
    };

    return (
        <AuthContext.Provider value={value}>
            {!loading && children}
        </AuthContext.Provider>
    );
};

export const useAuth = () => {
    return useContext(AuthContext);
};
