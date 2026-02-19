import React, { useState, useEffect } from 'react';
import { DragDropContext, Droppable, Draggable } from '@hello-pangea/dnd';
import { Plus, Trash2, Edit2, Save, X, Star, ChevronDown, ChevronUp, GripVertical, Check } from 'lucide-react';
import { getScorecardTemplates, createScorecardTemplate, updateScorecardTemplate, deleteScorecardTemplate } from '../api/scorecards';

const DEFAULT_SECTIONS = [
    { key: 'technical_score', label: 'Technical Skills', weight: 1 },
    { key: 'communication_score', label: 'Communication', weight: 1 },
    { key: 'culture_fit_score', label: 'Culture Fit', weight: 1 },
    { key: 'problem_solving_score', label: 'Problem Solving', weight: 1 },
];

const SectionEditor = ({ sections, onChange }) => {
    const addSection = () => {
        const newKey = `criterion_${Date.now()}`;
        onChange([...sections, { key: newKey, label: 'New Criterion', weight: 1 }]);
    };

    const removeSection = (idx) => onChange(sections.filter((_, i) => i !== idx));

    const updateSection = (idx, field, value) => {
        const updated = sections.map((s, i) => i === idx ? { ...s, [field]: value } : s);
        onChange(updated);
    };

    const handleDragEnd = (result) => {
        if (!result.destination) return;

        const items = Array.from(sections);
        const [reorderedItem] = items.splice(result.source.index, 1);
        items.splice(result.destination.index, 0, reorderedItem);

        onChange(items);
    };

    return (
        <DragDropContext onDragEnd={handleDragEnd}>
            <Droppable droppableId="scorecard-sections">
                {(provided) => (
                    <div {...provided.droppableProps} ref={provided.innerRef} className="space-y-2">
                        {sections.map((section, idx) => (
                            <Draggable key={section.key} draggableId={section.key} index={idx}>
                                {(provided) => (
                                    <div
                                        ref={provided.innerRef}
                                        {...provided.draggableProps}
                                        className="flex items-center gap-2 p-2 bg-gray-50 rounded-md border border-gray-200"
                                    >
                                        <div {...provided.dragHandleProps} className="cursor-grab active:cursor-grabbing">
                                            <GripVertical className="h-4 w-4 text-gray-400 flex-shrink-0" />
                                        </div>
                                        <input
                                            type="text"
                                            value={section.label}
                                            onChange={(e) => updateSection(idx, 'label', e.target.value)}
                                            className="flex-1 text-sm border-0 bg-transparent focus:outline-none focus:ring-1 focus:ring-green-500 rounded px-1"
                                            placeholder="Criterion label..."
                                        />
                                        <div className="flex items-center gap-1 text-xs text-gray-500">
                                            <span>Weight:</span>
                                            <input
                                                type="number"
                                                min="1"
                                                max="5"
                                                value={section.weight}
                                                onChange={(e) => updateSection(idx, 'weight', parseInt(e.target.value) || 1)}
                                                className="w-12 text-center border border-gray-300 rounded text-xs py-0.5"
                                            />
                                        </div>
                                        <button onClick={() => removeSection(idx)} className="text-red-400 hover:text-red-600">
                                            <X className="h-4 w-4" />
                                        </button>
                                    </div>
                                )}
                            </Draggable>
                        ))}
                        {provided.placeholder}
                        <button
                            onClick={addSection}
                            className="w-full flex items-center justify-center gap-2 py-2 text-sm text-green-600 hover:text-green-700 border border-dashed border-green-300 rounded-md hover:bg-green-50 transition-colors"
                        >
                            <Plus className="h-4 w-4" />
                            Add Criterion
                        </button>
                    </div>
                )}
            </Droppable>
        </DragDropContext>
    );
};

