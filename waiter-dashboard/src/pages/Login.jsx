import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import {
  Flame, Lock, Mail, AlertTriangle,
  User, Phone, Clock, Eye, EyeOff,
  CheckCircle2, ArrowRight, ChevronDown,
} from 'lucide-react';

/* ── Password strength ── */
const getStrength = (pw) => {
  let s = 0;
  if (pw.length >= 8)          s++;
  if (/[A-Z]/.test(pw))        s++;
  if (/[0-9]/.test(pw))        s++;
  if (/[^A-Za-z0-9]/.test(pw)) s++;
  return s;
};
const STRENGTH_LABEL = ['Too short', 'Weak', 'Fair', 'Good', 'Strong'];
const STRENGTH_COLOR = ['#ef4444', '#f97316', '#eab308', '#22c55e', '#10b981'];

/* ── Reusable labeled input wrapper ── */
const Field = ({ label, required, children }) => (
  <div className="flex flex-col gap-1.5">
    <label className="text-[10px] font-bold uppercase tracking-[0.12em] text-slate-500 dark:text-slate-500">
      {label}{required && <span className="text-rose-400 ml-0.5">*</span>}
    </label>
    {children}
  </div>
);

/* ── Input with icon ── */
const IconInput = ({ icon: Icon, right, className = '', ...props }) => (
  <div className="relative">
    <Icon size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
    <input
      {...props}
      className={`
        w-full pl-10 pr-10 py-2.5 rounded-xl text-[13px] font-medium
        bg-slate-50 dark:bg-white/[0.05]
        border border-slate-200 dark:border-white/[0.09]
        text-slate-800 dark:text-slate-100
        placeholder-slate-400 dark:placeholder-slate-600
        focus:outline-none focus:border-emerald-500/60 focus:ring-2 focus:ring-emerald-500/10
        transition-all duration-150
        ${className}
      `}
    />
    {right}
  </div>
);

/* ═══════════════════════════════════════════════ */

