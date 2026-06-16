import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Flame, Lock, Mail, User, Phone, Clock, AlertTriangle, ChevronDown, Eye, EyeOff } from 'lucide-react';

const Signup = () => {
  const { register } = useAuth();
  const navigate = useNavigate();

  const [name, setName]             = useState('');
  const [email, setEmail]           = useState('');
  const [phone, setPhone]           = useState('');
  const [shiftTiming, setShiftTiming] = useState('09:00 - 17:00');
  const [password, setPassword]     = useState('');
  const [showPass, setShowPass]     = useState(false);
  const [error, setError]           = useState(null);
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);

    if (password.length < 6) {
      setError('Password must be at least 6 characters.');
      return;
    }

    setSubmitting(true);
    try {
      await register(name, email, password, phone, shiftTiming);
      navigate('/');
    } catch (err) {
      setError(err.message || 'Registration failed. Please check your inputs.');
    } finally {
      setSubmitting(false);
    }
  };

  /* Reusable field wrapper */
  const Field = ({ label, icon: Icon, children }) => (
    <div className="space-y-1.5">
      <label
        className="text-[11px] font-bold uppercase tracking-[0.1em]"
        style={{ color: 'var(--text-secondary)' }}
      >
        {label}
      </label>
      <div className="relative">
        <Icon
          size={14}
          className="absolute left-3.5 top-1/2 -translate-y-1/2"
          style={{ color: 'var(--text-muted)' }}
        />
        {children}
      </div>
    </div>
  );

  return (
    <div className="auth-bg min-h-screen w-full flex items-center justify-center p-4">

      {/* Glow blobs */}
      <div
        className="absolute top-1/3 left-1/3 w-72 h-72 rounded-full pointer-events-none"
        style={{
          background: 'radial-gradient(circle, rgba(245,158,11,0.08) 0%, transparent 70%)',
          filter: 'blur(40px)',
        }}
      />
      <div
        className="absolute bottom-1/3 right-1/4 w-56 h-56 rounded-full pointer-events-none"
        style={{
          background: 'radial-gradient(circle, rgba(234,88,12,0.06) 0%, transparent 70%)',
          filter: 'blur(40px)',
        }}
      />

      {/* Card */}
      <div
        className="relative z-10 w-full max-w-[420px] rounded-2xl p-8 shadow-2xl fade-in-up my-6"
        style={{
          background: 'var(--bg-surface)',
          border: '1px solid var(--border)',
        }}
      >
        {/* Brand */}
        <div className="flex flex-col items-center mb-7">
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
            Chef Registration
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

          <Field label="Full Name" icon={User}>
            <input
              id="signup-name"
              type="text"
              required
              placeholder="Chef Auguste"
              value={name}
              onChange={e => setName(e.target.value)}
              className="premium-input"
              style={{ paddingLeft: '36px' }}
            />
          </Field>

          <Field label="Chef Email" icon={Mail}>
            <input
              id="signup-email"
              type="email"
              required
              placeholder="chef@tastybites.com"
              value={email}
              onChange={e => setEmail(e.target.value)}
              className="premium-input"
              style={{ paddingLeft: '36px' }}
            />
          </Field>

          <Field label="Phone Number" icon={Phone}>
            <input
              id="signup-phone"
              type="tel"
              placeholder="+91 98765 43210"
              value={phone}
              onChange={e => setPhone(e.target.value)}
              className="premium-input"
              style={{ paddingLeft: '36px' }}
            />
          </Field>

          <Field label="Shift Assignment" icon={Clock}>
            <select
              id="signup-shift"
              value={shiftTiming}
              onChange={e => setShiftTiming(e.target.value)}
              className="premium-input cursor-pointer appearance-none"
              style={{ paddingLeft: '36px', paddingRight: '36px' }}
            >
              <option value="09:00 - 17:00">Morning Shift (09:00 AM – 05:00 PM)</option>
              <option value="17:00 - 01:00">Evening Shift (05:00 PM – 01:00 AM)</option>
              <option value="01:00 - 09:00">Night Shift (01:00 AM – 09:00 AM)</option>
            </select>
            <ChevronDown
              size={14}
              className="absolute right-3.5 top-1/2 -translate-y-1/2 pointer-events-none"
              style={{ color: 'var(--text-muted)' }}
            />
          </Field>

          <Field label="Secure Password" icon={Lock}>
            <input
              id="signup-password"
              type={showPass ? 'text' : 'password'}
              required
              placeholder="Min. 6 characters"
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
          </Field>

          {/* Submit */}
          <button
            id="signup-submit"
            type="submit"
            disabled={submitting}
            className="w-full py-3 rounded-xl text-[14px] font-bold text-white mt-2
              active:scale-[0.98] transition-all disabled:opacity-60 disabled:cursor-not-allowed
              flex items-center justify-center gap-2 cursor-pointer"
            style={{
              background: 'linear-gradient(135deg, #f59e0b, #ea580c)',
              boxShadow: submitting ? 'none' : '0 4px 16px rgba(245,158,11,0.3)',
            }}
          >
            {submitting ? (
              <span className="h-4 w-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
            ) : (
              'Create Chef Account'
            )}
          </button>
        </form>

        {/* Login link */}
        <div
          className="mt-6 pt-5 text-center border-t"
          style={{ borderColor: 'var(--border)' }}
        >
          <p className="text-[12px]" style={{ color: 'var(--text-muted)' }}>
            Already registered?{' '}
            <Link
              to="/login"
              className="font-bold transition-colors"
              style={{ color: '#f59e0b' }}
            >
              Access Dashboard
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
};

export default Signup;
