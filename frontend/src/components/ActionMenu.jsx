import React, { useState, useRef, useEffect } from 'react';
import { MoreVertical } from 'lucide-react';

const ActionMenu = ({ actions }) => {
    const [isOpen, setIsOpen] = useState(false);
    const menuRef = useRef(null);

    useEffect(() => {
        const handleClickOutside = (event) => {
            if (menuRef.current && !menuRef.current.contains(event.target)) {
                setIsOpen(false);
            }
        };

        if (isOpen) {
            document.addEventListener('mousedown', handleClickOutside);
        }
        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
        };
    }, [isOpen]);

    return (
        <div className="relative inline-block text-left" ref={menuRef}>
            <button
                onClick={(e) => {
                    e.stopPropagation();
                    setIsOpen(!isOpen);
                }}
                className="p-2 rounded-full hover:bg-gray-100 text-gray-500 hover:text-gray-700 transition-colors focus:outline-none focus:bg-gray-100"
            >
                <MoreVertical size={18} />
            </button>

            {isOpen && (
                <div className="origin-top-right absolute right-0 mt-2 w-36 rounded-md shadow-lg bg-white ring-1 ring-black ring-opacity-5 z-20 animate-in fade-in zoom-in duration-100">
                    <div className="py-1" role="menu" aria-orientation="vertical" aria-labelledby="options-menu">
                        {actions.map((action, index) => (
                            <button
                                key={index}
                                onClick={(e) => {
                                    e.stopPropagation();
                                    setIsOpen(false);
                                    action.onClick();
                                }}
                                className={`block w-full text-left px-4 py-2 text-sm hover:bg-gray-50 transition-colors ${action.className || 'text-gray-700'}`}
                                role="menuitem"
                            >
                                {action.icon && <span className="mr-2 inline-block align-middle">{action.icon}</span>}
                                {action.label}
                            </button>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
};

export default ActionMenu;
