import React, { useState, useRef, useEffect } from 'react';
import { Columns } from 'lucide-react';

const ColumnSelector = ({ columns, visibleColumns, onToggle }) => {
    const [isOpen, setIsOpen] = useState(false);
    const dropdownRef = useRef(null);

    useEffect(() => {
        const handleClickOutside = (event) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
                setIsOpen(false);
            }
        };

        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    return (
        <div className="relative" ref={dropdownRef}>
            <button
                onClick={() => setIsOpen(!isOpen)}
                className="flex items-center px-4 py-2 border border-gray-200 rounded-md text-gray-600 hover:bg-gray-50 bg-white transition-colors text-sm"
                title="Customize Columns"
            >
                <Columns size={18} className="mr-2" />
                Columns
            </button>

            {isOpen && (
                <div className="absolute right-0 mt-2 w-56 bg-white rounded-md shadow-lg z-50 border border-gray-100 py-2">
                    <div className="px-4 py-2 border-b border-gray-100">
                        <h4 className="text-xs font-semibold text-gray-500 uppercase">Visible Columns</h4>
                    </div>
                    <div className="max-h-64 overflow-y-auto">
                        {columns.map((column) => (
                            <label
                                key={column.id}
                                className="flex items-center px-4 py-2 hover:bg-gray-50 cursor-pointer"
                            >
                                <input
                                    type="checkbox"
                                    checked={visibleColumns.includes(column.id)}
                                    onChange={() => onToggle(column.id)}
                                    disabled={column.required}
                                    className="h-4 w-4 text-[#00C853] focus:ring-[#00C853] border-gray-300 rounded"
                                />
                                <span className="ml-3 text-sm text-gray-700">{column.label}</span>
                            </label>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
};

export default ColumnSelector;
