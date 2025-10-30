import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

interface ProtectedRouteProps {
  children: React.ReactNode;
  requiredRoles?: string[];
}

const ProtectedRoute = ({ children, requiredRoles }: ProtectedRouteProps) => {
  const { isAuthenticated, isLoading, hasRole, user } = useAuth();
  const location = useLocation();

  // Debug logging
  console.log('🛡️ ProtectedRoute Check:', {
    path: location.pathname,
    isLoading,
    isAuthenticated,
    requiredRoles,
    userRoles: (user as any)?.roles,
    hasRequiredRole: requiredRoles ? hasRole(requiredRoles) : 'N/A',
  });

  if (isLoading) {
    console.log('🛡️ ProtectedRoute: Still loading...');
    return (
      <div className="flex h-screen w-screen items-center justify-center bg-gray-100 dark:bg-gray-900">
        <div className="h-32 w-32 animate-spin rounded-full border-b-2 border-t-2 border-blue-500" />
      </div>
    );
  }

  if (!isAuthenticated) {
    console.log('🛡️ ProtectedRoute: Not authenticated, redirecting to /');
    return <Navigate to="/" state={{ from: location }} replace />;
  }

  if (requiredRoles && requiredRoles.length > 0 && !hasRole(requiredRoles)) {
    console.log('🛡️ ProtectedRoute: Missing required roles, redirecting to /app');
    return <Navigate to="/app" replace />;
  }

  console.log('🛡️ ProtectedRoute: Access granted! ✅');
  return <>{children}</>;
};

export default ProtectedRoute;
