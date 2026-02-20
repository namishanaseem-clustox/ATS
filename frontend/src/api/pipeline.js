import client from './client';

// --- Templates ---

export const getPipelineTemplates = async () => {
    const { data } = await client.get('/pipeline/templates');
    return data;
};

export const createPipelineTemplate = async (templateData) => {
    const { data } = await client.post('/pipeline/templates', templateData);
    return data;
};

export const updatePipelineTemplate = async (id, templateData) => {
    const { data } = await client.put(`/pipeline/templates/${id}`, templateData);
    return data;
};

export const deletePipelineTemplate = async (id) => {
    await client.delete(`/pipeline/templates/${id}`);
};

// --- Stages ---

export const getPipelineStages = async (templateId = null) => {
    const params = templateId ? { template_id: templateId } : {};
    const { data } = await client.get('/pipeline/stages', { params });
    return data;
};

export const createPipelineStage = async (stageData) => {
    const { data } = await client.post('/pipeline/stages', stageData);
    return data;
};

export const updatePipelineStage = async (id, stageData) => {
    const { data } = await client.put(`/pipeline/stages/${id}`, stageData);
    return data;
};

export const deletePipelineStage = async (id) => {
    await client.delete(`/pipeline/stages/${id}`);
};
