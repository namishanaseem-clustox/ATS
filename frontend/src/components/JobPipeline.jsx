import React, { useState, useEffect } from 'react';
import { DragDropContext, Droppable, Draggable } from '@hello-pangea/dnd';
import { User, RefreshCw, ChevronDown, Check } from 'lucide-react';
import ScoreModal from './ScoreModal';
import { updateCandidateScore, syncPipelineFromTemplate, changePipelineTemplate } from '../api/jobs';
import { getPipelineTemplates } from '../api/pipeline';
import { useParams } from 'react-router-dom';
import { triggerConfetti } from '../utils/confetti';

const JobPipeline = ({ pipelineConfig, candidates = [], onUpdatePipeline, onMoveCandidate, scorecardTemplateId = null, pipelineTemplateId = null }) => {
    const { id: jobId } = useParams();
    const [stages, setStages] = useState(pipelineConfig || []);
    const [scoringCandidate, setScoringCandidate] = useState(null);
    const [isScoreModalOpen, setIsScoreModalOpen] = useState(false);

    // Pipeline template change state
    const [templates, setTemplates] = useState([]);
    const [selectedTemplateId, setSelectedTemplateId] = useState(pipelineTemplateId);
    const [isChangingTemplate, setIsChangingTemplate] = useState(false);
    const [isSyncing, setIsSyncing] = useState(false);
    const [syncMsg, setSyncMsg] = useState(null);
    const [showTemplateDropdown, setShowTemplateDropdown] = useState(false);

    useEffect(() => {
        setStages(pipelineConfig || []);
    }, [pipelineConfig]);

    useEffect(() => {
        setSelectedTemplateId(pipelineTemplateId);
    }, [pipelineTemplateId]);

    useEffect(() => {
        getPipelineTemplates().then(setTemplates).catch(() => { });
    }, []);

    const showMsg = (msg, isError = false) => {
        setSyncMsg({ msg, isError });
        setTimeout(() => setSyncMsg(null), 3000);
    };

    const handleSync = async () => {
        setIsSyncing(true);
        try {
            const updated = await syncPipelineFromTemplate(jobId);
            setStages(updated.pipeline_config || []);
            onUpdatePipeline && onUpdatePipeline(updated.pipeline_config);
            showMsg('Pipeline synced from template ✓');
        } catch (err) {
            showMsg(err?.response?.data?.detail || 'Sync failed', true);
        } finally {
            setIsSyncing(false);
        }
    };

    const handleChangeTemplate = async (templateId) => {
        setShowTemplateDropdown(false);
        if (templateId === selectedTemplateId) return;
        if (!window.confirm('Changing the pipeline template will overwrite this job\'s current pipeline stages. Candidate positions will be cleared. Continue?')) return;
        setIsChangingTemplate(true);
        try {
            const updated = await changePipelineTemplate(jobId, templateId);
            setStages(updated.pipeline_config || []);
            setSelectedTemplateId(templateId);
            onUpdatePipeline && onUpdatePipeline(updated.pipeline_config);
            showMsg('Pipeline template changed ✓');
        } catch (err) {
            showMsg(err?.response?.data?.detail || 'Failed to change template', true);
        } finally {
            setIsChangingTemplate(false);
        }
    };

    const handleDragEnd = (result) => {
        const { source, destination, type, draggableId } = result;

        if (!destination) return;

        if (source.droppableId === destination.droppableId && source.index === destination.index) return;

        // Handle Stage Reordering
        if (type === 'STAGE') {
            const items = Array.from(stages);
            const [reorderedItem] = items.splice(source.index, 1);
            items.splice(destination.index, 0, reorderedItem);

            setStages(items);
            onUpdatePipeline(items);
            return;
        }

        // Handle Candidate Moving
        if (type === 'CANDIDATE') {
            const newStageId = destination.droppableId;
            const destStage = stages.find(s => s.id === newStageId);

            if (source.droppableId !== destination.droppableId) {
                if (destStage && destStage.name === 'Hired') {
                    triggerConfetti();
                }
                onMoveCandidate(draggableId, newStageId);
            }
        }
    };

    const getCandidatesForStage = (stageId, stageIndex) => {
        // Build a set of ALL known stage identifiers (IDs and names) so we can detect orphaned candidates
        const allStageIdentifiers = new Set(
            stages.flatMap(s => [s.id, s.name].filter(Boolean))
        );

        const stage = stages.find(s => s.id === stageId);
        const directMatches = candidates.filter(app =>
            app.current_stage === stageId ||
            (stage && app.current_stage === stage.name)
        );

        if (stageIndex === 0) {
            // Also collect candidates whose current_stage doesn't match ANY stage id or name
            // (e.g. legacy 'new' string when pipeline uses UUIDs)
            const orphaned = candidates.filter(app =>
                !allStageIdentifiers.has(app.current_stage) &&
                !directMatches.some(m => m.id === app.id)
            );
            return [...directMatches, ...orphaned];
        }

        return directMatches;
    };

    const handleScoreClick = (e, app) => {
        e.stopPropagation();
        setScoringCandidate(app);
        setIsScoreModalOpen(true);
    };

    const handleSaveScore = async (scoreData) => {
        if (!scoringCandidate) return;
        try {
            await updateCandidateScore(jobId, scoringCandidate.candidate.id, scoreData);
            scoringCandidate.score_details = scoreData;
            const numericScores = Object.entries(scoreData)
                .filter(([k, v]) => k !== 'recommendation' && typeof v === 'number')
                .map(([, v]) => v);
            const overall = numericScores.length
                ? (numericScores.reduce((a, b) => a + b, 0) / numericScores.length).toFixed(1)
                : 0;
            scoringCandidate.overall_score = overall;
            scoringCandidate.recommendation = scoreData.recommendation;

            setIsScoreModalOpen(false);
            setScoringCandidate(null);
        } catch (error) {
            console.error('Failed to save score', error);
            alert('Failed to save score');
        }
    };

    const currentTemplate = templates.find(t => t.id === selectedTemplateId);

    return (
        <div className="h-full flex flex-col">
            {/* Pipeline Toolbar */}
            <div className="flex justify-between items-center mb-3 px-4 py-2 border-b border-gray-100 bg-white flex-shrink-0">
                <div className="flex items-center gap-2">
                    <h3 className="text-base font-semibold text-gray-800">Pipeline</h3>
                    {/* Template selector */}
                    <div className="relative">
                        <button
                            onClick={() => setShowTemplateDropdown(d => !d)}
                            className="flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium text-gray-600 bg-gray-100 hover:bg-gray-200 rounded-md border border-gray-200 transition-colors"
                        >
                            <span className="max-w-[140px] truncate">{currentTemplate?.name || 'Default pipeline'}</span>
                            <ChevronDown size={12} />
                        </button>
                        {showTemplateDropdown && (
                            <>
                                <div className="fixed inset-0 z-10" onClick={() => setShowTemplateDropdown(false)} />
                                <div className="absolute left-0 mt-1 w-56 bg-white border border-gray-200 rounded-lg shadow-lg z-20 py-1">
                                    <p className="px-3 py-1.5 text-[10px] uppercase font-bold text-gray-400 tracking-wide">Change Pipeline</p>
                                    {templates.map(t => (
                                        <button
                                            key={t.id}
                                            onClick={() => handleChangeTemplate(t.id)}
                                            disabled={isChangingTemplate}
                                            className="w-full flex items-center justify-between px-3 py-2 text-sm text-gray-700 hover:bg-gray-50 transition-colors"
                                        >
                                            <span className="truncate">{t.name}</span>
                                            {t.id === selectedTemplateId && <Check size={14} className="text-green-600 flex-shrink-0" />}
                                        </button>
                                    ))}
                                </div>
                            </>
                        )}
                    </div>
                </div>

                <div className="flex items-center gap-2">
                    {syncMsg && (
                        <span className={`text-xs px-2 py-1 rounded ${syncMsg.isError ? 'bg-red-50 text-red-600' : 'bg-green-50 text-green-700'}`}>
                            {syncMsg.msg}
                        </span>
                    )}
                    {selectedTemplateId && (
                        <button
                            onClick={handleSync}
                            disabled={isSyncing}
                            title="Update this job's pipeline from the current template stages"
                            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-blue-700 bg-blue-50 hover:bg-blue-100 border border-blue-200 rounded-md transition-colors"
                        >
                            <RefreshCw size={13} className={isSyncing ? 'animate-spin' : ''} />
                            Sync from Template
                        </button>
                    )}
                </div>
            </div>

            <div className="flex-1 overflow-x-auto overflow-y-hidden pb-2">
                <DragDropContext onDragEnd={handleDragEnd}>
                    <Droppable droppableId="pipeline-stages" direction="horizontal" type="STAGE">
                        {(provided) => (
                            <div
                                {...provided.droppableProps}
                                ref={provided.innerRef}
                                className="flex h-full space-x-4 px-4 pb-4 min-w-max"
                            >
                                {stages.map((stage, index) => {
                                    const stageCandidates = getCandidatesForStage(stage.id, index);

                                    return (
                                        <Draggable key={stage.id} draggableId={stage.id} index={index}>
                                            {(provided, snapshot) => (
                                                <div
                                                    ref={provided.innerRef}
                                                    {...provided.draggableProps}
                                                    className={`flex-shrink-0 w-80 bg-gray-50 rounded-lg border flex flex-col max-h-full ${stage.name === 'Hired' ? 'border-green-200 bg-green-50' : 'border-gray-200'
                                                        }`}
                                                    style={{ ...provided.draggableProps.style }}
                                                >
                                                    {/* Header */}
                                                    <div
                                                        {...provided.dragHandleProps}
                                                        className={`p-3 border-b flex justify-between items-center bg-white rounded-t-lg ${stage.name === 'Hired' ? 'border-green-200' : 'border-gray-200'
                                                            }`}
                                                    >
                                                        <div className="flex items-center">
                                                            {stage.color && (
                                                                <div className="w-2.5 h-2.5 rounded-full mr-2 flex-shrink-0" style={{ backgroundColor: stage.color }} />
                                                            )}
                                                            <span className={`font-medium ${stage.name === 'Hired' ? 'text-green-800' : 'text-gray-700'
                                                                }`}>
                                                                {stage.name}
                                                            </span>
                                                            <span className="ml-2 bg-gray-100 px-2 py-0.5 rounded-full text-xs text-gray-600 border border-gray-200">
                                                                {stageCandidates.length}
                                                            </span>
                                                        </div>
                                                    </div>

                                                    {/* Candidate List Droppable */}
                                                    <Droppable droppableId={stage.id} type="CANDIDATE">
                                                        {(provided, snapshot) => (
                                                            <div
                                                                ref={provided.innerRef}
                                                                {...provided.droppableProps}
                                                                className={`flex-1 p-2 overflow-y-auto min-h-[100px] transition-colors ${snapshot.isDraggingOver ? 'bg-gray-100' : ''
                                                                    }`}
                                                            >
                                                                {stageCandidates.map((app, index) => (
                                                                    <Draggable
                                                                        key={app.id}
                                                                        draggableId={app.candidate.id}
                                                                        index={index}
                                                                    >
                                                                        {(provided, snapshot) => (
                                                                            <div
                                                                                ref={provided.innerRef}
                                                                                {...provided.draggableProps}
                                                                                {...provided.dragHandleProps}
                                                                                className="bg-white p-3 rounded border border-gray-200 shadow-sm mb-3 hover:shadow-md transition-shadow cursor-grab active:cursor-grabbing group relative"
                                                                                style={{ ...provided.draggableProps.style }}
                                                                            >
                                                                                <div className="flex justify-between items-start mb-2">
                                                                                    <h4 className="font-medium text-gray-800 text-sm truncate pr-6" title={`${app.candidate.first_name} ${app.candidate.last_name}`}>
                                                                                        {app.candidate.first_name} {app.candidate.last_name}
                                                                                    </h4>


                                                                                </div>
                                                                                <div className="flex items-center text-xs text-gray-500 mb-2">
                                                                                    <User size={12} className="mr-1" />
                                                                                    {app.candidate.current_position || 'No Title'}
                                                                                </div>

                                                                                {/* Score Display */}
                                                                                <div className="flex gap-2 mb-2">
                                                                                    {app.overall_score && (
                                                                                        <div className="flex items-center bg-yellow-50 px-2 py-1 rounded w-fit">
                                                                                            <Star size={12} className="text-yellow-500 mr-1 fill-current" />
                                                                                            <span className="text-xs font-bold text-gray-700">{app.overall_score}</span>
                                                                                            {app.recommendation && (
                                                                                                <span className={`text-[10px] ml-2 px-1 rounded ${app.recommendation.includes('Yes') ? 'bg-green-100 text-green-700' :
                                                                                                    app.recommendation.includes('No') ? 'bg-red-100 text-red-700' : 'bg-gray-100 text-gray-600'
                                                                                                    }`}>
                                                                                                    {app.recommendation}
                                                                                                </span>
                                                                                            )}
                                                                                        </div>
                                                                                    )}
                                                                                </div>

                                                                                <div className="flex justify-between items-center mt-2 pt-2 border-t border-gray-50">
                                                                                    <span className="text-[10px] text-gray-400">
                                                                                        {new Date(app.applied_at).toLocaleDateString()}
                                                                                    </span>
                                                                                </div>
                                                                            </div>
                                                                        )}
                                                                    </Draggable>
                                                                ))}
                                                                {provided.placeholder}
                                                            </div>
                                                        )}
                                                    </Droppable>
                                                </div>
                                            )}
                                        </Draggable>
                                    );
                                })}
                                {provided.placeholder}
                            </div>
                        )}
                    </Droppable>
                </DragDropContext>
            </div>

            <ScoreModal
                isOpen={isScoreModalOpen}
                onClose={() => setIsScoreModalOpen(false)}
                candidateName={scoringCandidate ? `${scoringCandidate.candidate.first_name} ${scoringCandidate.candidate.last_name}` : ''}
                initialData={scoringCandidate ? {
                    ...scoringCandidate.score_details,
                    recommendation: scoringCandidate.recommendation || 'Neutral'
                } : null}
                onSave={handleSaveScore}
                templateId={scorecardTemplateId}
            />

        </div>
    );
};

export default JobPipeline;
