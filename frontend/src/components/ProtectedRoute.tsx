import React, { useEffect, useState } from 'react';
import { Navigate } from 'react-router-dom';
import { getToken, setToken } from '../utils/auth';

interface ProtectedRouteProps {
  children: React.ReactNode;
}

let authCheckPromise: Promise<boolean | string> | null = null;

const checkAuthShared = async (): Promise<boolean | string> => {
  let token = getToken();

  if (!token) {
    try {
      const res = await fetch('http://localhost:5000/api/auth/refresh', {
        method: 'POST',
        credentials: 'include'
      });
      if (res.ok) {
        const data = await res.json();
        token = data.accessToken;
        setToken(token);
      } else {
        return false;
      }
    } catch (e) {
      return 'network_error';
    }
  }

  if (!token) {
    return false;
  }

  try {
    const response = await fetch('http://localhost:5000/api/auth/me', {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });

    if (response.ok) {
      return true;
    } else {
      const refreshRes = await fetch('http://localhost:5000/api/auth/refresh', {
        method: 'POST',
        credentials: 'include'
      });
      if (refreshRes.ok) {
        const data = await refreshRes.json();
        setToken(data.accessToken);
        return true;
      } else {
        setToken(null);
        return false;
      }
    }
  } catch (error) {
    return 'network_error';
  }
};

const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ children }) => {
  const [isAuthenticated, setIsAuthenticated] = useState<boolean | null>(null);
  const [backendError, setBackendError] = useState<boolean>(false);

  useEffect(() => {
    let isMounted = true;

    const runAuthCheck = async () => {
      if (!authCheckPromise) {
        authCheckPromise = checkAuthShared();
      }
      const result = await authCheckPromise;
      // Clear the promise after it resolves so future navigation re-checks if needed
      // but setTimeout allows concurrent calls in same tick to share it
      setTimeout(() => { authCheckPromise = null; }, 100);

      if (isMounted) {
        if (result === 'network_error') {
          setBackendError(true);
        } else {
          setIsAuthenticated(result as boolean);
        }
      }
    };

    runAuthCheck();

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
