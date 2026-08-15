import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';

type Role = 'ADMIN' | 'MEDECIN' | 'SECRETAIRE' | 'PATIENT';

export const RouteGuard: React.FC<{
  children: React.ReactNode;
  allowedRole: Role;
}> = ({ children, allowedRole }) => {
  const { user, isLoading } = useAuth();
  const location = useLocation();

  if (isLoading) return <FullScreenLoader />;
  if (!user) return <Navigate to="/login" state={{ from: location }} replace />;
  
  const userRole = user.role?.toUpperCase();
  const requiredRole = allowedRole.toUpperCase();

  if (userRole !== requiredRole) return <Navigate to="/unauthorized" replace />;

  // Patient health profile gate
  if (
    allowedRole === 'PATIENT' &&
    user.health_profile_complete === false &&
    location.pathname !== '/patient/onboarding/health'
  ) {
    return <Navigate to="/patient/onboarding/health" replace />;
  }

  return <>{children}</>;
};

const FullScreenLoader = () => (
  <div style={{
    position: 'fixed', inset: 0,
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    background: 'var(--bg-canvas)'
  }}>
    <div className="spinner-indigo" />
  </div>
);
