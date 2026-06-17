import React, { useState, useEffect, useRef } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { createPortal } from 'react-dom';
import { useAuth } from '../context/AuthContext';
import { useSocket } from '../context/SocketContext';
import {
  Calendar, XCircle, ClipboardList, ExternalLink,
  BedDouble, CreditCard, ChevronRight, RefreshCw,
  CheckCircle, Hotel, LogOut, Clock, ArrowLeft,
  X, Printer, Bell
} from 'lucide-react';
import toast from 'react-hot-toast';

const getRoomImage = (imageUrl) => {
  if (!imageUrl) return '';
  if (imageUrl.startsWith('[')) {
    try {
      const arr = JSON.parse(imageUrl);
      return arr[0] || '';
    } catch (e) {
      return imageUrl;
    }
  }
  return imageUrl;
};

const formatDateTime = (dateStr) => {
  if (!dateStr) return '';
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return dateStr;
  
  const hasTime = dateStr.includes(':') || (typeof dateStr === 'string' && dateStr.length > 10);
  if (hasTime) {
    const timeOptions = { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: true };
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')} ${d.toLocaleTimeString('en-US', timeOptions)}`;
  }
  return dateStr.substring(0, 10);
};

/* ─── Shimmer Skeleton Card ─── */
const BookingSkeletonCard = () => (
  <div className="card p-5 flex flex-col sm:flex-row gap-5 animate-fade-in">
    <div className="skeleton w-full sm:w-32 h-28 rounded-2xl shrink-0" />
    <div className="flex-1 space-y-3">
      <div className="skeleton h-5 w-48" />
      <div className="skeleton h-4 w-36" />
      <div className="skeleton h-4 w-24" />
      <div className="flex gap-2 pt-1">
        <div className="skeleton h-9 w-28 rounded-xl" />
        <div className="skeleton h-9 w-24 rounded-xl" />
      </div>
    </div>
  </div>
);

/* ─── Status Badge ─── */
const StatusBadge = ({ status }) => {
  const map = {
    Confirmed:     { className: 'badge-success', icon: <CheckCircle size={12} className="shrink-0" /> },
    'Checked In':  { className: 'badge-info', icon: <Hotel size={12} className="shrink-0" /> },
    'Checked Out': { className: 'badge-default', icon: <LogOut size={12} className="shrink-0" /> },
    Cancelled:     { className: 'badge-error', icon: <XCircle size={12} className="shrink-0" /> },
    Pending:       { className: 'badge-warning', icon: <Clock size={12} className="shrink-0" /> },
  };

  const item = map[status] || { className: 'badge-default', icon: null };

  return (
    <span className={`inline-flex items-center gap-1.5 ${item.className}`} style={{ borderRadius: '0px' }}>
      {item.icon}
      <span>{status}</span>
    </span>
  );
};

