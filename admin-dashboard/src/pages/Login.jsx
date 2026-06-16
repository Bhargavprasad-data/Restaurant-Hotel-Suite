import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { motion, AnimatePresence } from 'framer-motion';
import { Flame, Mail, Lock, AlertCircle, Eye, EyeOff, Zap } from 'lucide-react';

const Login = () => {
  const { login } = useAuth();
  const navigate = useNavigate();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPwd, setShowPwd] = useState(false);
  const [error, setError] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async e => {
    e.preventDefault();
    setError(null);
    setSubmitting(true);

    try {
      await login(email, password);
      navigate('/');
    } catch (err) {
      setError(err.message || 'Incorrect credentials or restricted access.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div style={{
      minHeight: '100vh',
      width: '100%',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      background: 'linear-gradient(135deg, #0f0f0f 0%, #1a1a2e 50%, #16213e 100%)',
      padding: '1rem',
      position: 'relative',
      overflow: 'hidden',
    }}>
      {/* Background decoration */}
      <div style={{
        position: 'absolute',
        top: '-30%',
        right: '-10%',
        width: '60vw',
        height: '60vw',
        borderRadius: '50%',
        background: 'radial-gradient(circle, rgba(239,68,68,0.07) 0%, transparent 70%)',
        pointerEvents: 'none',
      }} />
      <div style={{
        position: 'absolute',
        bottom: '-20%',
        left: '-5%',
        width: '40vw',
        height: '40vw',
        borderRadius: '50%',
        background: 'radial-gradient(circle, rgba(249,115,22,0.05) 0%, transparent 70%)',
        pointerEvents: 'none',
      }} />

      <motion.div
        initial={{ opacity: 0, y: 30, scale: 0.96 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ type: 'spring', stiffness: 120, damping: 18 }}
        style={{
          width: '100%',
          maxWidth: '400px',
          background: 'rgba(26,26,46,0.8)',
          border: '1px solid rgba(255,255,255,0.08)',
          borderRadius: 20,
          backdropFilter: 'blur(20px)',
          WebkitBackdropFilter: 'blur(20px)',
          padding: '2.25rem',
          boxShadow: '0 25px 60px rgba(0,0,0,0.4)',
        }}
      >
        {/* Brand */}
        <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
          <motion.div
            animate={{ rotate: [0, 5, -5, 0] }}
            transition={{ repeat: Infinity, duration: 4, ease: 'easeInOut' }}
            style={{
              width: 56,
              height: 56,
              borderRadius: 14,
              background: 'linear-gradient(135deg, #ef4444, #f97316)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              margin: '0 auto 1rem',
              boxShadow: '0 8px 24px rgba(239,68,68,0.4)',
            }}
          >
            <Flame size={26} color="#fff" />
          </motion.div>

          <h1 style={{
            fontFamily: "'Plus Jakarta Sans', sans-serif",
            fontSize: '1.5rem',
            fontWeight: 800,
            color: '#ffffff',
            lineHeight: 1.2,
          }}>
            Tasty Bites
          </h1>
          <p style={{
            fontSize: '0.7rem',
            fontWeight: 600,
            color: 'rgba(239,68,68,0.85)',
            textTransform: 'uppercase',
            letterSpacing: '0.1em',
            marginTop: '0.3rem',
          }}>
            Admin Console
          </p>
        </div>

        {/* Heading */}
        <div style={{ marginBottom: '1.5rem' }}>
          <h2 style={{
            fontFamily: "'Plus Jakarta Sans', sans-serif",
            fontSize: '1.1rem',
            fontWeight: 700,
            color: '#f9fafb',
            marginBottom: '0.25rem',
          }}>
            Welcome back
          </h2>
          <p style={{ fontSize: '0.78rem', color: 'rgba(156,163,175,0.8)', fontWeight: 400 }}>
            Sign in to your admin account
          </p>
        </div>

        {/* Error */}
        <AnimatePresence>
          {error && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.625rem',
                padding: '0.75rem 0.875rem',
                borderRadius: 8,
                background: 'rgba(239,68,68,0.1)',
                border: '1px solid rgba(239,68,68,0.2)',
                marginBottom: '1rem',
                fontSize: '0.78rem',
                fontWeight: 600,
                color: '#f87171',
              }}
            >
              <AlertCircle size={14} style={{ flexShrink: 0 }} />
              {error}
            </motion.div>
          )}
        </AnimatePresence>

        {/* Form */}
        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '0.875rem' }}>

          {/* Email */}
          <div>
            <label style={{
              fontSize: '0.72rem',
              fontWeight: 600,
              color: 'rgba(209,213,219,0.85)',
              display: 'block',
              marginBottom: '0.4rem',
              letterSpacing: '0.02em',
            }}>
              Admin Email
            </label>
            <div style={{ position: 'relative' }}>
              <Mail
                size={14}
                style={{
                  position: 'absolute',
                  left: '0.875rem',
                  top: '50%',
                  transform: 'translateY(-50%)',
                  color: 'rgba(156,163,175,0.6)',
                }}
              />
              <input
                type="email"
                required
                placeholder="admin@restaurant.com"
                value={email}
                onChange={e => setEmail(e.target.value)}
                style={{
                  width: '100%',
                  padding: '0.7rem 0.875rem 0.7rem 2.25rem',
                  background: 'rgba(255,255,255,0.05)',
                  border: '1px solid rgba(255,255,255,0.1)',
                  borderRadius: 8,
                  fontSize: '0.82rem',
                  color: '#f9fafb',
                  fontFamily: "'Inter', sans-serif",
                  outline: 'none',
                  transition: 'all 0.18s ease',
                }}
                onFocus={e => { e.target.style.borderColor = '#ef4444'; e.target.style.boxShadow = '0 0 0 3px rgba(239,68,68,0.15)'; }}
                onBlur={e => { e.target.style.borderColor = 'rgba(255,255,255,0.1)'; e.target.style.boxShadow = 'none'; }}
              />
            </div>
          </div>

          {/* Password */}
          <div>
            <label style={{
              fontSize: '0.72rem',
              fontWeight: 600,
              color: 'rgba(209,213,219,0.85)',
              display: 'block',
              marginBottom: '0.4rem',
              letterSpacing: '0.02em',
            }}>
              Password
            </label>
            <div style={{ position: 'relative' }}>
              <Lock
                size={14}
                style={{
                  position: 'absolute',
                  left: '0.875rem',
                  top: '50%',
                  transform: 'translateY(-50%)',
                  color: 'rgba(156,163,175,0.6)',
                }}
              />
              <input
                type={showPwd ? 'text' : 'password'}
                required
                placeholder="••••••••••"
                value={password}
                onChange={e => setPassword(e.target.value)}
                style={{
                  width: '100%',
                  padding: '0.7rem 2.5rem 0.7rem 2.25rem',
                  background: 'rgba(255,255,255,0.05)',
                  border: '1px solid rgba(255,255,255,0.1)',
                  borderRadius: 8,
                  fontSize: '0.82rem',
                  color: '#f9fafb',
                  fontFamily: "'Inter', sans-serif",
                  outline: 'none',
                  transition: 'all 0.18s ease',
                }}
                onFocus={e => { e.target.style.borderColor = '#ef4444'; e.target.style.boxShadow = '0 0 0 3px rgba(239,68,68,0.15)'; }}
                onBlur={e => { e.target.style.borderColor = 'rgba(255,255,255,0.1)'; e.target.style.boxShadow = 'none'; }}
              />
              <button
                type="button"
                onClick={() => setShowPwd(v => !v)}
                style={{
                  position: 'absolute',
                  right: '0.75rem',
                  top: '50%',
                  transform: 'translateY(-50%)',
                  background: 'none',
                  border: 'none',
                  color: 'rgba(156,163,175,0.6)',
                  cursor: 'pointer',
                  padding: 2,
                  display: 'flex',
                  alignItems: 'center',
                }}
              >
                {showPwd ? <EyeOff size={14} /> : <Eye size={14} />}
              </button>
            </div>
          </div>

          {/* Submit */}
          <motion.button
            type="submit"
            disabled={submitting}
            whileHover={!submitting ? { scale: 1.02 } : {}}
            whileTap={!submitting ? { scale: 0.98 } : {}}
            style={{
              width: '100%',
              padding: '0.85rem',
              borderRadius: 8,
              border: 'none',
              background: submitting
                ? 'rgba(239,68,68,0.5)'
                : 'linear-gradient(135deg, #ef4444, #f97316)',
              color: '#fff',
              fontFamily: "'Inter', sans-serif",
              fontSize: '0.85rem',
              fontWeight: 700,
              cursor: submitting ? 'wait' : 'pointer',
              boxShadow: '0 4px 16px rgba(239,68,68,0.35)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '0.5rem',
              marginTop: '0.5rem',
              transition: 'all 0.18s ease',
            }}
          >
            {submitting ? (
              <>
                <span style={{
                  width: 16, height: 16,
                  border: '2px solid rgba(255,255,255,0.3)',
                  borderTopColor: '#fff',
                  borderRadius: '50%',
                  display: 'inline-block',
                  animation: 'spin 0.7s linear infinite',
                }} />
                Authenticating…
              </>
            ) : (
              <>
                <Zap size={15} />
                Access Admin Panel
              </>
            )}
          </motion.button>
        </form>

        {/* Divider */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '0.75rem',
          margin: '1.5rem 0 1rem',
        }}>
          <div style={{ flex: 1, height: 1, background: 'rgba(255,255,255,0.07)' }} />
          <span style={{ fontSize: '0.65rem', color: 'rgba(156,163,175,0.5)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.08em' }}>
            Protected
          </span>
          <div style={{ flex: 1, height: 1, background: 'rgba(255,255,255,0.07)' }} />
        </div>

        <p style={{
          fontSize: '0.68rem',
          color: 'rgba(107,114,128,0.7)',
          textAlign: 'center',
          lineHeight: 1.5,
        }}>
          Access restricted to authorized administrators only.
          <br />Contact system admin for credential issues.
        </p>
      </motion.div>
    </div>
  );
};

export default Login;
