import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Mail, Lock, LogIn, AlertCircle, Eye, EyeOff, Hotel, ArrowLeft } from 'lucide-react';
import toast from 'react-hot-toast';

const Login = () => {
  const { login } = useAuth();
  const navigate = useNavigate();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPass, setShowPass] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!email || !password) { setError('Please fill in all fields.'); return; }
    setLoading(true);
    setError(null);
    const res = await login(email, password);
    setLoading(false);
    if (res.success) {
      toast.success('Welcome back! 👋');
      navigate('/');
    } else {
      if (res.unverified) {
        toast.error('Email unverified. Redirecting…');
        navigate(`/verify-otp?email=${encodeURIComponent(res.email)}`);
      } else {
        setError(res.error || 'Invalid credentials. Please try again.');
      }
    }
  };

  return (
    <div
      className="min-h-screen flex items-center justify-center px-4 relative overflow-hidden"
      style={{
        backgroundImage: `linear-gradient(rgba(15,23,42,0.75), rgba(15,23,42,0.92)), url('https://images.unsplash.com/photo-1566073771259-6a8506099945?auto=format&fit=crop&w=1400&q=80')`,
        backgroundSize: 'cover',
        backgroundPosition: 'center',
      }}
    >
      {/* Decorative orbs */}
      <div className="absolute w-96 h-96 bg-[#FF385C]/12 rounded-full blur-[100px] -top-20 -left-20 pointer-events-none" />
      <div className="absolute w-96 h-96 bg-blue-500/10 rounded-full blur-[100px] -bottom-20 -right-20 pointer-events-none" />

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

        {/* Logo header */}
        <div className="text-center mb-8">
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
          <div className="mb-7">
            <h1 className="text-2xl font-bold text-slate-900">Welcome back</h1>
            <p className="text-sm text-slate-500 mt-1">Sign in to manage your reservations</p>
          </div>

          {/* Error Alert */}
          {error && (
            <div className="mb-5 flex items-center gap-3 p-4 rounded-2xl bg-red-50 border border-red-100 text-red-600 text-sm animate-fade-in-up">
              <AlertCircle size={17} className="shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Email */}
            <div className="space-y-1.5">
              <label className="section-label">Email Address</label>
              <div className="relative">
                <Mail size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  id="login-email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="name@example.com"
                  className="input-field pl-11"
                  required
                  autoComplete="email"
                />
              </div>
            </div>

            {/* Password */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <label className="section-label">Password</label>
                <Link to="/forgot-password" className="text-xs text-[#FF385C] font-medium hover:underline">
                  Forgot password?
                </Link>
              </div>
              <div className="relative">
                <Lock size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  id="login-password"
                  type={showPass ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="input-field pl-11 pr-11"
                  required
                  autoComplete="current-password"
                />
                <button
                  type="button"
                  onClick={() => setShowPass(!showPass)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors"
                >
                  {showPass ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            {/* Submit */}
            <button
              type="submit"
              id="login-submit"
              disabled={loading}
              className="w-full mt-2 flex items-center justify-center gap-2.5 py-3.5 rounded-2xl bg-[#FF385C] hover:bg-[#e0314f] text-white font-semibold text-sm transition-all active:scale-[0.98] shadow-lg disabled:opacity-70 disabled:cursor-not-allowed"
              style={{ boxShadow: '0 4px 14px rgba(255,56,92,0.4)' }}
            >
              {loading ? (
                <span className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
              ) : (
                <>
                  <LogIn size={17} />
                  Sign In to Your Account
                </>
              )}
            </button>
          </form>

          {/* Divider */}
          <div className="flex items-center gap-3 my-6">
            <div className="flex-1 h-px bg-slate-200" />
            <span className="text-xs text-slate-400 font-medium">or</span>
            <div className="flex-1 h-px bg-slate-200" />
          </div>

          {/* Sign up link */}
          <p className="text-center text-sm text-slate-600">
            New to Tasty Suites?{' '}
            <Link to="/signup" className="text-[#FF385C] font-semibold hover:underline">
              Create a free account
            </Link>
          </p>
        </div>

        {/* Back to home */}
        <p className="text-center mt-5">
          <Link to="/" className="text-xs text-white/50 hover:text-white/80 transition-colors">
            ← Back to homepage
          </Link>
        </p>
      </div>
    </div>
  );
};

export default Login;
