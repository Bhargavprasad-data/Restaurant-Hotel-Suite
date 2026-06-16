import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { KeyRound, Mail, AlertCircle, ArrowLeft, CheckCircle, Hotel, Info } from 'lucide-react';
import toast from 'react-hot-toast';

const ForgotPassword = () => {
  const { forgotPassword } = useAuth();
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState(null);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!email) return;
    setLoading(true);
    setError(null);
    const res = await forgotPassword(email);
    setLoading(false);
    if (res.success) {
      setSuccess(true);
      toast.success('Password reset link sent!');
    } else {
      setError(res.error || 'Failed to send reset link. Please try again.');
    }
  };

  return (
    <div
      className="min-h-screen flex items-center justify-center px-4 relative overflow-hidden"
      style={{
        backgroundImage: `linear-gradient(rgba(15,23,42,0.78), rgba(15,23,42,0.93)), url('https://images.unsplash.com/photo-1542314831-068cd1dbfeeb?auto=format&fit=crop&w=1400&q=80')`,
        backgroundSize: 'cover',
        backgroundPosition: 'center',
      }}
    >
      <div className="absolute w-96 h-96 bg-blue-500/8 rounded-full blur-[100px] -top-20 -left-20 pointer-events-none" />
      <div className="absolute w-96 h-96 bg-[#FF385C]/8 rounded-full blur-[100px] -bottom-20 -right-20 pointer-events-none" />

      <div className="w-full max-w-md relative z-10 animate-scale-in">
        {/* Back Link */}
        <div className="mb-4 text-left">
          <Link
            to="/"
            className="inline-flex items-center gap-1.5 text-white/70 hover:text-white text-xs font-semibold bg-white/10 hover:bg-white/20 border border-white/15 px-3 py-1.5 rounded-full transition-all backdrop-blur-sm shadow-sm active:scale-95"
          >
            <ArrowLeft size={13} />
            <span>Back to Home</span>
          </Link>
        </div>

        {/* Logo */}
        <div className="text-center mb-7">
          <Link to="/" className="inline-flex items-center gap-3 group">
            <div className="w-12 h-12 rounded-2xl bg-[#FF385C] flex items-center justify-center shadow-xl">
              <Hotel size={24} className="text-white" />
            </div>
            <div className="text-left">
              <p className="font-bold text-white text-lg leading-tight">Tasty Suites</p>
              <p className="text-white/50 text-xs">Premium Stays</p>
            </div>
          </Link>
        </div>

        <div className="glass rounded-3xl p-8 shadow-2xl">
          {success ? (
            /* ─── Success ─── */
            <div className="text-center space-y-6 py-4 animate-scale-in">
              <div className="w-20 h-20 rounded-3xl bg-emerald-50 border-2 border-emerald-100 flex items-center justify-center mx-auto">
                <CheckCircle size={40} className="text-emerald-500" />
              </div>
              <div>
                <h2 className="text-2xl font-bold text-slate-900">Check your inbox</h2>
                <p className="text-sm text-slate-500 mt-2 leading-relaxed max-w-xs mx-auto">
                  We've sent a password reset link to <span className="font-semibold text-slate-700">{email}</span>.
                  It expires in 15 minutes.
                </p>
              </div>
              <div className="bg-amber-50 border border-amber-100 rounded-2xl p-4 text-xs text-amber-700 leading-relaxed text-left flex items-start gap-2">
                <Info size={14} className="text-amber-600 shrink-0 mt-0.5" />
                <span><strong>Tip:</strong> Check your spam folder if you don't see it in your inbox.</span>
              </div>
              <Link
                to="/login"
                className="flex items-center justify-center gap-2 w-full py-3.5 rounded-2xl bg-[#FF385C] hover:bg-[#e0314f] text-white font-semibold text-sm transition-all shadow-lg"
                style={{ boxShadow: '0 4px 14px rgba(255,56,92,0.4)' }}
              >
                <ArrowLeft size={16} />
                Back to Sign In
              </Link>
            </div>
          ) : (
            <>
              {/* Header */}
              <div className="text-center mb-7">
                <div className="w-16 h-16 rounded-3xl bg-slate-50 border border-slate-100 flex items-center justify-center mx-auto mb-4 shadow-sm">
                  <KeyRound size={28} className="text-[#FF385C]" />
                </div>
                <h1 className="text-2xl font-bold text-slate-900">Reset your password</h1>
                <p className="text-sm text-slate-500 mt-2 leading-relaxed max-w-xs mx-auto">
                  Enter the email address linked to your account and we'll send you a reset link.
                </p>
              </div>

              {/* Error */}
              {error && (
                <div className="mb-5 flex items-center gap-3 p-4 rounded-2xl bg-red-50 border border-red-100 text-red-600 text-sm animate-fade-in-up">
                  <AlertCircle size={17} className="shrink-0" />
                  <span>{error}</span>
                </div>
              )}

              <form onSubmit={handleSubmit} className="space-y-5">
                <div className="space-y-1.5">
                  <label className="section-label">Email Address</label>
                  <div className="relative">
                    <Mail size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
                    <input
                      id="forgot-email"
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

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full flex items-center justify-center gap-2.5 py-3.5 rounded-2xl bg-[#FF385C] hover:bg-[#e0314f] text-white font-semibold text-sm transition-all active:scale-[0.98] shadow-lg disabled:opacity-70"
                  style={{ boxShadow: '0 4px 14px rgba(255,56,92,0.4)' }}
                >
                  {loading ? (
                    <span className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  ) : (
                    'Send Reset Link'
                  )}
                </button>

                <Link
                  to="/login"
                  className="flex items-center justify-center gap-1.5 text-sm text-slate-500 hover:text-slate-800 transition-colors font-medium"
                >
                  <ArrowLeft size={15} />
                  Back to Sign In
                </Link>
              </form>
            </>
          )}
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

export default ForgotPassword;
