import React, { useEffect, useRef, useState } from 'react';
import { Filter, X, Check } from 'lucide-react';

/**
 * FilterPanel — two-pane filter dropdown (categories left, options right).
 *
 * Props:
 *   filters:       [{ key, label, options: [{ value, label, count }] }]
 *   activeFilters: { [key]: string[] }
 *   onChange:      (key, newValues: string[]) => void
 *   onClear:       () => void
 */
const FilterPanel = ({ filters = [], activeFilters = {}, onChange, onClear, align = 'right' }) => {
    const [open, setOpen] = useState(false);
    const [activeGroup, setActiveGroup] = useState(filters[0]?.key ?? null);
    const ref = useRef(null);

    // Keep activeGroup valid when filters change
    useEffect(() => {
        if (filters.length && !filters.find(f => f.key === activeGroup)) {
            setActiveGroup(filters[0]?.key ?? null);
        }
    }, [filters]);

    // Close on outside click
    useEffect(() => {
        const handler = (e) => {
            if (ref.current && !ref.current.contains(e.target)) setOpen(false);
        };
        document.addEventListener('mousedown', handler);
        return () => document.removeEventListener('mousedown', handler);
    }, []);

    const totalActive = Object.values(activeFilters).reduce((sum, arr) => sum + arr.length, 0);

    const toggle = (key, value) => {
        const current = activeFilters[key] || [];
        const next = current.includes(value)
            ? current.filter(v => v !== value)
            : [...current, value];
        onChange(key, next);
    };

    const currentGroup = filters.find(f => f.key === activeGroup);

    return (
        <div className="relative" ref={ref}>
            {/* Trigger */}
            <button
                onClick={() => setOpen(o => !o)}
                className={`flex items-center gap-2 border px-4 py-2 rounded text-sm font-medium transition-colors shadow-sm ${totalActive > 0
                    ? 'bg-green-50 border-green-300 text-green-700'
                    : 'bg-white border-gray-300 text-gray-700 hover:bg-gray-50'
                    }`}
            >
                <Filter size={15} />
                Filters
                {totalActive > 0 && (
                    <span className="bg-[#00C853] text-white text-[10px] rounded-full h-5 w-5 flex items-center justify-center font-bold leading-none">
                        {totalActive}
                    </span>
                )}
            </button>

            {/* Two-pane dropdown */}
            {open && filters.length > 0 && (
                <div className={`absolute top-full ${align === 'right' ? 'right-0' : 'left-0'} mt-1.5 z-30 bg-white border border-gray-200 rounded-xl shadow-xl flex overflow-hidden`}
                    style={{ minWidth: 380 }}>

                    {/* Left pane — category list */}
                    <div className="w-36 bg-gray-50 border-r border-gray-100 flex flex-col py-2 flex-shrink-0">
                        <div className="px-3 pb-2 flex items-center justify-between">
                            <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Filters</span>
                            {totalActive > 0 && (
                                <button
                                    onClick={onClear}
                                    className="text-[10px] text-red-400 hover:text-red-600 font-medium flex items-center gap-0.5"
                                    title="Clear all filters"
                                >
                                    <X size={10} /> Clear
                                </button>
                            )}
                        </div>
                        {filters.map(group => {
                            const groupCount = (activeFilters[group.key] || []).length;
                            const isActive = activeGroup === group.key;
                            return (
                                <button
                                    key={group.key}
                                    onClick={() => setActiveGroup(group.key)}
                                    className={`w-full flex items-center justify-between px-3 py-2 text-sm transition-colors text-left ${isActive
                                        ? 'bg-white text-gray-900 font-semibold border-l-2 border-[#00C853]'
                                        : 'text-gray-600 hover:bg-gray-100'
                                        }`}
                                >
                                    <span className="truncate">{group.label}</span>
                                    {groupCount > 0 && (
                                        <span className="ml-1 bg-[#00C853] text-white text-[9px] rounded-full h-4 w-4 flex items-center justify-center font-bold flex-shrink-0">
                                            {groupCount}
                                        </span>
                                    )}
                                </button>
                            );
                        })}
                    </div>

                    {/* Right pane — options for selected category */}
                    <div className="flex-1 py-3 px-3 min-w-[200px] max-h-64 overflow-y-auto">
                        {currentGroup ? (
                            <>
                                <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-2 px-1">
                                    {currentGroup.label}
                                </p>
                                {currentGroup.options.length === 0 ? (
                                    <p className="text-xs text-gray-400 italic px-1">No options available</p>
                                ) : (
                                    <div className="space-y-0.5">
                                        {currentGroup.options.map(opt => {
                                            const checked = (activeFilters[currentGroup.key] || []).includes(opt.value);
                                            return (
                                                <label
                                                    key={opt.value}
                                                    className={`flex items-center gap-2.5 px-2 py-1.5 rounded-lg cursor-pointer select-none transition-colors ${checked ? 'bg-green-50' : 'hover:bg-gray-50'
                                                        }`}
                                                >
                                                    {/* Custom checkbox */}
                                                    <span className={`w-4 h-4 rounded flex items-center justify-center flex-shrink-0 border transition-colors ${checked
                                                        ? 'bg-[#00C853] border-[#00C853]'
                                                        : 'border-gray-300 bg-white'
                                                        }`}>
                                                        {checked && <Check size={11} className="text-white" strokeWidth={3} />}
                                                    </span>
                                                    <input
                                                        type="checkbox"
                                                        className="hidden"
                                                        checked={checked}
                                                        onChange={() => toggle(currentGroup.key, opt.value)}
                                                    />
                                                    <span className={`text-sm flex-1 truncate ${checked ? 'text-green-800 font-medium' : 'text-gray-700'}`}>
                                                        {opt.label}
                                                    </span>
                                                    {opt.count !== undefined && (
                                                        <span className="text-xs text-gray-400 tabular-nums flex-shrink-0">
                                                            {opt.count}
                                                        </span>
                                                    )}
                                                </label>
                                            );
                                        })}
                                    </div>
                                )}
                            </>
                        ) : (
                            <p className="text-xs text-gray-400 italic">Select a category</p>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
};

export default FilterPanel;
