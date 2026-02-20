import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { getMyPreferences, updateMyPreferences } from '../../api/preferences';
import Breadcrumb from '../../components/Breadcrumb';
import CustomSelect from '../../components/CustomSelect';
import { Save, ArrowLeft } from 'lucide-react';

const TIMEZONES = [
    'UTC', 'Asia/Karachi', 'Asia/Kolkata', 'Asia/Dubai', 'Asia/Singapore',
    'Europe/London', 'Europe/Berlin', 'America/New_York', 'America/Chicago',
    'America/Denver', 'America/Los_Angeles', 'Australia/Sydney',
].map(tz => ({ value: tz, label: tz }));

const DATE_FORMATS = [
    { value: 'DD/MM/YYYY', label: 'DD/MM/YYYY (e.g. 20/02/2026)' },
    { value: 'MM/DD/YYYY', label: 'MM/DD/YYYY (e.g. 02/20/2026)' },
    { value: 'YYYY-MM-DD', label: 'YYYY-MM-DD (e.g. 2026-02-20)' },
];

const LANGUAGES = [
    { value: 'en', label: 'English' },
];

const AppearanceSettings = () => {
    const navigate = useNavigate();
    const [prefs, setPrefs] = useState(null);
    const [saving, setSaving] = useState(false);
    const [saved, setSaved] = useState(false);

    useEffect(() => {
        getMyPreferences().then(setPrefs).catch(console.error);
    }, []);

    const handleChange = (e) => {
        const { name, value } = e.target;
        setPrefs(prev => ({ ...prev, [name]: value }));
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
            console.error('Failed to save appearance preferences', err);
        } finally {
            setSaving(false);
        }
    };

    if (!prefs) return <div className="p-8 text-gray-500">Loading…</div>;

    return (
        <div className="p-8 max-w-2xl mx-auto">
            <Breadcrumb items={[{ label: 'Settings', to: '/settings' }, { label: 'Appearance' }]} />
            <div className="mb-6 flex items-center gap-3">
                <button onClick={() => navigate('/settings')} className="text-gray-400 hover:text-gray-600 transition-colors">
                    <ArrowLeft size={20} />
                </button>
                <div>
                    <h1 className="text-2xl font-bold text-gray-800">Appearance</h1>
                    <p className="text-gray-500 text-sm mt-0.5">Set your timezone, date format, and display language.</p>
                </div>
            </div>

            <div className="bg-white rounded-lg shadow-sm border border-gray-100 p-6 space-y-5">
                <CustomSelect
                    label="Timezone"
                    name="timezone"
                    value={prefs.timezone}
                    onChange={handleChange}
                    options={TIMEZONES}
                />
                <CustomSelect
                    label="Date Format"
                    name="date_format"
                    value={prefs.date_format}
                    onChange={handleChange}
                    options={DATE_FORMATS}
                />
                <CustomSelect
                    label="Language"
                    name="language"
                    value={prefs.language}
                    onChange={handleChange}
                    options={LANGUAGES}
                />
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

export default AppearanceSettings;
