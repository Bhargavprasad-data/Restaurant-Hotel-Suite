import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, useSearchParams, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { ShieldCheck, RefreshCw, AlertCircle, CheckCircle, Mail, Hotel, ArrowLeft } from 'lucide-react';
import toast from 'react-hot-toast';

const VerifyOtp = () => {
  const { verifyOtp, resendOtp } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const email = searchParams.get('email') || '';

  const [otp, setOtp] = useState(['', '', '', '', '', '']);
  const [timeLeft, setTimeLeft] = useState(300);
  const [loading, setLoading] = useState(false);
  const [resending, setResending] = useState(false);
  const [error, setError] = useState(null);
  const [canResend, setCanResend] = useState(false);
  const [verified, setVerified] = useState(false);

  const inputRefs = useRef(Array.from({ length: 6 }, () => React.createRef()));
  const getRef = (i) => inputRefs.current[i];

  useEffect(() => {
    getRef(0).current?.focus();
  }, []);

  useEffect(() => {
    if (timeLeft <= 0) { setCanResend(true); return; }
    const t = setInterval(() => setTimeLeft((p) => p - 1), 1000);
    return () => clearInterval(t);
  }, [timeLeft]);

  const formatTime = (s) => `${Math.floor(s / 60)}:${(s % 60).toString().padStart(2, '0')}`;

  const handleChange = (idx, val) => {
    if (!/^\d*$/.test(val)) return;
    const next = [...otp];
    next[idx] = val.slice(-1);
    setOtp(next);
    if (val && idx < 5) getRef(idx + 1).current?.focus();
  };

  const handleKeyDown = (idx, e) => {
    if (e.key === 'Backspace' && !otp[idx] && idx > 0) getRef(idx - 1).current?.focus();
  };

  const handlePaste = (e) => {
    const pasted = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 6);
    if (pasted.length === 6) {
      setOtp(pasted.split(''));
      getRef(5).current?.focus();
    }
  };

  const handleVerify = async (e) => {
    e.preventDefault();
    const code = otp.join('');
    if (code.length !== 6) { setError('Please enter the complete 6-digit code.'); return; }
    setLoading(true);
    setError(null);
    const res = await verifyOtp(email, code);
    setLoading(false);
    if (res.success) {
      setVerified(true);
      toast.success('Account verified! Redirecting…');
      setTimeout(() => navigate('/login'), 2000);
    } else {
      setError(res.error || 'Invalid code. Please check and try again.');
      setOtp(['', '', '', '', '', '']);
      getRef(0).current?.focus();
    }
  };

  const handleResend = async () => {
    setResending(true);
    setError(null);
    const res = await resendOtp(email);
    setResending(false);
    if (res.success) {
      toast.success('New OTP sent!');
      setOtp(['', '', '', '', '', '']);
      setTimeLeft(300);
      setCanResend(false);
      getRef(0).current?.focus();
    } else {
      setError(res.error || 'Failed to resend code.');
    }
  };

  return (
    <div
      className="min-h-screen flex items-center justify-center px-4 relative overflow-hidden"
      style={{
        backgroundImage: `linear-gradient(rgba(15,23,42,0.78), rgba(15,23,42,0.93)), url('https://images.unsplash.com/photo-1566073771259-6a8506099945?auto=format&fit=crop&w=1400&q=80')`,
        backgroundSize: 'cover',
        backgroundPosition: 'center',
      }}
    >
      <div className="absolute w-96 h-96 bg-emerald-500/10 rounded-full blur-[100px] -top-20 -left-20 pointer-events-none" />
      <div className="absolute w-96 h-96 bg-[#FF385C]/8 rounded-full blur-[100px] -bottom-20 -right-20 pointer-events-none" />

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
          {verified ? (
            /* ─── Success State ─── */
            <div className="text-center space-y-5 py-4 animate-scale-in">
              <div className="w-20 h-20 rounded-3xl bg-emerald-50 border-2 border-emerald-100 flex items-center justify-center mx-auto">
                <CheckCircle size={40} className="text-emerald-500" />
              </div>
              <div>
                <h2 className="text-2xl font-bold text-slate-900">Verified!</h2>
                <p className="text-sm text-slate-500 mt-2">Your account is active. Redirecting to sign in…</p>
              </div>
              <div className="flex gap-1 justify-center">
                {[...Array(3)].map((_, i) => (
                  <div key={i} className="w-2 h-2 rounded-full bg-emerald-400 animate-bounce" style={{ animationDelay: `${i * 0.15}s` }} />
                ))}
              </div>
            </div>
          ) : (
            <>
              {/* Header */}
              <div className="text-center mb-7">
                <div className="w-16 h-16 rounded-3xl bg-[#FF385C]/8 border border-[#FF385C]/15 flex items-center justify-center mx-auto mb-4">
                  <ShieldCheck size={30} className="text-[#FF385C]" />
                </div>
                <h1 className="text-2xl font-bold text-slate-900">Check your email</h1>
                <p className="text-sm text-slate-500 mt-2 leading-relaxed">
                  We've sent a 6-digit verification code to
                </p>
                <div className="flex items-center justify-center gap-2 mt-1.5 px-4 py-2 rounded-xl bg-slate-50 border border-slate-100 mx-auto w-fit">
                  <Mail size={14} className="text-slate-400" />
                  <span className="text-sm font-semibold text-slate-700 truncate max-w-[220px]">{email}</span>
                </div>
              </div>

              {/* Error */}
              {error && (
                <div className="mb-5 flex items-center gap-3 p-4 rounded-2xl bg-red-50 border border-red-100 text-red-600 text-sm animate-fade-in-up">
                  <AlertCircle size={17} className="shrink-0" />
                  <span>{error}</span>
                </div>
              )}

              <form onSubmit={handleVerify} className="space-y-6">
                {/* OTP Inputs */}
                <div className="space-y-2">
                  <p className="section-label text-center">Enter verification code</p>
                  <div className="flex justify-center gap-3" onPaste={handlePaste}>
                    {otp.map((digit, idx) => (
                      <input
                        key={idx}
                        ref={getRef(idx)}
                        type="text"
                        inputMode="numeric"
                        maxLength={1}
                        value={digit}
                        onChange={(e) => handleChange(idx, e.target.value)}
                        onKeyDown={(e) => handleKeyDown(idx, e)}
                        className={`w-12 h-14 text-center text-xl font-bold rounded-2xl border-2 bg-slate-50 text-slate-900 focus:outline-none transition-all font-mono ${
                          digit
                            ? 'border-[#FF385C] bg-[#FF385C]/5 text-[#FF385C]'
                            : 'border-slate-200 focus:border-[#FF385C] focus:ring-4 focus:ring-[#FF385C]/10'
                        }`}
                      />
                    ))}
                  </div>
                </div>

                {/* Timer */}
                <div className="flex items-center justify-between text-sm">
                  <span className="text-slate-500">Code expires in:</span>
                  {timeLeft > 0 ? (
                    <span className={`font-mono font-semibold ${timeLeft < 60 ? 'text-red-500' : 'text-slate-700'}`}>
                      {formatTime(timeLeft)}
                    </span>
                  ) : (
                    <span className="text-red-500 font-semibold text-xs uppercase tracking-wide">Expired</span>
                  )}
                </div>

                {/* Verify Button */}
                <button
                  type="submit"
                  disabled={loading || otp.join('').length < 6}
                  className="w-full flex items-center justify-center gap-2.5 py-3.5 rounded-2xl bg-[#FF385C] hover:bg-[#e0314f] text-white font-semibold text-sm transition-all active:scale-[0.98] shadow-lg disabled:opacity-50 disabled:cursor-not-allowed"
                  style={{ boxShadow: '0 4px 14px rgba(255,56,92,0.4)' }}
                >
                  {loading ? (
                    <span className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  ) : (
                    <>
                      <CheckCircle size={17} />
                      Verify Account
                    </>
                  )}
                </button>

                {/* Resend */}
                <div className="text-center space-y-2 pt-2">
                  <p className="text-sm text-slate-500">Didn't receive the code?</p>
                  <button
                    type="button"
                    onClick={handleResend}
                    disabled={resending || !canResend}
                    className={`flex items-center gap-2 mx-auto text-sm font-semibold transition-all ${
                      canResend
                        ? 'text-[#FF385C] hover:underline cursor-pointer'
                        : 'text-slate-400 cursor-not-allowed'
                    }`}
                  >
                    <RefreshCw size={14} className={resending ? 'animate-spin' : ''} />
                    {canResend ? 'Resend code' : `Resend in ${formatTime(timeLeft)}`}
                  </button>
                </div>
              </form>
            </>
          )}
        </div>

        <p className="text-center mt-5">
          <Link to="/login" className="text-xs text-white/50 hover:text-white/80 transition-colors">
            ← Back to sign in
          </Link>
        </p>
      </div>
    </div>
  );
};

export default VerifyOtp;
