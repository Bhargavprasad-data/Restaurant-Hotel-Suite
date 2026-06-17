import React, { useState, useEffect } from 'react';
import { useSearchParams, useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import {
  ShieldCheck, CreditCard, CheckCircle, Printer,
  ArrowLeft, Calendar, Smartphone, Globe, Sparkles,
  ChevronRight, Lock, Building2, AlertCircle
} from 'lucide-react';
import toast from 'react-hot-toast';

/* ─── Shimmer ─── */
const BookingSkeleton = () => (
  <div className="space-y-4 animate-fade-in">
    <div className="skeleton h-10 w-64 rounded-2xl" />
    <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
      <div className="lg:col-span-3 space-y-4">
        <div className="skeleton h-48 rounded-2xl" />
        <div className="skeleton h-36 rounded-2xl" />
      </div>
      <div className="lg:col-span-2 skeleton h-80 rounded-2xl" />
    </div>
  </div>
);

/* ─── Payment Method Card ─── */
const PayMethodCard = ({ id, label, icon, selected, onClick }) => (
  <button
    type="button"
    onClick={() => onClick(id)}
    className={`payment-method-card w-full text-left transition-all ${selected ? 'selected' : ''}`}
  >
    <div className="w-10 h-10 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-100 dark:border-slate-700 flex items-center justify-center shrink-0">
      {icon}
    </div>
    <div className="flex-1">
      <p className="text-sm font-semibold text-slate-800 dark:text-slate-200">{label}</p>
      <p className="text-xs text-slate-400 dark:text-slate-500 mt-0.5">Instant confirmation</p>
    </div>
    <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center transition-all ${
      selected ? 'border-slate-900 bg-slate-900 dark:border-white dark:bg-white' : 'border-slate-300 dark:border-slate-600'
    }`}>
      {selected && <div className="w-2 h-2 rounded-full bg-white dark:bg-slate-900" />}
    </div>
  </button>
);

const Booking = () => {
  const { apiFetch } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  const roomId   = searchParams.get('room_id');
  const checkInStr  = searchParams.get('check_in');
  const checkOutStr = searchParams.get('check_out');

  const [booking, setBooking] = useState(null);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);
  const [paymentSuccess, setPaymentSuccess] = useState(false);
  const [method, setMethod] = useState('UPI');
  const [error, setError] = useState(null);

  const fetchedRef = React.useRef(false);

  useEffect(() => {
    if (fetchedRef.current) return;
    fetchedRef.current = true;

    const init = async () => {
      if (!roomId || !checkInStr || !checkOutStr) {
        setError('Invalid booking parameters.');
        setLoading(false);
        return;
      }
      try {
        const data = await apiFetch('/bookings', {
          method: 'POST',
          body: JSON.stringify({
            room_id: roomId,
            check_in_date: checkInStr,
            check_out_date: checkOutStr,
          }),
        });
        setBooking(data.booking);
      } catch (err) {
        setError(err.message || 'Could not create booking draft. The room may already be booked.');
      } finally {
        setLoading(false);
      }
    };
    init();
  }, [roomId, checkInStr, checkOutStr]);

  const handlePayment = async () => {
    setProcessing(true);
    const mockId = `PAY_${Math.random().toString(36).substring(2, 11).toUpperCase()}`;
    try {
      const res = await apiFetch('/payments/verify', {
        method: 'POST',
        body: JSON.stringify({
          booking_id: booking.id,
          razorpay_payment_id: mockId,
          method,
        }),
      });
      setBooking(res.booking);
      setPaymentSuccess(true);
      toast.success('Payment confirmed! 🎉');
    } catch (err) {
      toast.error(err.message || 'Payment failed. Please try again.');
    } finally {
      setProcessing(false);
    }
  };

  /* ── Date helpers ── */
  const checkIn  = booking ? new Date(booking.check_in_date) : null;
  const checkOut = booking ? new Date(booking.check_out_date) : null;
  const diffDays = checkIn && checkOut
    ? Math.max(1, Math.ceil((checkOut - checkIn) / (1000 * 60 * 60 * 24)))
    : 0;
  const pricePerDay = booking ? parseFloat(booking.total_price) / diffDays : 0;

  const fmtDate = (d) =>
    d ? new Intl.DateTimeFormat('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }).format(new Date(d)) : '—';

  const PAYMENT_METHODS = [
    { id: 'UPI',        label: 'UPI / GPay / PhonePe', icon: <Smartphone size={20} className="text-slate-500" /> },
    { id: 'Card',       label: 'Credit / Debit Card',   icon: <CreditCard size={20} className="text-slate-500" /> },
    { id: 'NetBanking', label: 'Net Banking',            icon: <Building2 size={20} className="text-slate-500" /> },
  ];

  /* ── Loading ── */
  if (loading) {
    return (
      <div
        className="min-h-screen px-4 py-10 relative"
        style={{
          backgroundImage: `linear-gradient(rgba(15,23,42,0.82), rgba(15,23,42,0.95)), url('https://images.unsplash.com/photo-1542314831-068cd1dbfeeb?auto=format&fit=crop&w=1400&q=80')`,
          backgroundSize: 'cover',
        }}
      >
        <div className="max-w-4xl mx-auto pt-16">
          <BookingSkeleton />
        </div>
      </div>
    );
  }

  /* ── Error state ── */
  if (error || !booking) {
    return (
      <div
        className="min-h-screen flex items-center justify-center px-4 relative"
        style={{
          backgroundImage: `linear-gradient(rgba(15,23,42,0.82), rgba(15,23,42,0.95)), url('https://images.unsplash.com/photo-1542314831-068cd1dbfeeb?auto=format&fit=crop&w=1400&q=80')`,
          backgroundSize: 'cover',
        }}
      >
        <div className="glass rounded-3xl p-8 max-w-md w-full text-center space-y-5 animate-scale-in">
          <div className="w-16 h-16 rounded-3xl bg-red-50 flex items-center justify-center mx-auto text-red-500">
            <AlertCircle size={32} />
          </div>
          <div>
            <h2 className="text-lg font-bold text-slate-900 dark:text-white">Booking Unavailable</h2>
            <p className="text-sm text-slate-500 dark:text-slate-400 mt-2 leading-relaxed">{error || 'Session expired or room no longer available.'}</p>
          </div>
          <Link to="/rooms" className="btn-brand w-full justify-center">
            <ArrowLeft size={16} />
            Browse Other Rooms
          </Link>
        </div>
      </div>
    );
  }

  /* ── Success ── */
  if (paymentSuccess) {
    return (
      <div
        className="min-h-screen flex items-center justify-center px-4 py-10 relative overflow-hidden"
        style={{
          backgroundImage: `linear-gradient(rgba(15,23,42,0.82), rgba(15,23,42,0.95)), url('https://images.unsplash.com/photo-1542314831-068cd1dbfeeb?auto=format&fit=crop&w=1400&q=80')`,
          backgroundSize: 'cover',
        }}
      >
        <div className="absolute w-96 h-96 bg-emerald-500/10 rounded-full blur-[100px] -top-20 left-1/2 -translate-x-1/2 pointer-events-none" />

        <div className="glass rounded-3xl p-8 max-w-md w-full space-y-6 animate-scale-in">
          {/* Success Header */}
          <div className="text-center space-y-4">
            <div className="w-20 h-20 rounded-3xl bg-emerald-50 border-2 border-emerald-100 flex items-center justify-center mx-auto">
              <CheckCircle size={40} className="text-emerald-500" />
            </div>
            <div>
              {booking.payment_status === 'Paid' ? (
                <span className="badge badge-success text-xs">🎉 Booking Confirmed</span>
              ) : (
                <span className="badge bg-amber-500/10 text-amber-600 border border-amber-500/20 text-xs px-2.5 py-1 rounded-md font-bold">🕒 Pay on Arrival</span>
              )}
              <h1 className="text-2xl font-bold text-slate-900 dark:text-white mt-2">You're all set!</h1>
              <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">Your reservation has been confirmed.</p>
            </div>
          </div>

          {/* Booking Details */}
          <div className="bg-slate-50 dark:bg-slate-900/50 rounded-2xl p-5 space-y-3 border border-slate-100 dark:border-slate-800">
            <div className="flex justify-between items-center text-sm">
              <span className="text-slate-500 dark:text-slate-400">Room</span>
              <span className="font-semibold text-slate-900 dark:text-white capitalize">
                {booking.room_type || 'Selected'} — Room {booking.room_number || '—'}
              </span>
            </div>
            <div className="flex justify-between items-center text-sm">
              <span className="text-slate-500 dark:text-slate-400">Check-In</span>
              <span className="font-semibold text-slate-900 dark:text-white">{fmtDate(booking.check_in_date)}</span>
            </div>
            <div className="flex justify-between items-center text-sm">
              <span className="text-slate-500 dark:text-slate-400">Check-Out</span>
              <span className="font-semibold text-slate-900 dark:text-white">{fmtDate(booking.check_out_date)}</span>
            </div>
            <div className="flex justify-between items-center text-sm">
              <span className="text-slate-500 dark:text-slate-400">Duration</span>
              <span className="font-semibold text-slate-900 dark:text-white">{diffDays} night{diffDays > 1 ? 's' : ''}</span>
            </div>
            <div className="border-t border-slate-200 dark:border-slate-800 pt-3 flex justify-between items-center">
              <span className="text-sm font-semibold text-slate-700 dark:text-slate-300">
                {booking.payment_status === 'Paid' ? 'Total Paid' : 'Amount Due'}
              </span>
              <span className={`text-lg font-bold ${booking.payment_status === 'Paid' ? 'text-emerald-600' : 'text-amber-500'}`}>
                ₹{parseFloat(booking.total_price).toLocaleString('en-IN')}
              </span>
            </div>
          </div>

          {/* Booking Reference */}
          <div className="bg-slate-900 rounded-2xl p-4 text-center space-y-2">
            <p className="section-label text-slate-400">Booking Reference</p>
            <p className="font-mono text-lg font-bold text-white tracking-widest">
              TS-{booking.id.substring(0, 8).toUpperCase()}
            </p>
          </div>

          {/* QR Code */}
          <div className="flex flex-col items-center gap-3">
            <p className="section-label">Digital Entry Pass</p>
            <div className="bg-white p-4 rounded-2xl border border-slate-100 shadow-sm">
              <img
                src={`https://api.qrserver.com/v1/create-qr-code/?size=140x140&data=${encodeURIComponent(
                  `${window.location.origin}/my-bookings?search=${booking.id}`
                )}`}
                alt="Entry pass QR"
                className="w-36 h-36"
              />
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400 text-center max-w-xs">
              Show this QR code at the reception desk for express check-in.
            </p>
          </div>

          {/* Actions */}
          <div className="flex gap-3">
            <button
              onClick={() => window.print()}
              className="flex-1 btn-outline py-3 text-sm gap-2"
            >
              <Printer size={15} />
              Print
            </button>
            <Link to="/my-bookings" className="flex-1 btn-brand py-3 text-sm justify-center">
              My Bookings
              <ChevronRight size={15} />
            </Link>
          </div>
        </div>
      </div>
    );
  }

  /* ── Main Checkout ── */
  return (
    <div
      className="min-h-screen px-4 py-10 relative"
      style={{
        backgroundImage: `linear-gradient(rgba(15,23,42,0.8), rgba(15,23,42,0.94)), url('https://images.unsplash.com/photo-1542314831-068cd1dbfeeb?auto=format&fit=crop&w=1400&q=80')`,
        backgroundSize: 'cover',
        backgroundPosition: 'center',
      }}
    >
      <div className="absolute w-96 h-96 bg-[#FF385C]/8 rounded-full blur-[100px] top-20 right-10 pointer-events-none" />

      <div className="max-w-4xl mx-auto pt-10 animate-fade-in-up">
        {/* Back + Title */}
        <div className="flex items-center justify-between mb-8">
          <Link
            to={`/rooms/${roomId}`}
            className="flex items-center gap-2 text-white/70 hover:text-white transition-colors text-sm font-medium"
          >
            <ArrowLeft size={16} />
            Back to Room
          </Link>
          <div className="flex items-center gap-2 px-4 py-2 rounded-full bg-white/10 border border-white/15 backdrop-blur-sm text-white/80 text-xs font-semibold">
            <ShieldCheck size={14} className="text-emerald-400" />
            Secure Checkout
          </div>
        </div>

        <h1 className="text-3xl font-bold text-white mb-2">Confirm & Pay</h1>
        <p className="text-white/50 text-sm mb-8">Review your booking details before confirming</p>

        <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">

          {/* ── LEFT — Payment + Details ── */}
          <div className="lg:col-span-3 space-y-5">

            {/* Booking Summary Card */}
            <div className="glass rounded-3xl p-6 space-y-5">
              <h2 className="font-bold text-slate-900 dark:text-white">Your Booking</h2>

              <div className="flex gap-4 p-4 bg-slate-50 dark:bg-slate-900/50 rounded-2xl border border-slate-100 dark:border-slate-800">
                <div className="w-20 h-20 rounded-2xl overflow-hidden bg-slate-200 shrink-0">
                  <img
                    src="https://images.unsplash.com/photo-1618773928121-c32242e63f39?auto=format&fit=crop&w=200&q=80"
                    alt="Room"
                    className="w-full h-full object-cover"
                  />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-bold text-slate-900 dark:text-white capitalize text-sm">
                    {booking.room_type || 'Premium'} Suite
                  </p>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">Room {booking.room_number || '—'}</p>
                  <div className="flex gap-3 mt-2 text-xs text-slate-600 dark:text-slate-300 font-mono">
                    <span className="flex items-center gap-1"><Calendar size={11} /> {booking.check_in_date?.substring(0, 10)}</span>
                    <span>→</span>
                    <span className="flex items-center gap-1"><Calendar size={11} /> {booking.check_out_date?.substring(0, 10)}</span>
                  </div>
                  <p className="text-xs text-slate-400 dark:text-slate-500 mt-1">{diffDays} night{diffDays > 1 ? 's' : ''}</p>
                </div>
              </div>

              {/* Price Breakdown */}
              <div className="space-y-2.5 text-sm">
                <div className="flex justify-between text-slate-600 dark:text-slate-300">
                  <span>₹{pricePerDay.toFixed(0)} × {diffDays} night{diffDays > 1 ? 's' : ''}</span>
                  <span>₹{parseFloat(booking.total_price).toFixed(0)}</span>
                </div>
                <div className="flex justify-between text-slate-600 dark:text-slate-300">
                  <span>Taxes & fees</span>
                  <span className="text-emerald-600 dark:text-emerald-400 font-medium">Included</span>
                </div>
                <div className="border-t border-slate-200 dark:border-slate-800 pt-2.5 flex justify-between font-bold text-slate-900 dark:text-white text-base">
                  <span>Total (INR)</span>
                  <span>₹{parseFloat(booking.total_price).toLocaleString('en-IN')}</span>
                </div>
              </div>

              {/* Ref */}
              <div className="flex items-center justify-between text-xs text-slate-400 dark:text-slate-400 bg-slate-50 dark:bg-slate-900/50 rounded-xl px-4 py-2.5">
                <span>Booking Reference</span>
                <span className="font-mono font-semibold text-slate-600 dark:text-slate-300">{booking.id.substring(0, 13).toUpperCase()}</span>
              </div>
            </div>

            {/* Payment Methods */}
            <div className="glass rounded-3xl p-6 space-y-4">
              <h2 className="font-bold text-slate-900 dark:text-white">Choose Payment Method</h2>
              <div className="space-y-3">
                {PAYMENT_METHODS.map((pm) => (
                  <PayMethodCard
                    key={pm.id}
                    {...pm}
                    selected={method === pm.id}
                    onClick={setMethod}
                  />
                ))}
              </div>
            </div>
          </div>

          {/* ── RIGHT — Confirm Panel ── */}
          <div className="lg:col-span-2">
            <div className="glass rounded-3xl p-6 space-y-5 sticky top-8">
              <h2 className="font-bold text-slate-900 dark:text-white">Payment Summary</h2>

              <div className="space-y-2 text-sm">
                <div className="flex justify-between text-slate-600 dark:text-slate-400">
                  <span>Room Type</span>
                  <span className="font-medium text-slate-800 dark:text-slate-200 capitalize">{booking.room_type || 'Suite'}</span>
                </div>
                <div className="flex justify-between text-slate-600 dark:text-slate-400">
                  <span>Check-in</span>
                  <span className="font-medium text-slate-800 dark:text-slate-200">{fmtDate(booking.check_in_date)}</span>
                </div>
                <div className="flex justify-between text-slate-600 dark:text-slate-400">
                  <span>Check-out</span>
                  <span className="font-medium text-slate-800 dark:text-slate-200">{fmtDate(booking.check_out_date)}</span>
                </div>
                <div className="flex justify-between text-slate-600 dark:text-slate-400">
                  <span>Method</span>
                  <span className="font-medium text-slate-800 dark:text-slate-200">{method}</span>
                </div>
              </div>

              <div className="border-t border-slate-200 dark:border-slate-800 pt-4 flex justify-between items-center">
                <span className="font-bold text-slate-900 dark:text-white">Total Due</span>
                <span className="text-2xl font-bold text-[#FF385C]">
                  ₹{parseFloat(booking.total_price).toLocaleString('en-IN')}
                </span>
              </div>

              {/* Pay Button */}
              <button
                onClick={handlePayment}
                disabled={processing}
                className="w-full flex items-center justify-center gap-3 py-4 rounded-2xl bg-[#FF385C] hover:bg-[#e0314f] text-white font-bold text-sm transition-all active:scale-[0.98] disabled:opacity-70 disabled:cursor-not-allowed shadow-xl"
                style={{ boxShadow: '0 6px 20px rgba(255,56,92,0.45)' }}
              >
                {processing ? (
                  <>
                    <span className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    Processing…
                  </>
                ) : (
                  <>
                    <Lock size={16} />
                    Confirm & Pay ₹{parseFloat(booking.total_price).toLocaleString('en-IN')}
                  </>
                )}
              </button>

              {/* Trust signals */}
              <div className="space-y-2">
                {[
                  { icon: <ShieldCheck size={13} className="text-emerald-500" />, text: 'SSL encrypted & secure' },
                  { icon: <Lock size={13} className="text-blue-500" />, text: 'No hidden charges' },
                  { icon: <CheckCircle size={13} className="text-[#FF385C]" />, text: 'Instant confirmation email' },
                ].map((item, i) => (
                  <div key={i} className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
                    {item.icon}
                    {item.text}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Booking;