const TemplateCard = ({ template, onEdit, onDelete }) => {
    const [expanded, setExpanded] = useState(false);

    return (
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
            <div className="px-5 py-4 flex items-center justify-between">
                <div className="flex items-center gap-3">
                    <div className="p-2 bg-green-50 rounded-lg">
                        <Star className="h-5 w-5 text-green-600" />
                    </div>
                    <div>
                        <div className="flex items-center gap-2">
                            <h3 className="font-semibold text-gray-900">{template.name}</h3>
                            {template.is_default && (
                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-700">
                                    <Check className="h-3 w-3" /> Default
                                </span>
                            )}
                        </div>
                        {template.description && (
                            <p className="text-sm text-gray-500 mt-0.5">{template.description}</p>
                        )}
                        <p className="text-xs text-gray-400 mt-1">{template.sections?.length || 0} criteria</p>
                    </div>
                </div>
                <div className="flex items-center gap-2">
                    <button
                        onClick={() => setExpanded(!expanded)}
                        className="p-1.5 text-gray-400 hover:text-gray-700 hover:bg-gray-100 rounded"
                    >
                        {expanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                    </button>
                    <button onClick={() => onEdit(template)} className="p-1.5 text-blue-500 hover:text-blue-700 hover:bg-blue-50 rounded">
                        <Edit2 className="h-4 w-4" />
                    </button>
                    <button onClick={() => onDelete(template.id)} className="p-1.5 text-red-400 hover:text-red-600 hover:bg-red-50 rounded">
                        <Trash2 className="h-4 w-4" />
                    </button>
                </div>
            </div>
            {expanded && (
                <div className="px-5 pb-4 pt-0 border-t border-gray-100">
                    <div className="mt-3 grid grid-cols-2 gap-2">
                        {template.sections?.map((s, i) => (
                            <div key={i} className="flex items-center justify-between text-sm px-3 py-2 bg-gray-50 rounded-md">
                                <span className="text-gray-700">{s.label}</span>
                                <span className="text-xs text-gray-400">×{s.weight}</span>
                            </div>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
};

const TemplateFormModal = ({ isOpen, onClose, template, onSave }) => {
    const [name, setName] = useState('');
    const [description, setDescription] = useState('');
    const [isDefault, setIsDefault] = useState(false);
    const [sections, setSections] = useState(DEFAULT_SECTIONS);
    const [saving, setSaving] = useState(false);

    useEffect(() => {
        if (template) {
            setName(template.name);
            setDescription(template.description || '');
            setIsDefault(template.is_default || false);
            setSections(template.sections || DEFAULT_SECTIONS);
        } else {
            setName('');
            setDescription('');
            setIsDefault(false);
            setSections(DEFAULT_SECTIONS);
        }
    }, [template, isOpen]);

    const handleSave = async () => {
        if (!name.trim()) return alert('Template name is required');
        setSaving(true);
        try {
            const payload = { name: name.trim(), description: description.trim(), is_default: isDefault, sections };
            if (template) {
                await updateScorecardTemplate(template.id, payload);
            } else {
                await createScorecardTemplate(payload);
            }
            onSave();
            onClose();
        } catch (err) {
            console.error(err);
            alert('Failed to save template');
        } finally {
            setSaving(false);
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 overflow-y-auto">
            <div className="flex items-start justify-center min-h-screen pt-12 px-4 pb-20">
                <div className="fixed inset-0 bg-gray-500 opacity-75" onClick={onClose} />
                <div className="relative bg-white rounded-xl shadow-xl max-w-lg w-full p-6 z-10">
                    <div className="flex justify-between items-center mb-5">
                        <h2 className="text-lg font-semibold text-gray-900">
                            {template ? 'Edit Template' : 'New Scorecard Template'}
                        </h2>
                        <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
                            <X className="h-5 w-5" />
                        </button>
                    </div>

                    <div className="space-y-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Template Name *</label>
                            <input
                                type="text"
                                value={name}
                                onChange={(e) => setName(e.target.value)}
                                placeholder="e.g. Engineering Interview"
                                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                            <input
                                type="text"
                                value={description}
                                onChange={(e) => setDescription(e.target.value)}
                                placeholder="e.g. Used for technical roles"
                                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
                            />
                        </div>
                        <div className="flex items-center gap-2">
                            <input
                                type="checkbox"
                                id="isDefault"
                                checked={isDefault}
                                onChange={(e) => setIsDefault(e.target.checked)}
                                className="rounded text-green-600"
                            />
                            <label htmlFor="isDefault" className="text-sm text-gray-700">Set as default template</label>
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">Scoring Criteria</label>
                            <SectionEditor sections={sections} onChange={setSections} />
                        </div>
                    </div>

                    <div className="flex gap-3 mt-6">
                        <button
                            onClick={handleSave}
                            disabled={saving}
                            className="flex-1 flex items-center justify-center gap-2 bg-green-600 text-white py-2 px-4 rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50 text-sm font-medium"
                        >
                            <Save className="h-4 w-4" />
                            {saving ? 'Saving...' : (template ? 'Update Template' : 'Create Template')}
                        </button>
                        <button onClick={onClose} className="px-4 py-2 border border-gray-300 rounded-lg text-sm text-gray-700 hover:bg-gray-50">
                            Cancel
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

const ScorecardTemplatesPage = () => {
    const [templates, setTemplates] = useState([]);
    const [loading, setLoading] = useState(true);
    const [modalOpen, setModalOpen] = useState(false);
    const [editingTemplate, setEditingTemplate] = useState(null);

    const fetchTemplates = async () => {
        setLoading(true);
        try {
            const data = await getScorecardTemplates();
            setTemplates(data);
        } catch (err) {
            console.error('Failed to load templates', err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => { fetchTemplates(); }, []);

    const handleEdit = (template) => {
        setEditingTemplate(template);
        setModalOpen(true);
    };

    const handleNew = () => {
        setEditingTemplate(null);
        setModalOpen(true);
    };

    const handleDelete = async (id) => {
        if (!confirm('Delete this scorecard template?')) return;
        try {
            await deleteScorecardTemplate(id);
            fetchTemplates();
        } catch (err) {
            alert('Failed to delete template');
        }
    };

    return (
        <div className="max-w-3xl mx-auto px-4 py-8">
            <div className="flex justify-between items-center mb-6">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900">Scorecard Templates</h1>
                    <p className="text-sm text-gray-500 mt-1">Define reusable interview scorecard templates for your team.</p>
                </div>
                <button
                    onClick={handleNew}
                    className="flex items-center gap-2 bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 text-sm font-medium transition-colors"
                >
                    <Plus className="h-4 w-4" />
                    New Template
                </button>
            </div>

            {loading ? (
                <div className="text-center text-gray-400 py-16">Loading templates...</div>
            ) : templates.length === 0 ? (
                <div className="text-center py-16 bg-white rounded-xl border border-dashed border-gray-300">
                    <Star className="h-12 w-12 text-gray-300 mx-auto mb-3" />
                    <h3 className="text-gray-500 font-medium">No templates yet</h3>
                    <p className="text-sm text-gray-400 mt-1 mb-4">Create a scorecard template to standardize candidate evaluation.</p>
                    <button
                        onClick={handleNew}
                        className="inline-flex items-center gap-2 bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 text-sm"
                    >
                        <Plus className="h-4 w-4" /> Create First Template
                    </button>
                </div>
            ) : (
                <div className="space-y-3">
                    {templates.map(t => (
                        <TemplateCard key={t.id} template={t} onEdit={handleEdit} onDelete={handleDelete} />
                    ))}
                </div>
            )}

            <TemplateFormModal
                isOpen={modalOpen}
                onClose={() => setModalOpen(false)}
                template={editingTemplate}
                onSave={fetchTemplates}
            />
        </div>
    );
};

export default ScorecardTemplatesPage;
