import React, { useState, useEffect, useRef } from 'react';
import {
    KanbanSquare, Plus, GripVertical, Trash2, Check, X, AlertCircle, LayoutTemplate, MoreVertical, Edit2, Star
} from 'lucide-react';
import {
    getPipelineStages, createPipelineStage, updatePipelineStage, deletePipelineStage,
    getPipelineTemplates, createPipelineTemplate, updatePipelineTemplate, deletePipelineTemplate
} from '../../api/pipeline';

// Simple Toast Component
const Toast = ({ message, type, onClose }) => {
    useEffect(() => {
        const timer = setTimeout(onClose, 3000);
        return () => clearTimeout(timer);
    }, [onClose]);

    const bg = type === 'success' ? 'bg-green-600' : 'bg-red-600';

    return (
        <div className={`fixed bottom-4 right-4 ${bg} text-white px-4 py-2 rounded-lg shadow-lg flex items-center gap-2 animate-bounce-in z-50`}>
            {type === 'success' ? <Check size={18} /> : <AlertCircle size={18} />}
            <span>{message}</span>
            <button onClick={onClose} className="ml-2 hover:bg-white/20 rounded p-0.5"><X size={14} /></button>
        </div>
    );
};

const PipelineSettingsPage = () => {
    // Templates State
    const [templates, setTemplates] = useState([]);
    const [selectedTemplate, setSelectedTemplate] = useState(null);
    const [isCreatingTemplate, setIsCreatingTemplate] = useState(false);
    const [newTemplateName, setNewTemplateName] = useState('');
    const [editingTemplateId, setEditingTemplateId] = useState(null);

    // Stages State
    const [stages, setStages] = useState([]);
    const [loading, setLoading] = useState(true);
    const [editingId, setEditingId] = useState(null);
    const [newStageName, setNewStageName] = useState('');
    const [isAdding, setIsAdding] = useState(false);
    const [toast, setToast] = useState(null); // { message, type }

    const dragItem = useRef();
    const dragOverItem = useRef();

    const showToast = (message, type = 'success') => setToast({ message, type });

    useEffect(() => {
        fetchTemplates();
    }, []);

    useEffect(() => {
        if (selectedTemplate) {
            fetchStages(selectedTemplate.id);
        } else {
            setStages([]);
        }
    }, [selectedTemplate]);

    const fetchTemplates = async () => {
        try {
            const data = await getPipelineTemplates();
            setTemplates(data);
            if (data.length > 0 && !selectedTemplate) {
                // Select default or first
                const defaultT = data.find(t => t.is_default) || data[0];
                setSelectedTemplate(defaultT);
            }
        } catch (error) {
            showToast("Failed to load templates", "error");
        }
    };

    const fetchStages = async (templateId) => {
        setLoading(true);
        try {
            const data = await getPipelineStages(templateId);
            const sorted = data.sort((a, b) => a.order - b.order);
            setStages(sorted);
        } catch (error) {
            showToast("Failed to load stages", "error");
        } finally {
            setLoading(false);
        }
    };

    // --- Template Handlers ---

    const handleCreateTemplate = async () => {
        if (!newTemplateName.trim()) return;
        try {
            const newT = await createPipelineTemplate({ name: newTemplateName });
            setTemplates([...templates, newT]);
            setNewTemplateName('');
            setIsCreatingTemplate(false);
            setSelectedTemplate(newT);
            showToast("Template created");
        } catch (error) {
            showToast("Failed to create template", "error");
        }
    };

    const handleDeleteTemplate = async (id, isDefault) => {
        if (isDefault) {
            showToast("Cannot delete default template", "error");
            return;
        }
        if (!window.confirm("Are you sure? All stages and jobs linked to this template will be affected.")) return;
        try {
            await deletePipelineTemplate(id);
            const newTemplates = templates.filter(t => t.id !== id);
            setTemplates(newTemplates);
            if (selectedTemplate?.id === id) {
                setSelectedTemplate(newTemplates[0] || null);
            }
            showToast("Template deleted");
        } catch (error) {
            showToast("Failed to delete template", "error");
        }
    };

    const handleUpdateTemplate = async (id, data) => {
        try {
            const updated = await updatePipelineTemplate(id, data);
            setTemplates(templates.map(t => t.id === id ? updated : t));
            if (selectedTemplate?.id === id) setSelectedTemplate(updated);
            setEditingTemplateId(null);
            showToast("Template updated");
        } catch (error) {
            showToast("Failed to update template", "error");
        }
    };

    const handleSetDefaultTemplate = async (template) => {
        try {
            // Optimistic update locally
            const updatedTemplates = templates.map(t => ({
                ...t,
                is_default: t.id === template.id
            }));
            setTemplates(updatedTemplates);
            if (selectedTemplate?.id === template.id) setSelectedTemplate({ ...template, is_default: true });

            await updatePipelineTemplate(template.id, { is_default: true, name: template.name });
            showToast("Default template set");
            fetchTemplates(); // Refresh to ensure backend state is synced
        } catch (error) {
            showToast("Failed to set default", "error");
            fetchTemplates();
        }
    }


    // --- Stage Handlers ---

    const handleDragStart = (e, position) => {
        dragItem.current = position;
    };

    const handleDragEnter = (e, position) => {
        dragOverItem.current = position;
    };

    const handleDragEnd = async () => {
        if (!selectedTemplate) return;
        const copyListItems = [...stages];
        const dragItemContent = copyListItems[dragItem.current];
        copyListItems.splice(dragItem.current, 1);
        copyListItems.splice(dragOverItem.current, 0, dragItemContent);

        dragItem.current = null;
        dragOverItem.current = null;
        setStages(copyListItems);

        try {
            const updates = copyListItems.map((stage, index) =>
                updatePipelineStage(stage.id, { order: index })
            );
            await Promise.all(updates);
            showToast("Order updated");
        } catch (error) {
            showToast("Failed to save order", "error");
            fetchStages(selectedTemplate.id);
        }
    };

    const handleAddStage = async () => {
        if (!newStageName.trim() || !selectedTemplate) return;
        try {
            const maxOrder = stages.length > 0 ? Math.max(...stages.map(s => s.order)) : 0;
            const newStage = await createPipelineStage({
                name: newStageName,
                order: maxOrder + 1,
                color: "#CCCCCC",
                pipeline_template_id: selectedTemplate.id
            });
            setStages([...stages, newStage]);
            setNewStageName('');
            setIsAdding(false);
            showToast("Stage created");
        } catch (error) {
            showToast("Failed to create stage", "error");
        }
    };

    const handleDeleteStage = async (id, isDefault) => {
        if (isDefault) {
            showToast("Cannot delete default stages", "error"); // Backend might allow it for non-default templates, but keep safe
            return;
        }
        if (!window.confirm("Are you sure? Candidates in this stage may be lost.")) return;

        try {
            await deletePipelineStage(id);
            setStages(stages.filter(s => s.id !== id));
            showToast("Stage deleted");
        } catch (error) {
            showToast("Failed to delete stage", "error");
        }
    };

    const handleUpdateStage = async (id, data) => {
        try {
            const updated = await updatePipelineStage(id, data);
            setStages(stages.map(s => s.id === id ? updated : s));
            setEditingId(null);
            showToast("Stage updated");
        } catch (error) {
            showToast("Failed to update stage", "error");
        }
    };

    return (
        <div className="flex h-[calc(100vh-64px)] bg-gray-50">
            {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}

            {/* Sidebar: Templates */}
            <div className="w-80 bg-white border-r border-gray-200 flex flex-col">
                <div className="p-4 border-b border-gray-200 flex items-center justify-between">
                    <h2 className="font-semibold text-gray-800 flex items-center gap-2">
                        <LayoutTemplate size={20} className="text-blue-600" />
                        Pipelines
                    </h2>
                    <button
                        onClick={() => setIsCreatingTemplate(true)}
                        className="p-1.5 text-blue-600 hover:bg-blue-50 rounded transition-colors"
                        title="New Pipeline"
                    >
                        <Plus size={20} />
                    </button>
                </div>

                <div className="flex-1 overflow-y-auto p-2 space-y-1">
                    {isCreatingTemplate && (
                        <div className="p-3 bg-blue-50 rounded-lg border border-blue-200 mb-2">
                            <input
                                autoFocus
                                type="text"
                                placeholder="Pipeline Name..."
                                className="w-full px-2 py-1 text-sm border-gray-300 rounded mb-2 focus:ring-blue-500 focus:border-blue-500"
                                value={newTemplateName}
                                onChange={e => setNewTemplateName(e.target.value)}
                                onKeyDown={e => {
                                    if (e.key === 'Enter') handleCreateTemplate();
                                    if (e.key === 'Escape') setIsCreatingTemplate(false);
                                }}
                            />
                            <div className="flex justify-end gap-2">
                                <button onClick={() => setIsCreatingTemplate(false)} className="text-xs text-gray-500 hover:text-gray-700">Cancel</button>
                                <button onClick={handleCreateTemplate} className="text-xs bg-blue-600 text-white px-2 py-1 rounded hover:bg-blue-700">Create</button>
                            </div>
                        </div>
                    )}

                    {templates.map(template => (
                        <div
                            key={template.id}
                            className={`group flex items-center justify-between p-3 rounded-lg cursor-pointer transition-all ${selectedTemplate?.id === template.id
                                    ? 'bg-blue-50 border-blue-200 shadow-sm ring-1 ring-blue-200'
                                    : 'hover:bg-gray-50 border border-transparent'
                                }`}
                            onClick={() => setSelectedTemplate(template)}
                        >
                            <div className="flex-1 min-w-0">
                                {editingTemplateId === template.id ? (
                                    <input
                                        autoFocus
                                        type="text"
                                        className="w-full px-1 py-0.5 text-sm border rounded"
                                        defaultValue={template.name}
                                        onBlur={e => handleUpdateTemplate(template.id, { name: e.target.value })}
                                        onKeyDown={e => {
                                            if (e.key === 'Enter') handleUpdateTemplate(template.id, { name: e.currentTarget.value });
                                            if (e.key === 'Escape') setEditingTemplateId(null);
                                        }}
                                        onClick={e => e.stopPropagation()}
                                    />
                                ) : (
                                    <h3 className={`font-medium truncate ${selectedTemplate?.id === template.id ? 'text-blue-900' : 'text-gray-700'}`}>
                                        {template.name}
                                    </h3>
                                )}
                                {template.is_default && <span className="text-[10px] uppercase font-bold text-green-600">Default</span>}
                            </div>

                            <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                {!template.is_default && (
                                    <button
                                        onClick={(e) => { e.stopPropagation(); handleSetDefaultTemplate(template); }}
                                        className="p-1 text-gray-400 hover:text-yellow-500"
                                        title="Set as Default"
                                    >
                                        <Star size={14} />
                                    </button>
                                )}
                                <button
                                    onClick={(e) => { e.stopPropagation(); setEditingTemplateId(template.id); }}
                                    className="p-1 text-gray-400 hover:text-blue-600"
                                >
                                    <Edit2 size={14} />
                                </button>
                                {!template.is_default && (
                                    <button
                                        onClick={(e) => { e.stopPropagation(); handleDeleteTemplate(template.id, template.is_default); }}
                                        className="p-1 text-gray-400 hover:text-red-600"
                                    >
                                        <Trash2 size={14} />
                                    </button>
                                )}
                            </div>
                        </div>
                    ))}
                </div>
            </div>

            {/* Main Area: Stages */}
            <div className="flex-1 flex flex-col min-w-0 bg-white">
                {selectedTemplate ? (
                    <>
                        <div className="p-6 border-b border-gray-200 flex justify-between items-center bg-white">
                            <div>
                                <h1 className="text-2xl font-bold text-gray-900">{selectedTemplate.name}</h1>
                                <p className="text-gray-500 text-sm mt-1">Manage stages for this pipeline.</p>
                            </div>
                            <button
                                onClick={() => setIsAdding(true)}
                                className="flex items-center gap-2 px-4 py-2 bg-[#00C853] text-white rounded-lg hover:bg-[#00b54b] transition-colors shadow-sm"
                            >
                                <Plus size={18} />
                                Add Stage
                            </button>
                        </div>

                        <div className="flex-1 overflow-y-auto p-6 bg-gray-50">
                            <div className="max-w-3xl mx-auto space-y-4">

                                {loading ? (
                                    <div className="text-center py-10 text-gray-500">Loading stages...</div>
                                ) : (
                                    <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                                        <div className="p-4 bg-gray-50 border-b border-gray-200 flex items-center gap-2 text-sm text-gray-600">
                                            <AlertCircle size={16} />
                                            <span>Drag stages to reorder the candidate flow.</span>
                                        </div>
                                        <div className="divide-y divide-gray-100">
                                            {stages.length === 0 && !isAdding && (
                                                <div className="p-8 text-center text-gray-500">
                                                    No stages yet. Add one to get started!
                                                </div>
                                            )}

                                            {stages.map((stage, index) => (
                                                <div
                                                    key={stage.id}
                                                    draggable
                                                    onDragStart={(e) => handleDragStart(e, index)}
                                                    onDragEnter={(e) => handleDragEnter(e, index)}
                                                    onDragEnd={handleDragEnd}
                                                    onDragOver={(e) => e.preventDefault()}
                                                    className="flex items-center justify-between p-4 hover:bg-gray-50 transition-colors group cursor-move bg-white"
                                                >
                                                    <div className="flex items-center gap-4 flex-1">
                                                        <GripVertical className="text-gray-300 group-hover:text-gray-500 cursor-grab" size={20} />
                                                        <div
                                                            className="w-4 h-4 rounded-full border border-gray-200"
                                                            style={{ backgroundColor: stage.color }}
                                                            title="Stage Color"
                                                        />
                                                        {editingId === stage.id ? (
                                                            <input
                                                                autoFocus
                                                                type="text"
                                                                defaultValue={stage.name}
                                                                onBlur={(e) => handleUpdateStage(stage.id, { name: e.target.value })}
                                                                onKeyDown={(e) => {
                                                                    if (e.key === 'Enter') handleUpdateStage(stage.id, { name: e.currentTarget.value });
                                                                    if (e.key === 'Escape') setEditingId(null);
                                                                }}
                                                                className="flex-1 px-2 py-1 border border-gray-300 rounded focus:border-blue-500 focus:outline-none"
                                                            />
                                                        ) : (
                                                            <span
                                                                className="font-medium text-gray-900 cursor-pointer hover:underline decoration-dashed"
                                                                onClick={() => setEditingId(stage.id)}
                                                                title="Click to rename"
                                                            >
                                                                {stage.name}
                                                            </span>
                                                        )}
                                                        {stage.is_default && (
                                                            <span className="text-xs bg-gray-100 text-gray-500 px-2 py-0.5 rounded-full">Default</span>
                                                        )}
                                                    </div>
                                                    <div className="flex items-center gap-2">
                                                        {!stage.is_default && (
                                                            <button
                                                                onClick={() => handleDeleteStage(stage.id, stage.is_default)}
                                                                className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-md transition-colors"
                                                                title="Delete Stage"
                                                            >
                                                                <Trash2 size={18} />
                                                            </button>
                                                        )}
                                                    </div>
                                                </div>
                                            ))}

                                            {isAdding && (
                                                <div className="p-4 flex items-center gap-4 bg-blue-50/30 animate-pulse-once">
                                                    <div className="w-8"></div>
                                                    <input
                                                        autoFocus
                                                        type="text"
                                                        placeholder="Stage Name"
                                                        value={newStageName}
                                                        onChange={(e) => setNewStageName(e.target.value)}
                                                        onKeyDown={(e) => {
                                                            if (e.key === 'Enter') handleAddStage();
                                                            if (e.key === 'Escape') setIsAdding(false);
                                                        }}
                                                        className="flex-1 px-3 py-2 border border-blue-300 rounded-md focus:border-blue-500 focus:outline-none"
                                                    />
                                                    <div className="flex items-center gap-2">
                                                        <button onClick={handleAddStage} className="p-1.5 text-green-600 hover:bg-green-50 rounded"><Check size={20} /></button>
                                                        <button onClick={() => setIsAdding(false)} className="p-1.5 text-red-500 hover:bg-red-50 rounded"><X size={20} /></button>
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>
                    </>
                ) : (
                    <div className="flex-1 flex flex-col items-center justify-center text-gray-400 p-8">
                        <LayoutTemplate size={48} className="mb-4 text-gray-300" />
                        <p className="text-lg font-medium">Select a pipeline template to manage stages</p>
                    </div>
                )}
            </div>
        </div>
    );
};

export default PipelineSettingsPage;