const Login = () => {
  const { login, register } = useAuth();
  const navigate = useNavigate();

  /* ── Mode ── */
  const [mode, setMode] = useState('signin');

  /* ── Shared fields ── */
  const [email, setEmail]       = useState('');
  const [password, setPassword] = useState('');
  const [showPw, setShowPw]     = useState(false);
  const [showConfirmPw, setShowConfirmPw] = useState(false);

  /* ── Sign-up only ── */
  const [name, setName]         = useState('');
  const [phone, setPhone]       = useState('');
  const [shift, setShift]       = useState('09:00 - 17:00');
  const [confirmPw, setConfirmPw] = useState('');

  /* ── UI state ── */
  const [error, setError]       = useState(null);
  const [success, setSuccess]   = useState(null);
  const [submitting, setSubmitting] = useState(false);

  const pwStrength = getStrength(password);

  const switchMode = (m) => {
    setMode(m);
    setError(null);
    setSuccess(null);
  };

  /* ── Sign In ── */
  const handleSignIn = async (e) => {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      await login(email, password);
      navigate('/');
    } catch (err) {
      setError(err.message || 'Invalid credentials. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  /* ── Sign Up ── */
  const handleSignUp = async (e) => {
    e.preventDefault();
    setError(null);

    if (password !== confirmPw) { setError('Passwords do not match.'); return; }
    if (password.length < 6)    { setError('Password must be at least 6 characters.'); return; }
    if (phone && !/^\d{10}$/.test(phone)) { setError('Phone number must be exactly 10 digits.'); return; }

    setSubmitting(true);
    try {
      await register({ name, email, password, phone_number: phone, shift_timing: shift, role: 'waiter' });
      navigate('/');
    } catch (err) {
      if (err.message?.toLowerCase().includes('already exists')) {
        setSuccess('✅ Account found! Redirecting to Sign In…');
        setTimeout(() => {
          setSuccess(null);
          setMode('signin');
          setPassword('');
        }, 1800);
      } else {
        setError(err.message || 'Registration failed. Please try again.');
      }
    } finally {
      setSubmitting(false);
    }
  };

  /* ══════════════════════════════════════════════════════ */
  return (
    <div className="min-h-screen w-full flex items-center justify-center p-4
      bg-slate-50 dark:bg-[#0d0f18]
      bg-[radial-gradient(ellipse_at_top,rgba(34,197,94,0.07),transparent_60%)]">

      <div className="w-full max-w-[400px] flex flex-col gap-4">

        {/* ── Card ── */}
        <div
          className="w-full rounded-2xl overflow-hidden
            bg-white dark:bg-[#111420]
            border border-slate-100 dark:border-white/[0.08]
            shadow-2xl shadow-black/10 dark:shadow-black/60"
        >

          {/* ── Brand header ── */}
          <div className="flex flex-col items-center px-8 pt-8 pb-6
            border-b border-slate-100 dark:border-white/[0.07]">
            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-emerald-500 to-emerald-700
              flex items-center justify-center mb-4
              shadow-lg shadow-emerald-500/30">
              <Flame size={22} className="text-white" />
            </div>
            <h1 className="text-[20px] font-bold text-slate-800 dark:text-white tracking-tight">
              Tasty Bites
            </h1>
            <p className="text-[10px] font-semibold uppercase tracking-[0.14em]
              text-slate-400 dark:text-slate-600 mt-0.5">
              Waiter Operations Portal
            </p>
          </div>



          {/* ── Alerts ── */}
          <div className="px-6 pt-4 space-y-2">
            {error && (
              <div className="flex items-start gap-2.5 px-3.5 py-3 rounded-xl
                bg-rose-50 dark:bg-rose-500/[0.08]
                border border-rose-100 dark:border-rose-500/[0.2]
                text-rose-600 dark:text-rose-400 text-[12px] font-medium">
                <AlertTriangle size={14} className="shrink-0 mt-0.5" />
                <span>{error}</span>
              </div>
            )}
            {success && (
              <div className="flex items-start gap-2.5 px-3.5 py-3 rounded-xl
                bg-emerald-50 dark:bg-emerald-500/[0.08]
                border border-emerald-100 dark:border-emerald-500/[0.2]
                text-emerald-700 dark:text-emerald-400 text-[12px] font-medium">
                <CheckCircle2 size={14} className="shrink-0 mt-0.5" />
                <span>{success}</span>
              </div>
            )}
          </div>

          {/* ══════════ SIGN IN ══════════ */}
          {mode === 'signin' && (
            <form onSubmit={handleSignIn} className="px-6 pt-4 pb-7 space-y-4">

              <Field label="Staff Email" required>
                <IconInput
                  icon={Mail}
                  type="email"
                  required
                  placeholder="your@email.com"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  autoComplete="email"
                />
              </Field>

              <Field label="Password" required>
                <IconInput
                  icon={Lock}
                  type={showPw ? 'text' : 'password'}
                  required
                  placeholder="Enter your password"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  autoComplete="current-password"
                  right={
                    <button
                      type="button"
                      onClick={() => setShowPw(v => !v)}
                      tabIndex={-1}
                      className="absolute right-3.5 top-1/2 -translate-y-1/2
                        text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 transition-colors"
                    >
                      {showPw ? <EyeOff size={14} /> : <Eye size={14} />}
                    </button>
                  }
                />
              </Field>

              <button
                type="submit"
                disabled={submitting}
                className="w-full py-3 rounded-xl text-[14px] font-bold text-white
                  bg-emerald-500 hover:bg-emerald-600
                  active:scale-[0.98] transition-all
                  shadow-lg shadow-emerald-500/25
                  flex items-center justify-center gap-2 mt-2
                  disabled:opacity-60 disabled:cursor-not-allowed"
              >
                {submitting
                  ? <span className="h-4 w-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  : <><span>Access Waiter Dashboard</span><ArrowRight size={15} /></>
                }
              </button>

              {/* Demo credentials */}
              <div className="pt-3 border-t border-slate-100 dark:border-white/[0.07] text-center">
                <p className="text-[10px] font-semibold uppercase tracking-[0.1em]
                  text-slate-400 dark:text-slate-600 mb-2">
                  Quick Demo Login
                </p>
                <button
                  type="button"
                  onClick={() => { setEmail('waiter1@restaurant.com'); setPassword('waiter123'); }}
                  className="px-4 py-2 rounded-lg text-[11px] font-semibold
                    text-slate-500 dark:text-slate-400
                    bg-slate-50 dark:bg-white/[0.04]
                    border border-slate-200 dark:border-white/[0.08]
                    hover:bg-slate-100 dark:hover:bg-white/[0.07]
                    hover:text-slate-700 dark:hover:text-slate-300
                    transition-all"
                >
                  Fill Waiter Demo Credentials
                </button>
              </div>

              <p className="text-center text-[11px] text-slate-400 dark:text-slate-600">
                Don't have an account?{' '}
                <button
                  type="button"
                  onClick={() => switchMode('signup')}
                  className="text-emerald-600 dark:text-emerald-400 font-bold hover:underline"
                >
                  Sign Up
                </button>
              </p>
            </form>
          )}

          {/* ══════════ SIGN UP ══════════ */}
          {mode === 'signup' && (
            <form onSubmit={handleSignUp} className="px-6 pt-4 pb-7 space-y-4">

              {/* Waiter role badge — informational only, not selectable */}
              <div className="flex items-center gap-2.5 px-3.5 py-2.5 rounded-xl
                bg-emerald-50 dark:bg-emerald-500/[0.08]
                border border-emerald-100 dark:border-emerald-500/[0.2]">
                <div className="w-7 h-7 rounded-lg bg-emerald-500 flex items-center justify-center shrink-0">
                  <User size={13} className="text-white" />
                </div>
                <div>
                  <div className="text-[12px] font-bold text-emerald-700 dark:text-emerald-400">
                    Waiter Registration
                  </div>
                  <div className="text-[10px] text-emerald-600/70 dark:text-emerald-500/70">
                    Creating a waiter account for this portal
                  </div>
                </div>
              </div>

              <Field label="Full Name" required>
                <IconInput
                  icon={User}
                  type="text"
                  required
                  placeholder="Your full name"
                  value={name}
                  onChange={e => setName(e.target.value)}
                  autoComplete="name"
                />
              </Field>

              <Field label="Email Address" required>
                <IconInput
                  icon={Mail}
                  type="email"
                  required
                  placeholder="your@email.com"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  autoComplete="email"
                />
              </Field>

              <Field label="Mobile Number (optional)">
                <IconInput
                  icon={Phone}
                  type="tel"
                  pattern="[0-9]{10}"
                  placeholder="10-digit number"
                  value={phone}
                  onChange={e => setPhone(e.target.value)}
                  autoComplete="tel"
                />
              </Field>

              <Field label="Shift Timing">
                <div className="relative">
                  <Clock size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                  <select
                    value={shift}
                    onChange={e => setShift(e.target.value)}
                    className="w-full pl-10 pr-10 py-2.5 rounded-xl text-[13px] font-medium
                      bg-slate-50 dark:bg-white/[0.05]
                      border border-slate-200 dark:border-white/[0.09]
                      text-slate-800 dark:text-slate-100
                      focus:outline-none focus:border-emerald-500/60 focus:ring-2 focus:ring-emerald-500/10
                      appearance-none cursor-pointer transition-all"
                  >
                    <option value="09:00 - 17:00">Morning — 09:00 to 17:00</option>
                    <option value="12:00 - 20:00">Afternoon — 12:00 to 20:00</option>
                    <option value="17:00 - 01:00">Evening — 17:00 to 01:00</option>
                    <option value="00:00 - 08:00">Night — 00:00 to 08:00</option>
                  </select>
                  <ChevronDown size={14} className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                </div>
              </Field>

              <Field label="Password" required>
                <IconInput
                  icon={Lock}
                  type={showPw ? 'text' : 'password'}
                  required
                  placeholder="Min. 6 characters"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  autoComplete="new-password"
                  right={
                    <button
                      type="button"
                      onClick={() => setShowPw(v => !v)}
                      tabIndex={-1}
                      className="absolute right-3.5 top-1/2 -translate-y-1/2
                        text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 transition-colors"
                    >
                      {showPw ? <EyeOff size={14} /> : <Eye size={14} />}
                    </button>
                  }
                />
                {/* Strength meter */}
                {password.length > 0 && (
                  <div className="flex flex-col gap-1 mt-1">
                    <div className="flex gap-1">
                      {[1, 2, 3, 4].map(i => (
                        <div
                          key={i}
                          className="flex-1 h-[3px] rounded-full transition-all duration-300"
                          style={{ background: i <= pwStrength ? STRENGTH_COLOR[pwStrength] : 'rgba(100,116,139,0.2)' }}
                        />
                      ))}
                    </div>
                    <span className="text-[10px] font-semibold" style={{ color: STRENGTH_COLOR[pwStrength] }}>
                      {STRENGTH_LABEL[pwStrength]}
                    </span>
                  </div>
                )}
              </Field>

              <Field label="Confirm Password" required>
                <IconInput
                  icon={Lock}
                  type={showConfirmPw ? 'text' : 'password'}
                  required
                  placeholder="Repeat your password"
                  value={confirmPw}
                  onChange={e => setConfirmPw(e.target.value)}
                  autoComplete="new-password"
                  className={confirmPw && confirmPw !== password
                    ? '!border-rose-400 dark:!border-rose-500/50 !text-rose-600 dark:!text-rose-400'
                    : ''
                  }
                  right={
                    confirmPw && confirmPw === password
                      ? <CheckCircle2 size={14} className="absolute right-3.5 top-1/2 -translate-y-1/2 text-emerald-500 pointer-events-none" />
                      : (
                        <button
                          type="button"
                          onClick={() => setShowConfirmPw(v => !v)}
                          tabIndex={-1}
                          className="absolute right-3.5 top-1/2 -translate-y-1/2
                            text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 transition-colors"
                        >
                          {showConfirmPw ? <EyeOff size={14} /> : <Eye size={14} />}
                        </button>
                      )
                  }
                />
              </Field>

              <button
                type="submit"
                disabled={submitting}
                className="w-full py-3 rounded-xl text-[14px] font-bold text-white
                  bg-emerald-500 hover:bg-emerald-600
                  active:scale-[0.98] transition-all
                  shadow-lg shadow-emerald-500/25
                  flex items-center justify-center gap-2 mt-1
                  disabled:opacity-60 disabled:cursor-not-allowed"
              >
                {submitting
                  ? <span className="h-4 w-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  : <><span>Create Waiter Account</span><ArrowRight size={15} /></>
                }
              </button>

              <p className="text-center text-[11px] text-slate-400 dark:text-slate-600">
                Already have an account?{' '}
                <button
                  type="button"
                  onClick={() => switchMode('signin')}
                  className="text-emerald-600 dark:text-emerald-400 font-bold hover:underline"
                >
                  Sign In
                </button>
              </p>
            </form>
          )}
        </div>

        {/* Footer */}
        <p className="text-center text-[10px] font-medium text-slate-400 dark:text-slate-700">
          Tasty Bites Restaurant Management System
        </p>
      </div>
    </div>
  );
};

export default Login;
