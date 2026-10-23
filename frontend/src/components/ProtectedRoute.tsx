import React, { useEffect, useState } from 'react';
import { Navigate } from 'react-router-dom';
import { getToken } from '../utils/auth';
import { apiClient } from '../api/client';

interface ProtectedRouteProps {
  children: React.ReactNode;
}

const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ children }) => {
  const [isAuthenticated, setIsAuthenticated] = useState<boolean | null>(null);
  const [backendError, setBackendError] = useState<boolean>(false);

  useEffect(() => {
    let isMounted = true;

    const checkAuth = async () => {
      try {
        await apiClient.get('/auth/me');
        if (isMounted) setIsAuthenticated(true);
      } catch (error: any) {
        if (isMounted) {
          if (error.message === 'Unable to connect to FinWise AI server.') {
            setBackendError(true);
          } else {
            setIsAuthenticated(false);
          }
        }
      }
    };

    if (!getToken()) {
      // apiClient will automatically try to refresh if token is missing and we hit a 401 on /me.
      // Alternatively, we could manually check, but relying on interceptor is cleaner.
      // Wait, if no token, `apiClient` doesn't auto-refresh unless it's a 401. Let's just call /auth/me and see what happens.
    }
    
    checkAuth();

    return () => {
      isMounted = false;
    };
  }, []);

  if (backendError) {
    return (
      <div style={{ display: 'flex', height: '100vh', justifyContent: 'center', alignItems: 'center', backgroundColor: 'var(--bg-primary)', color: 'var(--text-primary)', flexDirection: 'column' }}>
        <h2>Server Unavailable</h2>
        <p style={{ color: 'var(--text-secondary)' }}>Unable to connect to FinWise AI backend. Please try again later.</p>
        <button onClick={() => window.location.reload()} style={{ marginTop: '20px', padding: '10px 20px', backgroundColor: 'var(--text-primary)', color: 'var(--bg-primary)', border: 'none', borderRadius: '4px', cursor: 'pointer' }}>Retry</button>
      </div>
    );
  }

  if (isAuthenticated === null) {
    return (
      <div style={{ display: 'flex', height: '100vh', justifyContent: 'center', alignItems: 'center', backgroundColor: 'var(--bg-primary)' }}>
        <p style={{ color: 'var(--text-secondary)' }}>Initializing FinWise AI...</p>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  return <>{children}</>;
};

export default ProtectedRoute;
