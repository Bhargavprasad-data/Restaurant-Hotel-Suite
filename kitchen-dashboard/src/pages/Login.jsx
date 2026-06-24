import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Flame, Lock, Mail, AlertTriangle, Eye, EyeOff } from 'lucide-react';

const Login = () => {
  const { login } = useAuth();
  const navigate = useNavigate();

  const [email, setEmail]         = useState('');
  const [password, setPassword]   = useState('');
  const [showPass, setShowPass]   = useState(false);
  const [error, setError]         = useState(null);
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      await login(email, password);
      navigate('/');
    } catch (err) {
      setError(err.message || 'Incorrect credentials. Access restricted to Kitchen staff.');
    } finally {
      setSubmitting(false);
    }
  };


  return (
    <div className="auth-bg min-h-screen w-full flex items-center justify-center p-4">

      {/* Glow blob decorations */}
      <div
        className="absolute top-1/4 left-1/4 w-72 h-72 rounded-full pointer-events-none"
        style={{
          background: 'radial-gradient(circle, rgba(245,158,11,0.08) 0%, transparent 70%)',
          filter: 'blur(40px)',
        }}
      />
      <div
        className="absolute bottom-1/4 right-1/4 w-56 h-56 rounded-full pointer-events-none"
        style={{
          background: 'radial-gradient(circle, rgba(234,88,12,0.06) 0%, transparent 70%)',
          filter: 'blur(40px)',
        }}
      />

      {/* Card */}
      <div
        className="relative z-10 w-full max-w-[400px] rounded-2xl p-8 shadow-2xl fade-in-up"
        style={{
          background: 'var(--bg-surface)',
          border: '1px solid var(--border)',
        }}
      >
        {/* Brand */}
        <div className="flex flex-col items-center mb-8">
          <div
            className="w-12 h-12 rounded-xl flex items-center justify-center mb-4 shadow-lg"
            style={{
              background: 'linear-gradient(135deg, #f59e0b, #ea580c)',
              boxShadow: '0 8px 24px rgba(245,158,11,0.3)',
            }}
          >
            <Flame size={24} className="text-white" />
          </div>
          <h1 className="text-[22px] font-bold tracking-tight" style={{ color: 'var(--text-primary)' }}>
            Tasty Bites
          </h1>
          <p className="text-[11px] font-semibold uppercase tracking-[0.14em] mt-1" style={{ color: 'var(--text-muted)' }}>
            Kitchen Command Portal
          </p>
        </div>

        {/* Error */}
        {error && (
          <div
            className="flex items-center gap-2.5 px-4 py-3 rounded-xl mb-5 text-[12px] font-medium"
            style={{
              background: 'rgba(239,68,68,0.08)',
              border: '1px solid rgba(239,68,68,0.2)',
              color: '#f87171',
            }}
          >
            <AlertTriangle size={13} className="shrink-0" />
            <p>{error}</p>
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-4">

          {/* Email */}
          <div className="space-y-1.5">
            <label
              className="text-[11px] font-bold uppercase tracking-[0.1em]"
              style={{ color: 'var(--text-secondary)' }}
            >
              Chef Email
            </label>
            <div className="relative">
              <Mail
                size={14}
                className="absolute left-3.5 top-1/2 -translate-y-1/2"
                style={{ color: 'var(--text-muted)' }}
              />
              <input
                id="login-email"
                type="email"
                required
                placeholder="kitchen1@restaurant.com"
                value={email}
                onChange={e => setEmail(e.target.value)}
                className="premium-input"
                style={{ paddingLeft: '36px' }}
              />
            </div>
          </div>

          {/* Password */}
          <div className="space-y-1.5">
            <label
              className="text-[11px] font-bold uppercase tracking-[0.1em]"
              style={{ color: 'var(--text-secondary)' }}
            >
              Password
            </label>
            <div className="relative">
              <Lock
                size={14}
                className="absolute left-3.5 top-1/2 -translate-y-1/2"
                style={{ color: 'var(--text-muted)' }}
              />
              <input
                id="login-password"
                type={showPass ? 'text' : 'password'}
                required
                placeholder="••••••••"
                value={password}
                onChange={e => setPassword(e.target.value)}
                className="premium-input"
                style={{ paddingLeft: '36px', paddingRight: '40px' }}
              />
              <button
                type="button"
                tabIndex={-1}
                onClick={() => setShowPass(p => !p)}
                className="absolute right-3 top-1/2 -translate-y-1/2 cursor-pointer"
                style={{ color: 'var(--text-muted)' }}
              >
                {showPass ? <EyeOff size={14} /> : <Eye size={14} />}
              </button>
            </div>
          </div>

          {/* Submit */}
          <button
            id="login-submit"
            type="submit"
            disabled={submitting}
            className="w-full py-3 rounded-xl text-[14px] font-bold text-white mt-2
              active:scale-[0.98] transition-all disabled:opacity-60 disabled:cursor-not-allowed
              flex items-center justify-center gap-2"
            style={{
              background: 'linear-gradient(135deg, #f59e0b, #ea580c)',
              boxShadow: submitting ? 'none' : '0 4px 16px rgba(245,158,11,0.3)',
            }}
          >
            {submitting ? (
              <span className="h-4 w-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
            ) : (
              'Access Kitchen Dashboard'
            )}
          </button>
        </form>

        {/* Register link */}
        <div
          className="mt-6 pt-5 text-center border-t"
          style={{ borderColor: 'var(--border)' }}
        >
          <p className="text-[12px]" style={{ color: 'var(--text-muted)' }}>
            New chef on shift?{' '}
            <Link
              to="/signup"
              className="font-bold transition-colors"
              style={{ color: '#f59e0b' }}
            >
              Register Here
            </Link>
          </p>
        </div>


      </div>
    </div>
  );
};

export default Login;
