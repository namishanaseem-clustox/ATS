import React, { useState, useEffect } from 'react';
import { StickyNote, Plus, User, Briefcase } from 'lucide-react';
import { getJobActivities, getCandidateActivities, deleteActivity } from '../api/activities';
import NoteModal from './NoteModal';

const NoteList = ({ jobId, candidateId }) => {
    const [notes, setNotes] = useState([]);
    const [loading, setLoading] = useState(true);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [selectedNote, setSelectedNote] = useState(null);

    useEffect(() => {
        fetchNotes();
    }, [jobId, candidateId]);

    const fetchNotes = async () => {
        try {
            setLoading(true);
            let data = [];
            if (candidateId) {
                data = await getCandidateActivities(candidateId);
            } else if (jobId) {
                data = await getJobActivities(jobId);
            }
            // Filter strictly for notes
            const filteredNotes = data.filter(item => item.activity_type === 'Note');

            // Sort by created_at desc (newest first)
            filteredNotes.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
            setNotes(filteredNotes);
        } catch (error) {
            console.error("Failed to fetch notes", error);
        } finally {
            setLoading(false);
        }
    };

    const handleDelete = async (id) => {
        if (!window.confirm("Delete this note?")) return;
        try {
            await deleteActivity(id);
            setNotes(prev => prev.filter(n => n.id !== id));
        } catch (error) {
            console.error("Failed to delete note", error);
        }
    };

    const handleSave = () => {
        fetchNotes();
        setIsModalOpen(false);
        setSelectedNote(null);
    };

    if (loading) return <div className="text-gray-500 text-center py-4">Loading notes...</div>;

    return (
        <div className="space-y-4">
            <div className="flex justify-between items-center">
                <h3 className="text-lg font-medium text-gray-900">Notes</h3>
                <button
                    onClick={() => { setSelectedNote(null); setIsModalOpen(true); }}
                    className="inline-flex items-center px-3 py-2 border border-transparent text-sm leading-4 font-medium rounded-md text-white bg-green-600 hover:bg-green-700"
                >
                    <Plus className="h-4 w-4 mr-1" />
                    Add Note
                </button>
            </div>

            {notes.length === 0 ? (
                <div className="text-center py-8 bg-gray-50 rounded-lg border-2 border-dashed border-gray-300">
                    <StickyNote className="mx-auto h-12 w-12 text-gray-400" />
                    <p className="mt-2 text-sm text-gray-500">No notes yet.</p>
                </div>
            ) : (
                <div className="space-y-4">
                    {notes.map((note) => (
                        <div key={note.id} className="bg-yellow-50 overflow-hidden shadow rounded-lg border border-yellow-200 relative">
                            <div className="px-4 py-3 border-b border-yellow-200 bg-yellow-100 flex justify-between items-start">
                                <div>
                                    <h4 className="text-sm font-medium text-yellow-900">{note.title}</h4>
                                    <p className="text-xs text-yellow-700 mt-0.5">
                                        {new Date(note.created_at).toLocaleDateString()}
                                    </p>
                                </div>
                                <div className="flex space-x-1">
                                    <button
                                        onClick={() => { setSelectedNote(note); setIsModalOpen(true); }}
                                        className="text-yellow-600 hover:text-yellow-800 p-1"
                                    >
                                        Edit
                                    </button>
                                    <button
                                        onClick={() => handleDelete(note.id)}
                                        className="text-red-400 hover:text-red-600 p-1"
                                    >
                                        ×
                                    </button>
                                </div>
                            </div>
                            <div className="px-4 py-3">
                                {/* Context Badges */}
                                <div className="flex flex-wrap gap-2 mb-2">
                                    {!candidateId && note.candidate && (
                                        <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-white text-gray-800 border border-gray-200">
                                            <User className="mr-1 h-3 w-3" />
                                            {note.candidate.first_name} {note.candidate.last_name}
                                        </span>
                                    )}
                                    {!jobId && note.job && (
                                        <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-white text-gray-800 border border-gray-200">
                                            <Briefcase className="mr-1 h-3 w-3" />
                                            {note.job.title}
                                        </span>
                                    )}
                                </div>
                                <div className="text-sm text-gray-800 whitespace-pre-wrap max-h-60 overflow-y-auto">
                                    {note.description}
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            )}

            <NoteModal
                isOpen={isModalOpen}
                onClose={() => setIsModalOpen(false)}
                note={selectedNote}
                jobId={jobId}
                candidateId={candidateId}
                onSave={handleSave}
            />
        </div>
    );
};

export default NoteList;
