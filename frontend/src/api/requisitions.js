import axiosInstance from './client';

export const getRequisitions = async () => {
    const response = await axiosInstance.get('/requisitions/');
    return response.data;
};

export const getRequisition = async (id) => {
    const response = await axiosInstance.get(`/requisitions/${id}`);
    return response.data;
};

export const createRequisition = async (requisitionData) => {
    const response = await axiosInstance.post('/requisitions/', requisitionData);
    return response.data;
};

export const updateRequisition = async (id, requisitionData) => {
    const response = await axiosInstance.put(`/requisitions/${id}`, requisitionData);
    return response.data;
};

export const submitRequisition = async (id) => {
    const response = await axiosInstance.post(`/requisitions/${id}/submit`);
    return response.data;
};

export const approveRequisition = async (id) => {
    const response = await axiosInstance.post(`/requisitions/${id}/approve`);
    return response.data;
};

export const rejectRequisition = async (id, reason) => {
    const response = await axiosInstance.post(`/requisitions/${id}/reject`, { reason });
    return response.data;
};

export const convertRequisitionToJob = async (id) => {
    const response = await axiosInstance.post(`/requisitions/${id}/convert`);
    return response.data;
};
