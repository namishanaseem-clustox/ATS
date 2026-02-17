import client from './client';

export const getCandidateFeedbacks = async (candidateId) => {
    const { data } = await client.get(`/feedbacks/candidate/${candidateId}/`);
    return data;
};

export const createFeedback = async (feedbackData) => {
    const { data } = await client.post('/feedbacks/', feedbackData);
    return data;
};

export const getFeedback = async (feedbackId) => {
    const { data } = await client.get(`/feedbacks/${feedbackId}/`);
    return data;
};
