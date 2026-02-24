import client from './client';

export const getUsers = async () => {
    const { data } = await client.get('/users');
    return data;
};

export const createUser = async (userData) => {
    const { data } = await client.post('/users', userData);
    return data;
};

export const updateUser = async (userId, userData) => {
    const { data } = await client.put(`/users/${userId}`, userData);
    return data;
};

export const deleteUser = async (userId) => {
    await client.delete(`/users/${userId}`);
};

export const inviteUser = async (inviteData) => {
    const { data } = await client.post('/invitations', inviteData);
    return data;
};

export const validateInvite = async (token) => {
    const { data } = await client.get(`/invitations/${token}`);
    return data;
};

export const registerInvitedUser = async (registerData) => {
    const { data } = await client.post('/register-invited', registerData);
    return data;
};
