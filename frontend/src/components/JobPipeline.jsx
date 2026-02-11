import React, { useState } from 'react';
import { DragDropContext, Droppable, Draggable } from '@hello-pangea/dnd';
import { MoreVertical, User, Settings } from 'lucide-react';

const JobPipeline = ({ pipelineConfig, onUpdatePipeline }) => {
    const [stages, setStages] = useState(pipelineConfig || []);

    const handleDragEnd = (result) => {
        if (!result.destination) return;

        const items = Array.from(stages);
        const [reorderedItem] = items.splice(result.source.index, 1);
        items.splice(result.destination.index, 0, reorderedItem);

        setStages(items);
        onUpdatePipeline(items);
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
                    <Droppable droppableId="pipeline-stages" direction="horizontal">
                        {(provided) => (
                            <div
                                {...provided.droppableProps}
                                ref={provided.innerRef}
                                className="flex h-full space-x-4 px-4 pb-4"
                            >
                                {stages.map((stage, index) => (
                                    <Draggable key={stage.id} draggableId={stage.id} index={index}>
                                        {(provided, snapshot) => (
                                            <div
                                                ref={provided.innerRef}
                                                {...provided.draggableProps}
                                                className={`flex-shrink-0 w-72 bg-gray-50 rounded-lg border flex flex-col ${stage.name === 'Hired' ? 'border-green-200 bg-green-50' : 'border-gray-200'
                                                    }`}
                                                style={{ ...provided.draggableProps.style }}
                                            >
                                                {/* Header */}
                                                <div
                                                    {...provided.dragHandleProps}
                                                    className={`p-3 border-b flex justify-between items-center ${stage.name === 'Hired' ? 'border-green-200' : 'border-gray-200'
                                                        }`}
                                                >
                                                    <div className="flex items-center">
                                                        <span className={`font-medium ${stage.name === 'Hired' ? 'text-green-800' : 'text-gray-700'
                                                            }`}>
                                                            {stage.name}
                                                        </span>
                                                        <span className="ml-2 bg-white px-2 py-0.5 rounded-full text-xs text-gray-500 border border-gray-100">
                                                            0
                                                        </span>
                                                    </div>
                                                    <MoreVertical size={16} className="text-gray-400 cursor-pointer hover:text-gray-600" />
                                                </div>

                                                {/* Body / Droppable for Candidates (Placeholder) */}
                                                <div className="flex-1 p-2 overflow-y-auto min-h-[100px]">
                                                    {/* Placeholder Candidate Card */}
                                                    {/* <div className="bg-white p-3 rounded border border-gray-100 shadow-sm mb-2">
                                <h4 className="font-medium text-gray-800 text-sm">John Doe</h4>
                                <p className="text-xs text-gray-500">Applied 2d ago</p>
                            </div> */}
                                                    <div className="h-full flex items-center justify-center text-gray-300 text-sm border-2 border-dashed border-gray-200 rounded">
                                                        Drop Candidates Here
                                                    </div>
                                                </div>
                                            </div>
                                        )}
                                    </Draggable>
                                ))}
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
