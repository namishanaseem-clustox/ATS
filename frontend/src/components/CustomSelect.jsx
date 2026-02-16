import React, { useState, useRef, useEffect } from 'react';
import { ChevronDown, Check } from 'lucide-react';

const CustomSelect = ({ label, options, value, onChange, name, disabled = false, required = false, placeholder = "Select...", className = "mb-4" }) => {
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

    const selectedOption = options.find(opt => String(opt.value) === String(value));

    const handleSelect = (optionValue) => {
        // Mimic event object for compatibility with handleInputChange
        onChange({ target: { name, value: optionValue } });
        setIsOpen(false);
    };

    return (
        <div className={`relative ${className}`} ref={dropdownRef}>
            {label && <label className="block text-sm font-medium text-gray-700 mb-1">{label}</label>}
            <div className="relative">
                <button
                    type="button"
                    className={`w-full bg-white border border-gray-300 rounded-md shadow-sm pl-3 pr-10 py-2 text-left cursor-default sm:text-sm focus:outline-none focus:ring-1 focus:ring-[#00C853] focus:border-[#00C853] ${disabled ? 'bg-gray-100 cursor-not-allowed opacity-75' : 'hover:border-gray-400 transition-colors'}`}
                    onClick={() => !disabled && setIsOpen(!isOpen)}
                    disabled={disabled}
                >
                    <span className={`block truncate capitalize ${!selectedOption ? 'text-gray-500' : 'text-gray-900'}`}>
                        {selectedOption?.label || placeholder}
                    </span>
                    <span className="absolute inset-y-0 right-0 flex items-center pr-2 pointer-events-none">
                        <ChevronDown className="h-4 w-4 text-gray-400" />
                    </span>
                </button>

                {/* Hidden input for HTML5 validation */}
                <input
                    type="text"
                    name={name}
                    value={value || ''}
                    required={required}
                    className="opacity-0 absolute inset-0 w-full h-full pointer-events-none -z-10"
                    onChange={() => { }}
                    tabIndex={-1}
                    onInvalid={(e) => {
                        e.preventDefault();
                        setIsOpen(true); // Open dropdown if invalid? Or just show bubble
                    }}
                />

                {isOpen && (
                    <div className="absolute z-20 mt-1 w-full bg-white shadow-lg max-h-60 rounded-md py-1 text-base ring-1 ring-black ring-opacity-5 overflow-auto focus:outline-none sm:text-sm">
                        {options.map((option) => (
                            <div
                                key={option.value}
                                className={`cursor-pointer select-none relative py-2 pl-3 pr-9 hover:bg-gray-50 transition-colors ${String(option.value) === String(value) ? 'bg-green-50 text-[#00C853] font-medium' : 'text-gray-900'}`}
                                onClick={() => handleSelect(option.value)}
                            >
                                <span className="block truncate capitalize">{option.label}</span>
                                {String(option.value) === String(value) && (
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

export default CustomSelect;
