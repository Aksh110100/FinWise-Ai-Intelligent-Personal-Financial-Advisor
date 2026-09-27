import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { setToken } from '../../utils/auth';

export const RegisterForm: React.FC<{ isAnimatingOut: boolean }> = ({ isAnimatingOut }) => {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const navigate = useNavigate();

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    try {
      const res = await fetch('http://localhost:5000/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ name, email, password })
      });

      const data = await res.json();

      if (res.ok) {
        navigate('/login', { state: { successMessage: 'Account created successfully. Please log in.' } });
      } else {
        // Show actual backend error instead of Network error
        if (res.status === 409) {
          setError('An account with this email already exists.');
        } else {
          setError(data.message || 'Registration failed');
        }
      }
    } catch (err) {
      setError('Unable to connect to the server. Please try again.');
    }
  };

  return (
    <div style={{ opacity: isAnimatingOut ? 0 : 1, transition: 'opacity 0.3s' }}>
      <h2 style={{ color: 'white', marginBottom: '24px' }}>Create an account</h2>
      {error && <div style={{ color: 'red', marginBottom: '16px' }}>{error}</div>}
      <form onSubmit={handleRegister}>
        <div style={{ marginBottom: '16px' }}>
          <label style={{ display: 'block', color: '#888', marginBottom: '8px' }}>Name</label>
          <input
            type="text"
            value={name}
            onChange={e => setName(e.target.value)}
            style={{ width: '100%', padding: '12px', borderRadius: '8px', border: '1px solid #333', background: '#111', color: 'white' }}
            required
          />
        </div>
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
        <div style={{ marginBottom: '24px' }}>
          <label style={{ display: 'block', color: '#888', marginBottom: '8px' }}>Password</label>
          <input
            type="password"
            value={password}
            onChange={e => setPassword(e.target.value)}
            style={{ width: '100%', padding: '12px', borderRadius: '8px', border: '1px solid #333', background: '#111', color: 'white' }}
            required
            minLength={8}
          />
        </div>
        <button type="submit" style={{ width: '100%', padding: '14px', borderRadius: '8px', background: 'white', color: 'black', border: 'none', cursor: 'pointer', fontWeight: 'bold' }}>
          Sign up
        </button>
      </form>
      <div style={{ marginTop: '24px', textAlign: 'center', color: '#888' }}>
        Already have an account? <Link to="/login" style={{ color: 'white' }}>Log in</Link>
      </div>
    </div>
  );
};
