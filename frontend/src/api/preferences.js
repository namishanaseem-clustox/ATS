import api from './client';

export const getMyPreferences = async () => {
    const response = await api.get('/preferences/me');
    return response.data;
};

export const updateMyPreferences = async (prefsData) => {
    const response = await api.put('/preferences/me', prefsData);
    return response.data;
};
