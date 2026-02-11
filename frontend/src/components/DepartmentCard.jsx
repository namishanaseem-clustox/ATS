import React from 'react';
import { Users, Briefcase, MoreVertical, Edit, Trash2 } from 'lucide-react';
import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs) {
    return twMerge(clsx(inputs));
}

const DepartmentCard = ({ department, onEdit, onDelete }) => {
    const { name, owner_id, status, active_jobs_count, total_jobs_count, total_members_count, description } = department;
    const isActive = status === 'Active';
    const [showMenu, setShowMenu] = React.useState(false);
    const menuRef = React.useRef(null);

    React.useEffect(() => {
        const handleClickOutside = (event) => {
            if (menuRef.current && !menuRef.current.contains(event.target)) {
                setShowMenu(false);
            }
        };

        document.addEventListener('mousedown', handleClickOutside);
        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
        };
    }, []);

    return (
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 hover:shadow-md transition-shadow duration-200 relative group">
            <div className="flex justify-between items-start mb-4">
                <div>
                    <h3 className="text-lg font-semibold text-dark mb-1">{name}</h3>
                    <p className="text-sm text-grey mb-2">Owner ID: {owner_id || 'Unassigned'}</p>
                    {description && (
                        <p className="text-sm text-gray-500 line-clamp-2">{description}</p>
                    )}
                </div>
                <span className={cn(
                    "px-2.5 py-0.5 rounded-full text-xs font-medium",
                    isActive ? "bg-green-100 text-green-800" : "bg-gray-100 text-gray-800"
                )}>
                    {status}
                </span>
            </div>

            <div className="grid grid-cols-3 gap-2 mt-4">
                <button
                    onClick={(e) => {
                        e.stopPropagation();
                        window.location.href = `/jobs?dept=${department.id}&status=Published`;
                    }}
                    className="flex flex-col text-left hover:bg-green-50 p-2 rounded-md transition-colors group"
                >
                    <span className="text-[10px] text-grey uppercase tracking-wider mb-1">Active</span>
                    <div className="flex items-center text-dark font-medium group-hover:text-[#00C853] transition-colors">
                        <Briefcase className="w-4 h-4 mr-1.5 text-primary" />
                        {active_jobs_count}
                    </div>
                </button>
                <button
                    onClick={(e) => {
                        e.stopPropagation();
                        window.location.href = `/jobs?dept=${department.id}`;
                    }}
                    className="flex flex-col text-left hover:bg-green-50 p-2 rounded-md transition-colors group"
                >
                    <span className="text-[10px] text-grey uppercase tracking-wider mb-1">Total</span>
                    <div className="flex items-center text-dark font-medium group-hover:text-[#00C853] transition-colors">
                        <Briefcase className="w-4 h-4 mr-1.5 text-gray-400" />
                        {total_jobs_count}
                    </div>
                </button>
                <div className="flex flex-col p-2">
                    <span className="text-[10px] text-grey uppercase tracking-wider mb-1">Members</span>
                    <div className="flex items-center text-dark font-medium">
                        <Users className="w-4 h-4 mr-1.5 text-primary" />
                        {total_members_count}
                    </div>
                </div>
            </div>

            <div className="absolute top-4 right-4" ref={menuRef}>
                <button
                    onClick={() => setShowMenu(!showMenu)}
                    className="p-1 hover:bg-gray-100 rounded-md text-grey hover:text-dark transition-colors"
                >
                    <MoreVertical className="w-5 h-5" />
                </button>

                {showMenu && (
                    <div className="absolute right-0 mt-1 w-32 bg-white rounded-lg shadow-lg border border-gray-100 py-1 z-10">
                        <button
                            onClick={() => {
                                onEdit(department);
                                setShowMenu(false);
                            }}
                            className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 flex items-center gap-2"
                        >
                            <Edit className="w-3 h-3" /> Edit
                        </button>
                        <button
                            onClick={() => {
                                onDelete(department.id);
                                setShowMenu(false);
                            }}
                            className="w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-red-50 flex items-center gap-2"
                        >
                            <Trash2 className="w-3 h-3" /> Delete
                        </button>
                    </div>
                )}
            </div>

            <div className="mt-6 flex justify-end gap-2 border-t pt-4 border-gray-50">
                <button
                    onClick={() => onEdit(department)}
                    className="p-2 text-grey hover:text-primary hover:bg-green-50 rounded-md transition-colors"
                    title="Edit"
                >
                    <Edit className="w-4 h-4" />
                </button>
                <button
                    onClick={() => onDelete(department.id)}
                    className="p-2 text-grey hover:text-red-600 hover:bg-red-50 rounded-md transition-colors"
                    title="Delete"
                >
                    <Trash2 className="w-4 h-4" />
                </button>
            </div>
        </div>
    );
};

export default DepartmentCard;
