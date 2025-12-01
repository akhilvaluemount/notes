import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const ProtectedRoute = ({ children, requiredRole, requirePremium, requireExamAccess, allowExamOnly }) => {
  const { isAuthenticated, loading, user, hasPremiumAccess, hasExamAccess, isExamOnlyUser } = useAuth();
  const location = useLocation();

  // Show loading while checking auth
  if (loading) {
    return (
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        height: '100vh',
        background: '#1a1a2e',
        color: '#fff'
      }}>
        <div>Loading...</div>
      </div>
    );
  }

  // Redirect to login if not authenticated
  if (!isAuthenticated) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  // Exam-only users should be redirected to exam dashboard for non-exam routes
  // unless the route explicitly allows exam-only users
  if (isExamOnlyUser && !allowExamOnly && !location.pathname.startsWith('/exam')) {
    return <Navigate to="/exam-dashboard" replace />;
  }

  // Check for specific role requirement
  if (requiredRole && user?.role !== requiredRole) {
    return (
      <div style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        height: '100vh',
        background: '#1a1a2e',
        color: '#fff',
        textAlign: 'center',
        padding: '20px'
      }}>
        <h2 style={{ color: '#ef4444', marginBottom: '16px' }}>Access Denied</h2>
        <p style={{ color: '#888' }}>
          You don't have permission to access this page.
          <br />
          Required role: <strong>{requiredRole}</strong>
        </p>
      </div>
    );
  }

  // Check for exam access requirement (admin, premium, or exam users)
  if (requireExamAccess && !hasExamAccess) {
    return (
      <div style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        height: '100vh',
        background: '#1a1a2e',
        color: '#fff',
        textAlign: 'center',
        padding: '20px'
      }}>
        <h2 style={{ color: '#6366f1', marginBottom: '16px' }}>Exam Access Required</h2>
        <p style={{ color: '#888' }}>
          This feature requires an Exam, Premium, or Admin account.
          <br />
          Please contact support to get access.
        </p>
      </div>
    );
  }

  // Check for premium access requirement
  if (requirePremium && !hasPremiumAccess) {
    return (
      <div style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        height: '100vh',
        background: '#1a1a2e',
        color: '#fff',
        textAlign: 'center',
        padding: '20px'
      }}>
        <h2 style={{ color: '#eab308', marginBottom: '16px' }}>Premium Feature</h2>
        <p style={{ color: '#888' }}>
          This feature requires a Premium or Admin account.
          <br />
          Please upgrade to access this content.
        </p>
      </div>
    );
  }

  return children;
};

export default ProtectedRoute;
