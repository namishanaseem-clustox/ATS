import { useState, useEffect } from 'react';

const useColumnPersistence = (key, defaultColumns) => {
    const [visibleColumns, setVisibleColumns] = useState(() => {
        try {
            const saved = localStorage.getItem(key);
            if (saved) {
                const parsed = JSON.parse(saved);
                // Validate parsed data is an array of strings, otherwise fallback
                if (Array.isArray(parsed) && parsed.every(item => typeof item === 'string')) {
                    return parsed;
                }
            }
        } catch (e) {
            console.error("Failed to load columns preference", e);
        }
        // Default to all columns if nothing saved or invalid
        return defaultColumns;
    });

    useEffect(() => {
        localStorage.setItem(key, JSON.stringify(visibleColumns));
    }, [key, visibleColumns]);

    const toggleColumn = (columnId) => {
        setVisibleColumns(prev => {
            if (prev.includes(columnId)) {
                return prev.filter(id => id !== columnId);
            } else {
                return [...prev, columnId];
            }
        });
    };

    return [visibleColumns, toggleColumn];
};

export default useColumnPersistence;