const MyBookings = () => {
  const { apiFetch, user } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const highlightId = searchParams.get('search');
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');
  const [selectedReceipt, setSelectedReceipt] = useState(null);
  const [editingBooking, setEditingBooking] = useState(null);
  const [editCheckIn, setEditCheckIn] = useState('');
  const [editCheckOut, setEditCheckOut] = useState('');
  const [updating, setUpdating] = useState(false);
  const [countdowns, setCountdowns] = useState({});
  const autoCheckedOutRef = useRef({});

  useEffect(() => {
    const activeStays = bookings.filter(b => b.booking_status === 'Checked In');
    if (activeStays.length === 0) {
      setCountdowns({});
      return;
    }

    const alertedMap = {};

    const updateTimers = () => {
      const now = new Date().getTime();
      const newCountdowns = {};

      activeStays.forEach(stay => {
        const checkoutTime = new Date(stay.check_out_date).getTime();
        const diff = checkoutTime - now;

        if (diff <= 0) {
          newCountdowns[stay.id] = {
            text: 'Stay ended. Please proceed to checkout!',
            isLast5Min: true
          };
          
          // Triggers a backend refresh which automatically transitions the booking to Checked Out in real-time
          if (!autoCheckedOutRef.current[stay.id]) {
            autoCheckedOutRef.current[stay.id] = true;
            fetchBookings();
          }
        } else {
          const hours = Math.floor(diff / (1000 * 60 * 60));
          const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
          const seconds = Math.floor((diff % (1000 * 60)) / 1000);
          
          let countdownStr = '';
          if (hours > 0) countdownStr += `${hours}h `;
          countdownStr += `${minutes}m ${seconds}s`;

          const isLast5 = diff <= 5 * 60 * 1000;

          newCountdowns[stay.id] = {
            text: countdownStr,
            isLast5Min: isLast5
          };

          if (isLast5 && !alertedMap[stay.id]) {
            toast.error(`🚨 URGENT REMINDER: Your stay in Room ${stay.room_number} ends in less than 5 minutes! Please prepare for checkout.`, {
              duration: 8000,
              id: `5min-checkout-toast-${stay.id}`
            });
            alertedMap[stay.id] = true;
          }
        }
      });

      setCountdowns(newCountdowns);
    };

    updateTimers();
    const interval = setInterval(updateTimers, 1000);

    return () => clearInterval(interval);
  }, [bookings]);

  const fetchBookings = async () => {
    setLoading(true);
    try {
      const data = await apiFetch('/bookings/my-bookings');
      // Filter out transient 'Pending' bookings since they are just unpaid checkout drafts
      const filtered = data.filter(b => b.booking_status !== 'Pending');
      setBookings(filtered);
    } catch (err) {
      console.error(err);
      toast.error('Failed to load your reservations.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchBookings(); }, []);

  useEffect(() => {
    if (bookings.length > 0 && highlightId) {
      const found = bookings.find(b => String(b.id) === String(highlightId));
      if (found) {
        setSelectedReceipt(found);
      }
    }
  }, [bookings, highlightId]);

  const socket = useSocket();

  useEffect(() => {
    if (!socket || !user) return;

    const handleBookingUpdated = (data) => {
      // Refresh the reservation list if this booking is in our list or belongs to this user
      const isOurBooking = bookings.some(b => String(b.id) === String(data.booking?.id)) || 
                           String(data.booking?.user_id) === String(user.id);

      if (isOurBooking) {
        fetchBookings();
        
        if (data.sender_id === user?.id) return; // Skip toast if sender is the current user

        if (data.action === 'status_change') {
          toast.success(`Reservation for Room ${data.booking.room_number || ''} updated to: ${data.booking.booking_status}`, { id: 'booking-update-toast' });
        } else if (data.action === 'payment_verified') {
          toast.success(`Booking Confirmed! Payment successful for Room ${data.booking.room_number || ''}`, { id: 'booking-update-toast' });
        } else if (data.action === 'cancel') {
          toast.error(`Reservation for Room ${data.booking.room_number || ''} has been Cancelled`, { id: 'booking-update-toast' });
        }
      }
    };

    socket.on('booking:updated', handleBookingUpdated);
    return () => {
      socket.off('booking:updated', handleBookingUpdated);
    };
  }, [socket, bookings, user]);

  const handleCancelBooking = async (bookingId) => {
    if (!window.confirm('Cancel this reservation? This action cannot be undone.')) return;
    try {
      await apiFetch(`/bookings/cancel/${bookingId}`, { method: 'PUT' });
      toast.success('Reservation cancelled.');
      fetchBookings();
    } catch (err) {
      toast.error(err.message || 'Failed to cancel.');
    }
  };

  const handleDeleteBooking = async (bookingId) => {
    if (!window.confirm('Are you absolutely sure you want to permanently delete this reservation from your history?')) return;
    try {
      await apiFetch(`/bookings/${bookingId}`, { method: 'DELETE' });
      toast.success('Reservation permanently deleted.');
      fetchBookings();
    } catch (err) {
      toast.error(err.message || 'Failed to delete booking.');
    }
  };

  const openEditModal = (b) => {
    setEditingBooking(b);
    setEditCheckIn(b.check_in_date?.substring(0, 10) || '');
    setEditCheckOut(b.check_out_date?.substring(0, 10) || '');
  };

  const handleEditBookingSave = async (e) => {
    e.preventDefault();
    if (!editCheckIn || !editCheckOut) {
      toast.error('Please select both check-in and check-out dates.');
      return;
    }
    if (new Date(editCheckIn) >= new Date(editCheckOut)) {
      toast.error('Check-out date must be strictly after check-in.');
      return;
    }

    setUpdating(true);
    try {
      await apiFetch(`/bookings/${editingBooking.id}`, {
        method: 'PUT',
        body: JSON.stringify({
          check_in_date: editCheckIn,
          check_out_date: editCheckOut,
        }),
      });
      toast.success('Booking details updated successfully!');
      setEditingBooking(null);
      fetchBookings();
    } catch (err) {
      toast.error(err.message || 'Failed to update booking dates.');
    } finally {
      setUpdating(false);
    }
  };

  const TAB_FILTERS = [
    { id: 'all', label: 'All' },
    { id: 'Confirmed', label: 'Confirmed' },
    { id: 'Checked In', label: 'Active' },
    { id: 'Checked Out', label: 'Completed' },
    { id: 'Cancelled', label: 'Cancelled' },
  ];

  const filteredBookings = filter === 'all'
    ? bookings
    : bookings.filter((b) => b.booking_status === filter);

  const getDiffDays = (b) => {
    const d = Math.ceil((new Date(b.check_out_date) - new Date(b.check_in_date)) / (1000 * 60 * 60 * 24));
    return isNaN(d) ? 1 : Math.max(1, d);
  };

  return (
    <div className="min-h-screen bg-[#f7f7f7] dark:bg-slate-950 transition-colors duration-300">

      <div className="pt-0">
        {/* ── Header ── */}
        <div className="bg-white dark:bg-slate-900 border-b border-slate-100 dark:border-slate-800 transition-colors duration-300">
          <div className="max-w-5xl mx-auto px-4 sm:px-6 py-6 sm:py-8">
            <button
              onClick={() => navigate('/')}
              className="inline-flex items-center gap-1.5 text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white text-xs font-semibold mb-4 transition-colors"
            >
              <ArrowLeft size={13} />
              <span>Back</span>
            </button>
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-2xl font-bold text-slate-900 dark:text-white">My Bookings</h1>
                <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">Manage your stays & reservations</p>
              </div>
              <button
                onClick={fetchBookings}
                className="btn-ghost border border-slate-200 dark:border-slate-700 text-sm dark:text-slate-300 dark:hover:bg-slate-800"
              >
                <RefreshCw size={15} />
                <span className="hidden sm:block">Refresh</span>
              </button>
            </div>

            {/* Stats Strip */}
            {!loading && bookings.length > 0 && (
              <div className="grid grid-cols-3 sm:grid-cols-4 gap-3 mt-6">
                {[
                  { label: 'Total Stays', value: bookings.length, color: 'text-slate-900 dark:text-white' },
                  { label: 'Confirmed', value: bookings.filter(b => b.booking_status === 'Confirmed').length, color: 'text-emerald-600' },
                  { label: 'Completed', value: bookings.filter(b => b.booking_status === 'Checked Out').length, color: 'text-blue-600 dark:text-blue-400' },
                  { label: 'Cancelled', value: bookings.filter(b => b.booking_status === 'Cancelled').length, color: 'text-red-500' },
                ].map((s, i) => (
                  <div key={i} className="bg-slate-50 dark:bg-slate-800 border border-slate-100 dark:border-slate-700 rounded-2xl px-4 py-3 transition-colors duration-300">
                    <p className={`text-xl font-bold ${s.color}`}>{s.value}</p>
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">{s.label}</p>
                  </div>
                ))}
              </div>
            )}

            {/* Filter Tabs */}
            {!loading && bookings.length > 0 && (
              <div className="flex gap-2 mt-5 overflow-x-auto no-scrollbar">
                {TAB_FILTERS.map((tab) => {
                  const count = tab.id === 'all'
                    ? bookings.length
                    : bookings.filter(b => b.booking_status === tab.id).length;
                  return (
                    <button
                      key={tab.id}
                      onClick={() => setFilter(tab.id)}
                      className={`filter-tag shrink-0 flex items-center gap-1.5 ${filter === tab.id ? 'active' : ''}`}
                    >
                      {tab.label}
                      {count > 0 && (
                        <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full ${
                          filter === tab.id ? 'bg-white/20 text-white' : 'bg-slate-100 text-slate-500'
                        }`}>
                          {count}
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        </div>



        {/* ── Bookings List ── */}
        <div className="max-w-5xl mx-auto px-4 sm:px-6 py-8 space-y-5">
          {loading ? (
            <>
              <BookingSkeletonCard />
              <BookingSkeletonCard />
              <BookingSkeletonCard />
            </>
          ) : filteredBookings.length === 0 ? (
            <div className="card flex flex-col items-center justify-center py-20 gap-5 text-center animate-scale-in">
              <div className="w-20 h-20 rounded-3xl bg-slate-50 flex items-center justify-center">
                <ClipboardList size={36} className="text-slate-300" />
              </div>
              <div>
                <h3 className="font-bold text-slate-900 dark:text-white text-lg">
                  {filter === 'all' ? 'No bookings yet' : `No ${filter.toLowerCase()} bookings`}
                </h3>
                <p className="text-sm text-slate-500 mt-1 max-w-sm">
                  {filter === 'all'
                    ? 'Explore our premium suites and reserve your first stay today!'
                    : `You don't have any bookings with "${filter}" status.`}
                </p>
              </div>
              <Link to="/rooms" className="btn-brand">
                Browse Rooms
              </Link>
            </div>
          ) : (
            filteredBookings.map((b, i) => (
              <div
                key={b.id}
                className={`card p-4 sm:p-5 flex flex-col sm:flex-row gap-4 sm:gap-5 items-center sm:items-start animate-fade-in-up hover:shadow-md transition-all ${
                  highlightId === b.id ? 'ring-2 ring-indigo-500 shadow-lg scale-[1.01] border-indigo-400 dark:border-indigo-500' : ''
                }`}
                style={{ animationDelay: `${i * 0.06}s` }}
              >
                {/* Room Image */}
                <div className="w-32 h-32 relative shrink-0 overflow-hidden mx-auto sm:mx-0" style={{ borderRadius: '0px' }}>
                  <img
                    src={getRoomImage(b.image_url) || 'https://images.unsplash.com/photo-1618773928121-c32242e63f39?auto=format&fit=crop&w=400&q=80'}
                    alt={`Room ${b.room_number}`}
                    className="w-full h-full object-cover"
                    style={{ borderRadius: '0px' }}
                  />
                  <div className="absolute inset-0 bg-gradient-to-t sm:bg-gradient-to-r from-black/10 to-transparent" />
                </div>

                {/* Content */}
                <div className="flex-1 flex flex-col justify-between gap-4 w-full text-left">
                  <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <StatusBadge status={b.booking_status} />
                        {b.payment_status === 'Paid' ? (
                          <span className="badge rounded-none bg-blue-50 dark:bg-blue-950/30 text-blue-700 dark:text-blue-400 border border-blue-100 dark:border-blue-900/30" style={{ borderRadius: '0px' }}>
                            <CreditCard size={10} /> Paid
                          </span>
                        ) : (
                          <span className="badge rounded-none bg-amber-50 dark:bg-amber-950/30 text-amber-700 dark:text-amber-400 border border-amber-100 dark:border-amber-900/30" style={{ borderRadius: '0px' }}>
                            <Clock size={10} /> Payment Pending
                          </span>
                        )}
                      </div>
                      <h3 className="font-bold text-slate-900 dark:text-white capitalize text-base">
                        {b.room_type} Suite — Room {b.room_number}
                      </h3>
                      <div className="flex flex-wrap items-center gap-3 mt-2 text-xs text-slate-500 dark:text-slate-400 font-medium">
                        <span className="flex items-center gap-1">
                          <Calendar size={12} className="text-[#FF385C]" />
                          Check-in: <span className="font-semibold text-slate-700 dark:text-slate-350">{formatDateTime(b.check_in_date)}</span>
                        </span>
                        <span className="hidden sm:inline text-slate-300">·</span>
                        <span className="flex items-center gap-1">
                          <Calendar size={12} className="text-[#FF385C]" />
                          Check-out: <span className="font-semibold text-slate-700 dark:text-slate-350">{formatDateTime(b.check_out_date)}</span>
                        </span>
                        <span className="hidden sm:inline text-slate-300">·</span>
                        <span>{getDiffDays(b)} night{getDiffDays(b) > 1 ? 's' : ''}</span>
                      </div>

                      {b.booking_status === 'Checked In' && countdowns[b.id] && (
                        <div className={`mt-3 p-3 rounded-2xl border flex items-center justify-between gap-3 text-xs ${
                          countdowns[b.id].isLast5Min 
                            ? 'bg-rose-50/80 dark:bg-rose-950/20 border-rose-200 dark:border-rose-900/30 text-rose-800 dark:text-rose-400 animate-pulse' 
                            : 'bg-indigo-50/80 dark:bg-indigo-950/20 border-indigo-200 dark:border-indigo-900/30 text-indigo-800 dark:text-indigo-400'
                        }`}>
                          <div className="flex items-center gap-2 text-left">
                            <Bell size={14} className={countdowns[b.id].isLast5Min ? 'animate-bounce text-rose-500 shrink-0' : 'text-indigo-500 shrink-0'} />
                            <span className="font-bold">
                              {countdowns[b.id].isLast5Min ? 'Urgent Checkout Alert' : 'Active Stay'}
                            </span>
                          </div>
                          <div className="flex items-center gap-1.5 font-mono font-bold shrink-0">
                            <Clock size={12} className="shrink-0" />
                            <span>{countdowns[b.id].text}</span>
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Price */}
                    <div className="text-right shrink-0">
                      <p className="text-xl font-bold text-slate-900 dark:text-white">
                        ₹{parseFloat(b.total_price).toLocaleString('en-IN')}
                      </p>
                      <p className="text-xs text-slate-400 font-mono mt-0.5">
                        REF: {b.id.substring(0, 10).toUpperCase()}
                      </p>
                    </div>
                  </div>

                  {/* Action Buttons */}
                  <div className="flex flex-wrap items-center gap-2 pt-3 border-t border-slate-100 dark:border-slate-800">
                    <p className="text-[11px] text-slate-400 font-mono tracking-wide mr-auto">
                      Booking ID: {b.id.substring(0, 13).toUpperCase()}
                    </p>

                    {b.payment_status === 'Paid' && (
                      <button
                        onClick={() => setSelectedReceipt(b)}
                        className="flex items-center gap-1.5 px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-800 text-xs font-semibold text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
                      >
                        <ExternalLink size={13} />
                        Receipt
                      </button>
                    )}

                    {b.booking_status === 'Confirmed' && (
                      <button
                        onClick={() => handleCancelBooking(b.id)}
                        className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-red-50 hover:bg-red-100 text-red-600 border border-red-100 text-xs font-semibold transition-all"
                      >
                        <XCircle size={13} />
                        Cancel
                      </button>
                    )}

                    {b.booking_status === 'Cancelled' && (
                      <button
                        onClick={() => handleDeleteBooking(b.id)}
                        className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-200 text-xs font-semibold transition-all"
                      >
                        <X size={13} />
                        Delete
                      </button>
                    )}
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* ── Receipt Modal Overlay ── */}
      {selectedReceipt && createPortal(
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fade-in print-receipt-overlay">
          <style>{`
            @media print {
              * {
                -webkit-print-color-adjust: exact !important;
                print-color-adjust: exact !important;
              }
              html, body {
                background: white !important;
                background-color: white !important;
                color: black !important;
                margin: 0 !important;
                padding: 0 !important;
                height: auto !important;
                overflow: visible !important;
              }
              body > :not(.print-receipt-overlay) {
                display: none !important;
              }
              .print-receipt-overlay {
                position: absolute !important;
                left: 0 !important;
                top: 0 !important;
                bottom: auto !important;
                right: auto !important;
                width: 100% !important;
                height: auto !important;
                background: white !important;
                background-color: white !important;
                z-index: 99999 !important;
                display: block !important;
                padding: 0 !important;
                margin: 0 !important;
              }
              .print-receipt-card {
                border: none !important;
                box-shadow: none !important;
                background: white !important;
                background-color: white !important;
                color: #0f172a !important;
                width: 100% !important;
                max-width: 600px !important;
                margin: 0 auto !important;
                height: auto !important;
                max-height: none !important;
                overflow: visible !important;
                display: block !important;
              }
              .print-receipt-card > div {
                overflow: visible !important;
                max-height: none !important;
                height: auto !important;
                flex: none !important;
                padding: 10px 0 !important;
              }

              /* Force Light Theme Colors and Contrast for All Receipt Elements in Print */
              .print-receipt-card text,
              .print-receipt-card span,
              .print-receipt-card p,
              .print-receipt-card h3,
              .print-receipt-card h4,
              .print-receipt-card h5,
              .print-receipt-card h6,
              .print-receipt-card div {
                color: #0f172a !important;
              }
              
              /* Softer styling for labels/references in print */
              .print-receipt-card .text-slate-400,
              .print-receipt-card [class*="text-slate-400"] {
                color: #475569 !important;
              }

              /* Success banner print colors */
              .success-print-banner {
                background-color: #f0fdf4 !important;
                border-color: #bbf7d0 !important;
              }
              .success-print-banner .text-emerald-800,
              .success-print-banner [class*="text-emerald-800"],
              .success-print-banner [class*="dark:text-emerald-400"] {
                color: #065f46 !important;
              }
              .success-print-banner .text-emerald-600,
              .success-print-banner [class*="text-emerald-600"],
              .success-print-banner [class*="dark:text-emerald-500"] {
                color: #059669 !important;
              }

              /* Success Green Checkmark and Outline Circle */
              .success-print-circle {
                background: transparent !important;
                background-color: transparent !important;
                border: 2px solid #059669 !important;
                box-shadow: none !important;
              }
              .success-print-icon {
                color: #059669 !important;
              }

              /* Print details and summary boxes - force clean light slate background and borders */
              .print-details-box,
              .print-summary-box {
                background-color: #f8fafc !important;
                border-color: #e2e8f0 !important;
              }
              .print-details-box div,
              .print-summary-box div {
                background-color: transparent !important;
              }

              /* Primary and Highlight Colors in Print */
              .print-receipt-card .text-indigo-500,
              .print-receipt-card [class*="text-indigo-500"],
              .print-receipt-card [class*="dark:text-indigo-400"],
              .print-receipt-card .text-indigo-600,
              .print-receipt-card [class*="text-indigo-600"] {
                color: #4f46e5 !important;
              }

              /* Print-safe light borders */
              .print-receipt-card .border-slate-100,
              .print-receipt-card .border-slate-200,
              .print-receipt-card [class*="border-slate-"] {
                border-color: #e2e8f0 !important;
              }

              /* Maintain the QR code background wrapper as pure white */
              .print-receipt-card .bg-white {
                background-color: #ffffff !important;
                border-color: #e2e8f0 !important;
              }

              .no-print {
                display: none !important;
              }
            }
          `}</style>
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl w-full max-w-lg overflow-hidden shadow-2xl animate-scale-up max-h-[90vh] flex flex-col print-receipt-card">
            {/* Header */}
            <div className="flex items-center justify-between p-5 border-b border-slate-100 dark:border-slate-800 shrink-0">
              <div className="flex items-center gap-2">
                <div className="p-2 rounded-xl bg-indigo-500/10 text-indigo-500">
                  <Hotel size={18} />
                </div>
                <div className="text-left">
                  <h3 className="font-bold text-slate-900 dark:text-white leading-none">Tasty Suites</h3>
                  <span className="text-[10px] text-slate-400 font-mono tracking-wider uppercase">Official Receipt</span>
                </div>
              </div>
              <button
                onClick={() => setSelectedReceipt(null)}
                className="p-1.5 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400 hover:text-slate-600 transition-colors no-print"
              >
                <X size={18} />
              </button>
            </div>

            {/* Content */}
            <div className="p-6 overflow-y-auto space-y-6 flex-1 text-slate-700 dark:text-slate-300">
              {/* Success Banner */}
              <div className="flex flex-col items-center text-center p-4 bg-emerald-50 dark:bg-emerald-950/20 border border-emerald-100 dark:border-emerald-900/30 rounded-2xl success-print-banner">
                <div className="w-10 h-10 rounded-full bg-emerald-500 text-white flex items-center justify-center mb-2 shadow-lg shadow-emerald-500/20 success-print-circle">
                  <CheckCircle size={20} className="success-print-icon" />
                </div>
                <h4 className="font-bold text-emerald-800 dark:text-emerald-400 text-sm">Payment Successful</h4>
                <p className="text-xs text-emerald-600 dark:text-emerald-500/80 mt-0.5">Thank you for booking with us!</p>
              </div>

              {/* Invoice Grid */}
              <div className="grid grid-cols-2 gap-y-4 gap-x-6 text-xs border-b border-slate-100 dark:border-slate-800 pb-5 text-left">
                <div>
                  <span className="text-slate-400 block mb-1">Guest Name</span>
                  <span className="font-semibold text-slate-800 dark:text-slate-200">{user?.name}</span>
                </div>
                <div>
                  <span className="text-slate-400 block mb-1">Guest Email</span>
                  <span className="font-semibold text-slate-800 dark:text-slate-200 break-all">{user?.email}</span>
                </div>
                <div>
                  <span className="text-slate-400 block mb-1">Receipt Date</span>
                  <span className="font-semibold text-slate-800 dark:text-slate-200 font-mono">
                    {new Date(selectedReceipt.created_at || Date.now()).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}
                  </span>
                </div>
                <div>
                  <span className="text-slate-400 block mb-1">Transaction Ref</span>
                  <span className="font-semibold text-indigo-500 font-mono uppercase">
                    {selectedReceipt.transaction_id || `TXN-${selectedReceipt.id.substring(0, 10).toUpperCase()}`}
                  </span>
                </div>
              </div>

              {/* Booking Details */}
              <div className="space-y-3 border-b border-slate-100 dark:border-slate-800 pb-5 text-left">
                <h5 className="text-[11px] font-bold tracking-wider text-slate-400 uppercase">Reservation Details</h5>
                
                <div className="flex items-center gap-3 p-3 bg-slate-50 dark:bg-slate-800/40 rounded-2xl border border-slate-100 dark:border-slate-800/50 print-details-box">
                  <div className="w-12 h-12 rounded-xl overflow-hidden bg-slate-200 shrink-0">
                    <img
                      src={getRoomImage(selectedReceipt.image_url) || 'https://images.unsplash.com/photo-1618773928121-c32242e63f39?auto=format&fit=crop&w=150&q=80'}
                      alt={`Room ${selectedReceipt.room_number}`}
                      className="w-full h-full object-cover"
                    />
                  </div>
                  <div>
                    <div className="font-bold text-slate-800 dark:text-slate-200 text-xs">Room #{selectedReceipt.room_number}</div>
                    <div className="text-[10px] text-slate-400 capitalize">{selectedReceipt.room_type} Room</div>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4 text-xs pt-1">
                  <div>
                    <span className="text-slate-400 block mb-0.5">Check-In</span>
                    <span className="font-semibold text-slate-800 dark:text-slate-200 font-mono">
                      {new Date(selectedReceipt.check_in_date).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-400 block mb-0.5">Check-Out</span>
                    <span className="font-semibold text-slate-800 dark:text-slate-200 font-mono">
                      {new Date(selectedReceipt.check_out_date).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}
                    </span>
                  </div>
                </div>
              </div>

              {/* Pricing Summary */}
              <div className="space-y-2.5 text-left">
                <h5 className="text-[11px] font-bold tracking-wider text-slate-400 uppercase">Billing Summary</h5>
                <div className="bg-slate-50 dark:bg-slate-800/40 rounded-2xl p-4 border border-slate-100 dark:border-slate-800/50 space-y-2 text-xs print-summary-box">
                  <div className="flex justify-between">
                    <span className="text-slate-500">Room Charges ({Math.max(1, Math.ceil((new Date(selectedReceipt.check_out_date) - new Date(selectedReceipt.check_in_date)) / (1000 * 60 * 60 * 24)))} nights)</span>
                    <span className="font-semibold text-slate-800 dark:text-slate-200 font-mono">
                      ₹{parseFloat(selectedReceipt.total_price * 0.82).toFixed(2)}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">Taxes & Fees (18% GST)</span>
                    <span className="font-semibold text-slate-800 dark:text-slate-200 font-mono">
                      ₹{parseFloat(selectedReceipt.total_price * 0.18).toFixed(2)}
                    </span>
                  </div>
                  <div className="h-px bg-slate-200 dark:bg-slate-700/50 my-2" />
                  <div className="flex justify-between text-sm">
                    <span className="font-bold text-slate-800 dark:text-slate-100">Amount Paid</span>
                    <span className="font-black text-indigo-500 font-mono">
                      ₹{parseFloat(selectedReceipt.total_price).toLocaleString('en-IN')}
                    </span>
                  </div>
                </div>
              </div>

              {/* QR Code Entry Pass */}
              <div className="flex flex-col items-center gap-2.5 pt-4 border-t border-slate-100 dark:border-slate-800">
                <span className="text-[10px] font-bold tracking-wider text-slate-400 uppercase">Digital Entry Pass</span>
                <div className="bg-white p-3 rounded-2xl border border-slate-150 shadow-sm inline-block">
                  <img
                    src={`https://api.qrserver.com/v1/create-qr-code/?size=140x140&data=${encodeURIComponent(
                      `${window.location.origin}/my-bookings?search=${selectedReceipt.id}`
                    )}`}
                    alt="Entry pass QR"
                    className="w-28 h-28"
                  />
                </div>
                <p className="text-[10px] text-slate-400 text-center max-w-xs leading-relaxed">
                  Show this QR code at the reception desk for express check-in.
                </p>
              </div>
            </div>

            {/* Footer Actions */}
            <div className="p-4 bg-slate-50 dark:bg-slate-800/20 border-t border-slate-100 dark:border-slate-800/80 flex gap-3 shrink-0 no-print">
              <button
                onClick={() => {
                  window.print();
                }}
                className="flex-1 flex items-center justify-center gap-2 py-3 rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700/80 text-slate-700 dark:text-slate-200 text-xs font-semibold shadow-sm transition-all"
              >
                <Printer size={14} />
                Print Receipt
              </button>
              <button
                onClick={() => setSelectedReceipt(null)}
                className="flex-1 py-3 rounded-2xl bg-slate-900 dark:bg-white hover:bg-slate-800 dark:hover:bg-slate-50 text-white dark:text-slate-900 text-xs font-semibold shadow-sm transition-all"
              >
                Close
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}
      {/* ── Edit Booking Details Modal Overlay ── */}
      {editingBooking && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fade-in">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl w-full max-w-md overflow-hidden shadow-2xl animate-scale-up p-6 space-y-6 relative text-slate-800 dark:text-slate-100">
            {/* Close button */}
            <button
              onClick={() => setEditingBooking(null)}
              className="absolute top-4 right-4 p-1.5 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400 hover:text-slate-600 transition-colors"
            >
              <X size={18} />
            </button>

            <div>
              <h3 className="font-bold text-lg text-slate-900 dark:text-white">Edit Reservation Dates</h3>
              <p className="text-xs text-slate-500 mt-1">Room #{editingBooking.room_number} — {editingBooking.room_type} Room</p>
            </div>

            <form onSubmit={handleEditBookingSave} className="space-y-4 text-left">
              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-500 block">Check-In Date</label>
                <div className="relative">
                  <Calendar size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    type="date"
                    value={editCheckIn}
                    onChange={(e) => setEditCheckIn(e.target.value)}
                    className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl pl-10 pr-4 py-3 text-sm focus:ring-2 focus:ring-slate-900 dark:focus:ring-white outline-none transition-all"
                    required
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-500 block">Check-Out Date</label>
                <div className="relative">
                  <Calendar size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    type="date"
                    value={editCheckOut}
                    onChange={(e) => setEditCheckOut(e.target.value)}
                    className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl pl-10 pr-4 py-3 text-sm focus:ring-2 focus:ring-slate-900 dark:focus:ring-white outline-none transition-all"
                    required
                  />
                </div>
              </div>

              {/* Price Preview */}
              {editCheckIn && editCheckOut && new Date(editCheckIn) < new Date(editCheckOut) && (
                <div className="p-4 bg-indigo-50 dark:bg-indigo-950/20 border border-indigo-100 dark:border-indigo-900/30 rounded-2xl flex items-center justify-between text-xs">
                  <div>
                    <span className="text-indigo-800 dark:text-indigo-400 font-semibold block">New Stay Duration</span>
                    <span className="text-slate-500 mt-0.5 block">
                      {Math.max(1, Math.ceil((new Date(editCheckOut) - new Date(editCheckIn)) / (1000 * 60 * 60 * 24)))} night(s) at ₹{parseFloat(editingBooking.price_per_day || editingBooking.total_price / getDiffDays(editingBooking)).toFixed(0)}/night
                    </span>
                  </div>
                  <div className="text-right">
                    <span className="text-indigo-800 dark:text-indigo-400 font-semibold block">Recalculated Price</span>
                    <span className="font-bold text-sm text-indigo-600 dark:text-indigo-400 block mt-0.5">
                      ₹{(Math.max(1, Math.ceil((new Date(editCheckOut) - new Date(editCheckIn)) / (1000 * 60 * 60 * 24))) * parseFloat(editingBooking.price_per_day || editingBooking.total_price / getDiffDays(editingBooking))).toLocaleString('en-IN')}
                    </span>
                  </div>
                </div>
              )}

              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setEditingBooking(null)}
                  className="flex-1 py-3 rounded-2xl border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-200 text-xs font-semibold shadow-sm transition-all"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={updating}
                  className="flex-1 py-3 rounded-2xl bg-slate-900 dark:bg-white hover:bg-slate-800 dark:hover:bg-slate-100 text-white dark:text-slate-900 text-xs font-semibold shadow-sm transition-all active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {updating ? 'Updating...' : 'Save Changes'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default MyBookings;
