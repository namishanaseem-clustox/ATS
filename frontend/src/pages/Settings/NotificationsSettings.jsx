import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { getMyPreferences, updateMyPreferences } from '../../api/preferences';
import Breadcrumb from '../../components/Breadcrumb';
import { Save, ArrowLeft } from 'lucide-react';

const NOTIFICATION_OPTIONS = [
    { key: 'notify_new_candidate', label: 'New Candidate Added', description: 'When a candidate is added to a job you manage.' },
    { key: 'notify_activity_assigned', label: 'Activity Assigned to Me', description: 'When an interview or task is assigned to you.' },
    { key: 'notify_feedback_submitted', label: 'Feedback Submitted', description: 'When a scorecard or feedback is filled for a candidate.' },
    { key: 'notify_stage_change', label: 'Stage Change', description: "When a candidate's pipeline stage changes." },
];

const Toggle = ({ checked, onChange }) => (
    <button
        type="button"
        onClick={() => onChange(!checked)}
        className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${checked ? 'bg-[#00C853]' : 'bg-gray-200'}`}
    >
        <span className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform ${checked ? 'translate-x-6' : 'translate-x-1'}`} />
    </button>
);

const NotificationsSettings = () => {
    const navigate = useNavigate();
    const [prefs, setPrefs] = useState(null);
    const [saving, setSaving] = useState(false);
    const [saved, setSaved] = useState(false);

    useEffect(() => {
        getMyPreferences().then(setPrefs).catch(console.error);
    }, []);

    const handleToggle = (key, value) => {
        setPrefs(prev => ({ ...prev, [key]: value }));
    };

    const handleSave = async () => {
        setSaving(true);
        setSaved(false);
        try {
            const updated = await updateMyPreferences(prefs);
            setPrefs(updated);
            setSaved(true);
            setTimeout(() => setSaved(false), 3000);
        } catch (err) {
            console.error('Failed to save notifications preferences', err);
        } finally {
            setSaving(false);
        }
    };

    if (!prefs) return <div className="p-8 text-gray-500">Loading…</div>;

    return (
        <div className="p-8 max-w-2xl mx-auto">
            <Breadcrumb items={[{ label: 'Settings', to: '/settings' }, { label: 'Notifications' }]} />
            <div className="mb-6 flex items-center gap-3">
                <button onClick={() => navigate('/settings')} className="text-gray-400 hover:text-gray-600 transition-colors">
                    <ArrowLeft size={20} />
                </button>
                <div>
                    <h1 className="text-2xl font-bold text-gray-800">Notifications</h1>
                    <p className="text-gray-500 text-sm mt-0.5">Choose which events trigger notifications for you.</p>
                </div>
            </div>

            <div className="bg-white rounded-lg shadow-sm border border-gray-100 divide-y divide-gray-50">
                {NOTIFICATION_OPTIONS.map(({ key, label, description }) => (
                    <div key={key} className="flex items-center justify-between p-4">
                        <div>
                            <p className="text-sm font-medium text-gray-800">{label}</p>
                            <p className="text-xs text-gray-500 mt-0.5">{description}</p>
                        </div>
                        <Toggle checked={!!prefs[key]} onChange={(val) => handleToggle(key, val)} />
                    </div>
                ))}
            </div>

            <div className="flex justify-end mt-4 gap-3 items-center">
                {saved && <span className="text-sm text-green-600">Saved!</span>}
                <button
                    onClick={handleSave}
                    disabled={saving}
                    className="flex items-center gap-2 px-4 py-2 bg-[#00C853] text-white rounded-md text-sm font-medium hover:bg-green-700 transition-colors disabled:opacity-50"
                >
                    <Save size={16} />
                    {saving ? 'Saving…' : 'Save Changes'}
                </button>
            </div>
        </div>
    );
};

export default NotificationsSettings;
