import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { User, Mail, Lock, Phone, AlertCircle, UserPlus, Eye, EyeOff, CheckCircle, Hotel, ArrowLeft } from 'lucide-react';
import toast from 'react-hot-toast';

const passwordStrength = (pwd) => {
  let score = 0;
  if (pwd.length >= 8) score++;
  if (/[A-Z]/.test(pwd)) score++;
  if (/[0-9]/.test(pwd)) score++;
  if (/[^A-Za-z0-9]/.test(pwd)) score++;
  return score;
};

const STRENGTH_LABELS = ['', 'Weak', 'Fair', 'Good', 'Strong'];
const STRENGTH_COLORS = ['', 'bg-red-400', 'bg-amber-400', 'bg-yellow-400', 'bg-emerald-400'];

const Signup = () => {
  const { signup } = useAuth();
  const navigate = useNavigate();

  const [form, setForm] = useState({ name: '', email: '', phone: '', password: '' });
  const [showPass, setShowPass] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const set = (key) => (e) => setForm((p) => ({ ...p, [key]: e.target.value }));

  const strength = passwordStrength(form.password);

  const handleSubmit = async (e) => {
    e.preventDefault();
    const { name, email, phone, password } = form;
    if (!name || !email || !password || !phone) { setError('Please fill in all fields.'); return; }
    setLoading(true);
    setError(null);
    const res = await signup(name, email, password, phone);
    setLoading(false);
    if (res.success) {
      toast.success('OTP sent to your email! Check your inbox.');
      navigate(`/verify-otp?email=${encodeURIComponent(email)}`);
    } else {
      setError(res.error || 'Registration failed. Please try again.');
    }
  };

  const fields = [
    { key: 'name',     icon: <User size={16} />,  type: 'text',     placeholder: 'Rahul Sharma',       label: 'Full Name', autoComplete: 'name' },
    { key: 'email',    icon: <Mail size={16} />,  type: 'email',    placeholder: 'name@example.com',   label: 'Email Address', autoComplete: 'email' },
    { key: 'phone',    icon: <Phone size={16} />, type: 'tel',      placeholder: '+91 9876543210',      label: 'Phone Number', autoComplete: 'tel' },
  ];

  return (
    <div
      className="min-h-screen flex items-center justify-center px-4 py-8 relative overflow-hidden"
      style={{
        backgroundImage: `linear-gradient(rgba(15,23,42,0.75), rgba(15,23,42,0.92)), url('https://images.unsplash.com/photo-1631049307264-da0ec9d70304?auto=format&fit=crop&w=1400&q=80')`,
        backgroundSize: 'cover',
        backgroundPosition: 'center',
      }}
    >
      {/* Orbs */}
      <div className="absolute w-96 h-96 bg-[#FF385C]/10 rounded-full blur-[100px] -top-16 -right-16 pointer-events-none" />
      <div className="absolute w-96 h-96 bg-indigo-500/8 rounded-full blur-[100px] -bottom-16 -left-16 pointer-events-none" />

      <div className="w-full max-w-md relative z-10 animate-scale-in">

        {/* Back Button */}
        <div className="mb-4 text-left">
          <button
            onClick={() => navigate('/')}
            className="inline-flex items-center gap-1.5 text-white/70 hover:text-white text-xs font-semibold bg-white/10 hover:bg-white/20 border border-white/15 px-3 py-1.5 rounded-full transition-all backdrop-blur-sm shadow-sm active:scale-95"
          >
            <ArrowLeft size={13} />
            <span>Back to Home</span>
          </button>
        </div>

        {/* Logo */}
        <div className="text-center mb-7">
          <Link to="/" className="inline-flex items-center gap-3 group">
            <div className="w-12 h-12 rounded-2xl bg-[#FF385C] flex items-center justify-center shadow-xl group-hover:scale-105 transition-transform">
              <Hotel size={24} className="text-white" />
            </div>
            <div className="text-left">
              <p className="font-bold text-white text-lg leading-tight">Tasty Suites</p>
              <p className="text-white/50 text-xs">Premium Stays</p>
            </div>
          </Link>
        </div>

        {/* Card */}
        <div className="glass rounded-3xl p-8 shadow-2xl">
          <div className="mb-6">
            <h1 className="text-2xl font-bold text-slate-900">Create your account</h1>
            <p className="text-sm text-slate-500 mt-1">Join Tasty Suites and start booking premium stays</p>
          </div>

          {/* Error */}
          {error && (
            <div className="mb-5 flex items-center gap-3 p-4 rounded-2xl bg-red-50 border border-red-100 text-red-600 text-sm animate-fade-in-up">
              <AlertCircle size={17} className="shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Text fields */}
            {fields.map(({ key, icon, type, placeholder, label, autoComplete }) => (
              <div key={key} className="space-y-1.5">
                <label className="section-label">{label}</label>
                <div className="relative">
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400">{icon}</span>
                  <input
                    id={`signup-${key}`}
                    type={type}
                    value={form[key]}
                    onChange={set(key)}
                    placeholder={placeholder}
                    autoComplete={autoComplete}
                    className="input-field pl-11"
                    required
                  />
                  {form[key] && (
                    <CheckCircle size={15} className="absolute right-4 top-1/2 -translate-y-1/2 text-emerald-500" />
                  )}
                </div>
              </div>
            ))}

            {/* Password with strength */}
            <div className="space-y-1.5">
              <label className="section-label">Password</label>
              <div className="relative">
                <Lock size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  id="signup-password"
                  type={showPass ? 'text' : 'password'}
                  value={form.password}
                  onChange={set('password')}
                  placeholder="Min. 8 characters"
                  autoComplete="new-password"
                  className="input-field pl-11 pr-11"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPass(!showPass)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors"
                >
                  {showPass ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
              {/* Strength meter */}
              {form.password && (
                <div className="space-y-1 animate-fade-in">
                  <div className="flex gap-1">
                    {[1, 2, 3, 4].map((i) => (
                      <div
                        key={i}
                        className={`h-1 flex-1 rounded-full transition-all ${i <= strength ? STRENGTH_COLORS[strength] : 'bg-slate-200'}`}
                      />
                    ))}
                  </div>
                  <p className="text-xs text-slate-500">
                    Password strength: <span className="font-semibold text-slate-700">{STRENGTH_LABELS[strength]}</span>
                  </p>
                </div>
              )}
            </div>

            {/* Submit */}
            <button
              type="submit"
              id="signup-submit"
              disabled={loading}
              className="w-full mt-2 flex items-center justify-center gap-2.5 py-3.5 rounded-2xl bg-[#FF385C] hover:bg-[#e0314f] text-white font-semibold text-sm transition-all active:scale-[0.98] shadow-lg disabled:opacity-70 disabled:cursor-not-allowed"
              style={{ boxShadow: '0 4px 14px rgba(255,56,92,0.4)' }}
            >
              {loading ? (
                <span className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
              ) : (
                <>
                  <UserPlus size={17} />
                  Create Account
                </>
              )}
            </button>
          </form>

          {/* Terms */}
          <p className="text-xs text-slate-400 text-center mt-4 leading-relaxed">
            By registering, you agree to our{' '}
            <span className="text-slate-600 font-medium cursor-pointer hover:underline">Terms of Service</span>{' '}
            and{' '}
            <span className="text-slate-600 font-medium cursor-pointer hover:underline">Privacy Policy</span>.
          </p>

          <div className="flex items-center gap-3 my-5">
            <div className="flex-1 h-px bg-slate-200" />
            <span className="text-xs text-slate-400">or</span>
            <div className="flex-1 h-px bg-slate-200" />
          </div>

          <p className="text-center text-sm text-slate-600">
            Already have an account?{' '}
            <Link to="/login" className="text-[#FF385C] font-semibold hover:underline">
              Sign In
            </Link>
          </p>
        </div>

        <p className="text-center mt-5">
          <Link to="/" className="text-xs text-white/50 hover:text-white/80 transition-colors">
            ← Back to homepage
          </Link>
        </p>
      </div>
    </div>
  );
};

export default Signup;
