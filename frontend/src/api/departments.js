import client from './client';

// Departments API
export const getDepartments = async () => {
    const { data } = await client.get('/departments');
    return data;
};

export const createDepartment = async (departmentData) => {
    const { data } = await client.post('/departments', departmentData);
    return data;
};

export const updateDepartment = async ({ id, ...departmentData }) => {
    const { data } = await client.put(`/departments/${id}`, departmentData);
    return data;
};

export const deleteDepartment = async (id) => {
    const { data } = await client.delete(`/departments/${id}`);
    return data;
};

export const removeMemberFromDepartment = async (departmentId, userId) => {
    const { data } = await client.delete(`/departments/${departmentId}/members/${userId}`);
    return data;
};

export const getDepartmentMembers = async (departmentId) => {
    const { data } = await client.get(`/departments/${departmentId}/members`);
    return data;
};

export default client;
