import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { Mail, Lock, ArrowRight, AlertCircle, Shield, Sun, Moon } from 'lucide-react';
import toast from 'react-hot-toast';

const Login = () => {
  const { login } = useAuth();
  const { isDark, toggleTheme } = useTheme();
  const navigate = useNavigate();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!email || !password) { setError('Please enter your email and password.'); return; }
    setLoading(true);
    setError(null);
    const res = await login(email, password);
    setLoading(false);
    if (res.success) {
      toast.success('Welcome back! Access granted.');
      navigate('/');
    } else {
      setError(res.error || 'Invalid credentials.');
    }
  };

  return (
    <div className="login-page">
      {/* Background orbs */}
      <div className="login-bg-orb" style={{ width: 480, height: 480, background: 'rgba(255,107,53,0.07)', top: -150, left: -150 }} />
      <div className="login-bg-orb" style={{ width: 380, height: 380, background: 'rgba(99,102,241,0.06)', bottom: -100, right: -100 }} />

      {/* Grid pattern */}
      <div style={{
        position: 'absolute', inset: 0, opacity: 0.03,
        backgroundImage: 'linear-gradient(var(--text-primary) 1px, transparent 1px), linear-gradient(90deg, var(--text-primary) 1px, transparent 1px)',
        backgroundSize: '44px 44px',
        pointerEvents: 'none',
      }} />

      {/* Theme toggle top-right */}
      <button
        onClick={toggleTheme}
        className="btn btn-secondary btn-icon"
        style={{ position: 'absolute', top: 18, right: 20, zIndex: 20 }}
        title={isDark ? 'Light Mode' : 'Dark Mode'}
      >
        {isDark ? <Sun size={15} /> : <Moon size={15} />}
      </button>

      <div className="login-card animate-fade-in-up">
        {/* Header */}
        <div style={{ textAlign: 'center', marginBottom: 28 }}>
          <div style={{
            width: 50, height: 50, borderRadius: 13,
            background: 'linear-gradient(135deg, #ff6b35, #f7931e)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            margin: '0 auto 14px',
            boxShadow: '0 6px 20px rgba(255,107,53,0.35)',
            fontSize: 20,
          }}>
            🍽️
          </div>
          <h1 style={{ fontSize: 19, fontWeight: 800, color: 'var(--text-primary)', marginBottom: 6, letterSpacing: '-0.02em' }}>
            Tasty Admin Console
          </h1>
          <p style={{ fontSize: 12, color: 'var(--text-muted)', fontWeight: 500, margin: 0 }}>
            Sign in to manage your hotel dashboard
          </p>
        </div>

        {/* Error */}
        {error && (
          <div style={{
            display: 'flex', alignItems: 'center', gap: 8,
            padding: '10px 13px',
            background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)',
            borderRadius: 10, marginBottom: 18,
          }}>
            <AlertCircle size={13} style={{ color: '#f87171', flexShrink: 0 }} />
            <span style={{ fontSize: 12, color: '#f87171', fontWeight: 500 }}>{error}</span>
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 13 }}>
          <div>
            <label className="input-label">Email Address</label>
            <div style={{ position: 'relative' }}>
              <Mail size={13} style={{ position: 'absolute', left: 11, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)', pointerEvents: 'none' }} />
              <input
                id="admin-email"
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                placeholder="admin@hotel.com"
                className="admin-input"
                style={{ paddingLeft: 33 }}
                required
                autoComplete="email"
              />
            </div>
          </div>

          <div>
            <label className="input-label">Password</label>
            <div style={{ position: 'relative' }}>
              <Lock size={13} style={{ position: 'absolute', left: 11, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)', pointerEvents: 'none' }} />
              <input
                id="admin-password"
                type="password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                placeholder="••••••••"
                className="admin-input"
                style={{ paddingLeft: 33 }}
                required
                autoComplete="current-password"
              />
            </div>
          </div>

          <button
            type="submit"
            id="admin-login-btn"
            className="btn btn-primary"
            disabled={loading}
            style={{ width: '100%', padding: '11px', fontSize: 13, fontWeight: 700, marginTop: 4, borderRadius: 10 }}
          >
            {loading ? (
              <>
                <span style={{ width: 13, height: 13, border: '2px solid rgba(255,255,255,0.3)', borderTopColor: 'white', borderRadius: '50%', animation: 'spin 0.8s linear infinite', display: 'inline-block' }} />
                Signing in...
              </>
            ) : (
              <>Sign In <ArrowRight size={14} /></>
            )}
          </button>
        </form>

        {/* Footer note */}
        <div style={{ marginTop: 22, paddingTop: 18, borderTop: '1px solid var(--border-subtle)', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
          <Shield size={11} style={{ color: 'var(--text-muted)' }} />
          <span style={{ fontSize: 11, color: 'var(--text-muted)', fontWeight: 500 }}>Restricted to administrators only</span>
        </div>
      </div>
    </div>
  );
};

export default Login;
