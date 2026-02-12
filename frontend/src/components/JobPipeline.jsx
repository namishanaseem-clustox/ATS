import React, { useState } from 'react';
import { DragDropContext, Droppable, Draggable } from '@hello-pangea/dnd';
import { MoreVertical, User, Settings } from 'lucide-react';

const JobPipeline = ({ pipelineConfig, candidates = [], onUpdatePipeline, onMoveCandidate }) => {
    const [stages, setStages] = useState(pipelineConfig || []);

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
            // Find the candidate
            // We optimized by lifting state to parent, so we just call the parent handler
            // destination.droppableId should be the stageId
            const newStageId = destination.droppableId;
            // draggableId is the candidateId (or applicationId)

            // Only trigger update if stage changed (reordering within stage not persisted yet)
            if (source.droppableId !== destination.droppableId) {
                onMoveCandidate(draggableId, newStageId);
            }
        }
    };

    // Helper to get candidates for a stage
    const getCandidatesForStage = (stageId) => {
        // Match by stage ID or Name (legacy vs new)
        // Ideally we stick to ID. The backend defaults use IDs like 'new', 'shortlisted'.
        // JobApplication.current_stage might store the Name or ID. 
        // Based on model: default="New". 
        // Let's assume it matches strict equality for now, or we might need to normalize.
        // The stages have "name" (Display) and "id" (Internal).
        return candidates.filter(app => {
            // Check matching ID or Name to be safe
            const stage = stages.find(s => s.id === stageId);
            return app.current_stage === stageId || app.current_stage === stage.name;
        });
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
                                                                                className="bg-white p-3 rounded border border-gray-200 shadow-sm mb-3 hover:shadow-md transition-shadow cursor-grab active:cursor-grabbing"
                                                                                style={{ ...provided.draggableProps.style }}
                                                                            >
                                                                                <div className="flex justify-between items-start mb-2">
                                                                                    <h4 className="font-medium text-gray-800 text-sm truncate" title={`${app.candidate.first_name} ${app.candidate.last_name}`}>
                                                                                        {app.candidate.first_name} {app.candidate.last_name}
                                                                                    </h4>
                                                                                    {/* Optional: Add quick actions or status dot */}
                                                                                </div>
                                                                                <div className="flex items-center text-xs text-gray-500 mb-2">
                                                                                    <User size={12} className="mr-1" />
                                                                                    {app.candidate.current_position || 'No Title'}
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
        </div>
    );
};

export default JobPipeline;
