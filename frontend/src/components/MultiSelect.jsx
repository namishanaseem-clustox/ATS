
import React, { useState, useRef, useEffect } from 'react';
import { ChevronDown, Check, X } from 'lucide-react';

const MultiSelect = ({ label, options, value = [], onChange, name, disabled = false, placeholder = "Select...", className = "mb-4" }) => {
    const [isOpen, setIsOpen] = useState(false);
    const dropdownRef = useRef(null);

    // Close on click outside
    useEffect(() => {
        const handleClickOutside = (event) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
                setIsOpen(false);
            }
        };
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    const handleSelect = (optionValue) => {
        let newValue;
        if (value.includes(optionValue)) {
            newValue = value.filter(v => v !== optionValue);
        } else {
            newValue = [...value, optionValue];
        }
        // Mimic event object
        onChange({ target: { name, value: newValue } });
    };

    const removeTag = (e, valToRemove) => {
        e.stopPropagation();
        const newValue = value.filter(v => v !== valToRemove);
        onChange({ target: { name, value: newValue } });
    };

    return (
        <div className={`relative ${className}`} ref={dropdownRef}>
            {label && <label className="block text-sm font-medium text-gray-700 mb-1">{label}</label>}
            <div className="relative">
                <button
                    type="button"
                    className={`w-full bg-white border border-gray-300 rounded-md shadow-sm pl-3 pr-10 py-2 text-left cursor-default sm:text-sm focus:outline-none focus:ring-1 focus:ring-[#00C853] focus:border-[#00C853] min-h-[38px] ${disabled ? 'bg-gray-100 cursor-not-allowed opacity-75' : 'hover:border-gray-400 transition-colors'}`}
                    onClick={() => !disabled && setIsOpen(!isOpen)}
                    disabled={disabled}
                >
                    <div className="flex flex-wrap gap-1">
                        {value.length > 0 ? (
                            value.map(val => {
                                const option = options.find(o => String(o.value) === String(val));
                                return (
                                    <span key={val} className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-green-100 text-green-800">
                                        {option?.label || val}
                                        <X
                                            size={12}
                                            className="ml-1 cursor-pointer hover:text-green-900"
                                            onClick={(e) => removeTag(e, val)}
                                        />
                                    </span>
                                );
                            })
                        ) : (
                            <span className="text-gray-500 block truncate">{placeholder}</span>
                        )}
                    </div>
                    <span className="absolute inset-y-0 right-0 flex items-center pr-2 pointer-events-none">
                        <ChevronDown className="h-4 w-4 text-gray-400" />
                    </span>
                </button>

                {isOpen && (
                    <div className="absolute z-50 mt-1 w-full bg-white shadow-lg max-h-60 rounded-md py-1 text-base ring-1 ring-black ring-opacity-5 overflow-auto focus:outline-none sm:text-sm">
                        {options.map((option) => (
                            <div
                                key={option.value}
                                className={`cursor-pointer select-none relative py-2 pl-3 pr-9 hover:bg-gray-50 transition-colors ${value.includes(option.value) ? 'bg-green-50 text-[#00C853] font-medium' : 'text-gray-900'}`}
                                onClick={() => handleSelect(option.value)}
                            >
                                <span className="block truncate capitalize">{option.label}</span>
                                {value.includes(option.value) && (
                                    <span className="absolute inset-y-0 right-0 flex items-center pr-4 text-[#00C853]">
                                        <Check className="h-4 w-4" />
                                    </span>
                                )}
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
};

export default MultiSelect;
