import React, { useState } from 'react';
import { DragDropContext, Droppable, Draggable } from '@hello-pangea/dnd';
import { MoreVertical, User, Settings, Star, MoreHorizontal } from 'lucide-react';
import ScoreModal from './ScoreModal';
import { updateCandidateScore } from '../api/jobs';
import { useParams } from 'react-router-dom';

const JobPipeline = ({ pipelineConfig, candidates = [], onUpdatePipeline, onMoveCandidate }) => {
    const { id: jobId } = useParams();
    const [stages, setStages] = useState(pipelineConfig || []);
    const [scoringCandidate, setScoringCandidate] = useState(null);
    const [isScoreModalOpen, setIsScoreModalOpen] = useState(false);
    const [refreshTrigger, setRefreshTrigger] = useState(0); // Simple way to force re-render if needed, though props should handle it

    // Local candidates state to handle optimistic updates for scores
    // But since candidates come from parent, we might need a way to notify parent or just update local list till refresh
    // For now, let's just rely on parent prop updates or force a refresh if possible. 
    // Actually, we can update the candidate object in the local scope variables if we can't easily trigger parent refresh from here without a new prop.
    // Let's assume we trigger a parent refresh or update the specific candidate in the candidates array if we could.
    // Since candidates is a prop, we can't mutate it. We'll rely on onMoveCandidate triggering a refresh? No, scoring is different.
    // Let's add an onCandidateUpdate prop to JobPipeline eventually, but for now we will just reload the page or use an internal hack?
    // Better: We should probably lift the state up, but for this task, I'll pass a callback if possible, or just refresh the window (crude but works for MVP).
    // Wait, I can just accept an onRefresh prop? Or I just don't verify persistent UI update immediately in this step?
    // Let's try to update the displayed candidates locally.

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
            if (source.droppableId !== destination.droppableId) {
                console.log("JobPipeline: Drag detected", draggableId, "to", newStageId);
                onMoveCandidate(draggableId, newStageId);
            }
        }
    };

    const getCandidatesForStage = (stageId) => {
        return candidates.filter(app => {
            const stage = stages.find(s => s.id === stageId);
            return app.current_stage === stageId || app.current_stage === stage.name;
        });
    };

    const handleScoreClick = (e, app) => {
        e.stopPropagation();
        setScoringCandidate(app);
        setIsScoreModalOpen(true);
    };

    const handleSaveScore = async (scoreData) => {
        if (!scoringCandidate) return;
        try {
            console.log("Sending score data:", JSON.stringify(scoreData, null, 2));
            await updateCandidateScore(jobId, scoringCandidate.candidate.id, scoreData);

            // Update local state to show score immediately (Optimistic-ish)
            scoringCandidate.score_details = scoreData;

            // Calc overall for display
            const scores = [
                scoreData.technical_score,
                scoreData.communication_score,
                scoreData.culture_fit_score,
                scoreData.problem_solving_score,
                scoreData.leadership_score
            ];
            const overall = (scores.reduce((a, b) => a + b, 0) / scores.length).toFixed(1);
            scoringCandidate.overall_score = overall;
            scoringCandidate.recommendation = scoreData.recommendation;

            setIsScoreModalOpen(false);
            setScoringCandidate(null);
            // Optionally call onRefresh if provided
        } catch (error) {
            console.error("Failed to save score", error);
            alert("Failed to save score");
        }
    };

    return (
        <div className="h-full flex flex-col">
            <div className="flex justify-between items-center mb-4 px-4">
                <h3 className="text-lg font-semibold text-gray-800">Pipeline Stages</h3>
                <button className="text-sm text-gray-500 hover:text-[#00C853] flex items-center">
                    <Settings size={14} className="mr-1" /> Configure
                </button>
            </div>

            <div className="flex-1 overflow-x-auto overflow-y-hidden">
                <DragDropContext onDragEnd={handleDragEnd}>
                    <Droppable droppableId="pipeline-stages" direction="horizontal" type="STAGE">
                        {(provided) => (
                            <div
                                {...provided.droppableProps}
                                ref={provided.innerRef}
                                className="flex h-full space-x-4 px-4 pb-4"
                            >
                                {stages.map((stage, index) => {
                                    const stageCandidates = getCandidatesForStage(stage.id);

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
                                                            <span className={`font-medium ${stage.name === 'Hired' ? 'text-green-800' : 'text-gray-700'
                                                                }`}>
                                                                {stage.name}
                                                            </span>
                                                            <span className="ml-2 bg-gray-100 px-2 py-0.5 rounded-full text-xs text-gray-600 border border-gray-200">
                                                                {stageCandidates.length}
                                                            </span>
                                                        </div>
                                                        <MoreVertical size={16} className="text-gray-400 cursor-pointer hover:text-gray-600" />
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
                                                                        draggableId={app.candidate.id} // Drag candidate ID
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

                                                                                    {/* Start Kebab Menu */}
                                                                                    <div className="absolute top-3 right-2">
                                                                                        <button
                                                                                            onClick={(e) => handleScoreClick(e, app)}
                                                                                            className="px-2 py-1 bg-white hover:bg-gray-50 text-gray-600 border border-gray-200 rounded text-xs font-medium flex items-center shadow-sm transition-colors"
                                                                                            title="Rate Candidate"
                                                                                        >
                                                                                            <Star size={12} className="mr-1 text-yellow-500" /> Rate
                                                                                        </button>
                                                                                    </div>
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
            />

        </div>
    );
};

export default JobPipeline;
