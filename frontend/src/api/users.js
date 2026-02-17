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
