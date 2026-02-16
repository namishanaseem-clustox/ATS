import React from 'react';
import { useAuth } from '../context/AuthContext';

const RoleGuard = ({ allowedRoles, children }) => {
    const { user } = useAuth();

    if (!user || !allowedRoles.includes(user.role)) {
        return null; // Or return fallback UI if needed
    }

    return <>{children}</>;
};

export default RoleGuard;
