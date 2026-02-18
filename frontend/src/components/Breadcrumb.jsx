import React from 'react';
import { Link } from 'react-router-dom';
import { ChevronRight, Home } from 'lucide-react';

/**
 * Breadcrumb component for connected navigation.
 * Usage: <Breadcrumb items={[{ label: 'Jobs', to: '/jobs' }, { label: 'Senior Engineer' }]} />
 */
const Breadcrumb = ({ items = [] }) => {
    return (
        <nav className="flex items-center gap-1.5 text-sm text-gray-500 mb-4" aria-label="Breadcrumb">
            <Link to="/dashboard" className="hover:text-[#00C853] transition-colors flex items-center">
                <Home size={13} />
            </Link>
            {items.map((item, index) => (
                <React.Fragment key={index}>
                    <ChevronRight size={13} className="text-gray-300 flex-shrink-0" />
                    {item.to ? (
                        <Link
                            to={item.to}
                            className="hover:text-[#00C853] transition-colors font-medium truncate max-w-[180px]"
                            title={item.label}
                        >
                            {item.label}
                        </Link>
                    ) : (
                        <span className="text-gray-800 font-medium truncate max-w-[200px]" title={item.label}>
                            {item.label}
                        </span>
                    )}
                </React.Fragment>
            ))}
        </nav>
    );
};

export default Breadcrumb;
