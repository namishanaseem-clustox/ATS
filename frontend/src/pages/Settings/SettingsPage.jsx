import React from 'react';
import { useNavigate } from 'react-router-dom';
import { User, Bell, Palette, ChevronRight } from 'lucide-react';
import Breadcrumb from '../../components/Breadcrumb';

const SETTINGS_CARDS = [
    {
        title: 'My Profile',
        description: 'Update your name, email address, and password.',
        icon: User,
        path: '/settings/profile',
        color: 'text-blue-600',
        bg: 'bg-blue-50',
    },
    {
        title: 'Notifications',
        description: 'Choose which events trigger email or in-app alerts.',
        icon: Bell,
        path: '/settings/notifications',
        color: 'text-yellow-600',
        bg: 'bg-yellow-50',
    },
    {
        title: 'Appearance',
        description: 'Set your timezone, date format, and language.',
        icon: Palette,
        path: '/settings/appearance',
        color: 'text-purple-600',
        bg: 'bg-purple-50',
    },
];

const SettingsPage = () => {
    const navigate = useNavigate();

    return (
        <div className="p-8 max-w-4xl mx-auto">
            <Breadcrumb items={[{ label: 'Settings' }]} />
            <div className="mb-8">
                <h1 className="text-2xl font-bold text-gray-800">Settings</h1>
                <p className="text-gray-500 mt-1">Manage your personal preferences and account details.</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {SETTINGS_CARDS.map((card) => {
                    const Icon = card.icon;
                    return (
                        <button
                            key={card.path}
                            onClick={() => navigate(card.path)}
                            className="flex items-center p-5 bg-white rounded-lg shadow-sm border border-gray-100 hover:shadow-md hover:border-gray-200 transition-all text-left group"
                        >
                            <div className={`flex-shrink-0 w-12 h-12 rounded-lg flex items-center justify-center ${card.bg} mr-4`}>
                                <Icon size={22} className={card.color} />
                            </div>
                            <div className="flex-1 min-w-0">
                                <h3 className="text-sm font-semibold text-gray-800 group-hover:text-[#00C853] transition-colors">{card.title}</h3>
                                <p className="text-xs text-gray-500 mt-0.5">{card.description}</p>
                            </div>
                            <ChevronRight size={18} className="text-gray-300 group-hover:text-[#00C853] transition-colors ml-2 flex-shrink-0" />
                        </button>
                    );
                })}
            </div>
        </div>
    );
};

export default SettingsPage;
