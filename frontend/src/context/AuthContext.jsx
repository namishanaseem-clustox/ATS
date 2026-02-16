import React, { createContext, useContext, useState, useEffect } from 'react';
import client from '../api/client';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
    const [user, setUser] = useState(null);
    const [token, setToken] = useState(localStorage.getItem('token'));
    const [loading, setLoading] = useState(true);

    // Use shared client instance


    // Set default auth header for all requests
    if (token) {
        client.defaults.headers.common['Authorization'] = `Bearer ${token}`;
    }

    const fetchUser = async () => {
        try {
            if (!token) {
                setLoading(false);
                return;
            }
            const response = await client.get('/users/me');
            setUser(response.data);
        } catch (error) {
            console.error("Failed to fetch user", error);
            logout();
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
            // Fetch user immediately to update state
            client.defaults.headers.common['Authorization'] = `Bearer ${access_token}`;
            await fetchUser();
            return true;
        } catch (error) {
            // Error is handled by the calling component
            throw error;
        }
    };

    const logout = () => {
        localStorage.removeItem('token');
        setToken(null);
        setUser(null);
        delete client.defaults.headers.common['Authorization'];
    };

    const value = {
        user,
        login,
        logout,
        loading,
        isAuthenticated: !!user,
        client // Expose the configured axios client
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
