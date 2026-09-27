import React, { useState } from 'react';
import { useNavigate, Link, useLocation } from 'react-router-dom';
import { setToken } from '../../utils/auth';

export const LoginForm: React.FC<{ isAnimatingOut: boolean }> = ({ isAnimatingOut }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [rememberMe, setRememberMe] = useState(false);
  const [error, setError] = useState('');
  const location = useLocation();
  const navigate = useNavigate();
  const [successMessage, setSuccessMessage] = useState(location.state?.successMessage || '');

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    try {
      const res = await fetch('http://localhost:5000/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ email, password, rememberMe })
      });

      const data = await res.json();

      if (res.ok) {
        setToken(data.accessToken);
        navigate('/dashboard');
      } else {
        if (res.status === 401) {
          setError('Invalid email or password.');
        } else {
          setError(data.message || 'Login failed');
        }
        setSuccessMessage('');
      }
    } catch (err) {
      console.error('Login fetch error:', err);
      setError('Unable to connect to the server. Please try again.');
      setSuccessMessage('');
    }
  };

  return (
    <div style={{ opacity: isAnimatingOut ? 0 : 1, transition: 'opacity 0.3s' }}>
      <h2 style={{ color: 'white', marginBottom: '24px' }}>Welcome back</h2>
      {successMessage && <div style={{ color: '#4caf50', marginBottom: '16px' }}>{successMessage}</div>}
      {error && <div style={{ color: 'red', marginBottom: '16px' }}>{error}</div>}
      <form onSubmit={handleLogin}>
        <div style={{ marginBottom: '16px' }}>
          <label style={{ display: 'block', color: '#888', marginBottom: '8px' }}>Email</label>
          <input
            type="email"
            value={email}
            onChange={e => setEmail(e.target.value)}
            style={{ width: '100%', padding: '12px', borderRadius: '8px', border: '1px solid #333', background: '#111', color: 'white' }}
            required
          />
        </div>
        <div style={{ marginBottom: '16px' }}>
          <label style={{ display: 'block', color: '#888', marginBottom: '8px' }}>Password</label>
          <input
            type="password"
            value={password}
            onChange={e => setPassword(e.target.value)}
            style={{ width: '100%', padding: '12px', borderRadius: '8px', border: '1px solid #333', background: '#111', color: 'white' }}
            required
          />
        </div>
        <div style={{ marginBottom: '24px', display: 'flex', alignItems: 'center', color: '#888' }}>
          <input
            type="checkbox"
            checked={rememberMe}
            onChange={e => setRememberMe(e.target.checked)}
            style={{ marginRight: '8px' }}
          />
          <label>Remember me</label>
        </div>
        <button type="submit" style={{ width: '100%', padding: '14px', borderRadius: '8px', background: 'white', color: 'black', border: 'none', cursor: 'pointer', fontWeight: 'bold' }}>
          Log in
        </button>
      </form>
      <div style={{ marginTop: '24px', textAlign: 'center', color: '#888' }}>
        Don't have an account? <Link to="/register" style={{ color: 'white' }}>Sign up</Link>
      </div>
    </div>
  );
};
