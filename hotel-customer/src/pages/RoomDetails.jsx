import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useSocket } from '../context/SocketContext';
import {
  Calendar, Users, CheckCircle, Star, ArrowLeft,
  Send, Wifi, Tv, Wind, Coffee, MapPin, Shield, ChevronRight,
  ShieldCheck, Key
} from 'lucide-react';
import toast from 'react-hot-toast';

/* ─── Shimmer Skeleton ─── */
const DetailSkeleton = () => (
  <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8 animate-fade-in">
    <div className="skeleton h-8 w-48 mb-6" />
    <div className="skeleton h-[420px] w-full rounded-2xl mb-8" />
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
      <div className="lg:col-span-2 space-y-4">
        <div className="skeleton h-8 w-64" />
        <div className="skeleton h-4 w-full" />
        <div className="skeleton h-4 w-5/6" />
        <div className="skeleton h-4 w-3/4" />
      </div>
      <div className="skeleton h-64 rounded-2xl" />
    </div>
  </div>
);

const AMENITY_MAP = {
  'WiFi': <Wifi size={16} />,
  'Air Conditioning': <Wind size={16} />,
  'Flat TV': <Tv size={16} />,
  'Mini Bar': <Coffee size={16} />,
  'Pristine View': <MapPin size={16} />,
};

const RoomDetails = () => {
  const { id } = useParams();
  const { apiFetch, user } = useAuth();
  const navigate = useNavigate();

  const [room, setRoom] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeImg, setActiveImg] = useState(0);
  const [checkIn, setCheckIn] = useState('');
  const [checkOut, setCheckOut] = useState('');

  const [rating, setRating] = useState(5);
  const [comment, setComment] = useState('');
  const [submittingReview, setSubmittingReview] = useState(false);

  const today = new Date().toISOString().split('T')[0];

  const fetchRoomDetails = async () => {
    try {
      const data = await apiFetch(`/rooms/${id}`);
      setRoom(data);
    } catch (err) {
      console.error(err);
      toast.error('Failed to load room details.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchRoomDetails(); }, [id]);

  const socket = useSocket();

  useEffect(() => {
    if (!socket || !id) return;

    const handleRoomUpdated = (data) => {
      // Check if this updated room matches the current page's room ID
      if (String(data.room?.id) === String(id) || String(data.id) === String(id)) {
        if (data.action === 'delete') {
          toast.error('This room has been removed by the administrator.', { id: 'room-details-toast' });
          navigate('/rooms');
        } else {
          fetchRoomDetails();
          toast.success('Room status or pricing has been updated in real-time.', { id: 'room-details-toast' });
        }
      }
    };

    socket.on('room:updated', handleRoomUpdated);
    return () => {
      socket.off('room:updated', handleRoomUpdated);
    };
  }, [socket, id]);

  const handleBookingRedirect = (e) => {
    e.preventDefault();
    if (!checkIn || !checkOut) { toast.error('Please select both check-in and check-out dates.'); return; }
    if (new Date(checkIn) >= new Date(checkOut)) { toast.error('Check-out must be after check-in.'); return; }
    if (!user) { toast.error('Please sign in to reserve a room.'); navigate('/login'); return; }
    navigate(`/booking?${new URLSearchParams({ room_id: id, check_in: checkIn, check_out: checkOut })}`);
  };

  const handleReviewSubmit = async (e) => {
    e.preventDefault();
    if (!comment.trim()) return;
    setSubmittingReview(true);
    try {
      await apiFetch('/reviews', {
        method: 'POST',
        body: JSON.stringify({ room_id: id, rating, comment }),
      });
      toast.success('Review published!');
      setComment('');
      fetchRoomDetails();
    } catch (err) {
      toast.error(err.message || 'Only guests who have checked out may leave a review.');
    } finally {
      setSubmittingReview(false);
    }
  };

  // Parse dynamic multiple images
  const getRoomImages = () => {
    if (!room?.image_url) {
      return ['https://images.unsplash.com/photo-1578683010236-d716f9a3f461?auto=format&fit=crop&w=1200&q=80'];
    }
    if (room.image_url.startsWith('[')) {
      try {
        const arr = JSON.parse(room.image_url);
        if (Array.isArray(arr) && arr.length > 0) return arr;
      } catch (e) {
        // ignore
      }
    }
    return [room.image_url];
  };

  const roomImages = getRoomImages();

  if (loading) {
    return (
      <div className="min-h-screen bg-[#f7f7f7] dark:bg-slate-950 transition-colors duration-300">
          <div className="pt-0">
          <DetailSkeleton />
        </div>
      </div>
    );
  }

  if (!room) {
    return (
      <div className="min-h-screen bg-[#f7f7f7] dark:bg-slate-950 flex items-center justify-center transition-colors duration-300">
          <div className="text-center space-y-4 pt-0">
          <p className="text-slate-500">Room not found.</p>
          <Link to="/rooms" className="btn-brand">Browse Rooms</Link>
        </div>
      </div>
    );
  }

  const diffDays = checkIn && checkOut
    ? Math.max(0, Math.ceil((new Date(checkOut) - new Date(checkIn)) / (1000 * 60 * 60 * 24)))
    : 0;
  const totalPrice = diffDays * parseFloat(room.price);

  const amenitiesList = room.amenities?.length
    ? room.amenities
    : ['WiFi', 'Air Conditioning', 'Flat TV', 'Mini Bar', 'Pristine View'];

  const avgRating = room.reviews?.length
    ? (room.reviews.reduce((a, r) => a + r.rating, 0) / room.reviews.length).toFixed(1)
    : '4.8';

  return (
    <div className="min-h-screen bg-[#f7f7f7] dark:bg-slate-950 transition-colors duration-300">

      <div className="pt-0">
        {/* ── Breadcrumb ── */}
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <nav className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
            <Link to="/" className="hover:text-slate-900 dark:hover:text-white transition-colors">Home</Link>
            <ChevronRight size={12} />
            <Link to="/rooms" className="hover:text-slate-900 dark:hover:text-white transition-colors">Rooms</Link>
            <ChevronRight size={12} />
            <span className="text-slate-900 dark:text-white font-semibold capitalize">{room.room_type} Suite</span>
          </nav>
        </div>

        <div className="max-w-7xl mx-auto px-4 sm:px-6 pb-16">

          {/* ── Title Row ── */}
          <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4 mb-5">
            <div>
              <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 dark:text-white capitalize">
                {room.room_type} Resort Suite
              </h1>
              <div className="flex flex-wrap items-center gap-3 mt-2 text-sm text-slate-500 dark:text-slate-400">
                <div className="flex items-center gap-1">
                  <Star size={14} fill="#FF385C" stroke="none" />
                  <span className="font-semibold text-slate-800 dark:text-slate-200">{avgRating}</span>
                  <span className="text-slate-400 dark:text-slate-500">({room.reviews?.length || 0} reviews)</span>
                </div>
                <span>·</span>
                <div className="flex items-center gap-1">
                  <MapPin size={13} className="text-slate-400 dark:text-slate-500" />
                  <span className="text-slate-500 dark:text-slate-400">Paradise Valley · Room {room.room_number}</span>
                </div>
              </div>
            </div>
            <Link
              to="/rooms"
              className="btn-ghost flex-shrink-0 text-sm border border-slate-200 dark:border-slate-800 dark:text-slate-300 dark:hover:text-white"
            >
              <ArrowLeft size={15} />
              <span>Back to Browse</span>
            </Link>
          </div>

          {/* ── Photo Gallery ── */}
          <div className="relative rounded-3xl overflow-hidden mb-8 select-none">
            <div className="grid grid-cols-4 grid-rows-2 gap-2 h-[350px] sm:h-[420px]">
              <div className="col-span-4 sm:col-span-2 row-span-2 relative overflow-hidden bg-slate-100 dark:bg-slate-900">
                <img
                  src={roomImages[activeImg] || 'https://images.unsplash.com/photo-1578683010236-d716f9a3f461?auto=format&fit=crop&w=1200&q=80'}
                  alt="Main room view"
                  className="w-full h-full object-cover transition-all duration-300"
                />
              </div>
              
              {/* Secondary Images on the Right (Max 2 shown in grid) */}
              {roomImages.slice(0, 3).map((img, idx) => {
                if (idx === 0) return null;
                return (
                  <div 
                    key={idx} 
                    onClick={() => setActiveImg(idx)}
                    className={`hidden sm:block relative overflow-hidden col-span-2 row-span-1 cursor-pointer bg-slate-100 dark:bg-slate-900 group ${activeImg === idx ? 'ring-4 ring-[#FF385C] ring-inset' : ''}`}
                  >
                    <img
                      src={img}
                      alt={`Room view ${idx + 1}`}
                      className="w-full h-full object-cover hover:scale-105 transition-transform duration-500"
                    />
                    <div className="absolute inset-0 bg-black/10 group-hover:bg-transparent transition-all" />
                  </div>
                );
              })}
            </div>

            {/* Thumbnail dots / list for quick selection of all images */}
            {roomImages.length > 1 && (
              <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 flex gap-2 px-3 py-2 rounded-full bg-black/60 backdrop-blur-sm shadow-md">
                {roomImages.map((_, idx) => (
                  <button
                    key={idx}
                    onClick={() => setActiveImg(idx)}
                    className={`w-2 h-2 rounded-full transition-all ${activeImg === idx ? 'bg-white w-4' : 'bg-white/40'}`}
                    aria-label={`Go to slide ${idx + 1}`}
                  />
                ))}
              </div>
            )}
          </div>

          {/* ── Main Content Grid ── */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">

            {/* LEFT — Details */}
            <div className="lg:col-span-2 space-y-8">

              {/* Host/Details Strip */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-slate-200 dark:border-slate-800">
                <div>
                  <h2 className="text-lg font-bold text-slate-900 dark:text-white capitalize">
                    {room.room_type} suite · {room.capacity} guests max
                  </h2>
                  <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
                    Managed by <span className="font-semibold text-slate-700 dark:text-slate-300">Tasty Suites</span>
                  </p>
                </div>
                <div className={`px-4 py-2 rounded-xl text-xs font-bold uppercase tracking-wide ${
                  room.availability_status === 'available'
                    ? 'bg-emerald-50 dark:bg-emerald-950/20 text-emerald-700 dark:text-emerald-400 border border-emerald-100 dark:border-emerald-900/30'
                    : 'bg-red-50 dark:bg-red-950/20 text-red-600 dark:text-red-400 border border-red-100 dark:border-red-900/30'
                }`}>
                  {room.availability_status === 'available' ? '✓ Available Now' : '✗ Currently Booked'}
                </div>
              </div>

              {/* Highlights */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                {[
                  { icon: <ShieldCheck size={20} className="text-[#FF385C] shrink-0 mt-0.5" />, title: 'Enhanced Clean', desc: 'Our highest‑level cleaning standard' },
                  { icon: <Key size={20} className="text-[#FF385C] shrink-0 mt-0.5" />, title: 'Self Check-in', desc: 'Digital keycard access system' },
                  { icon: <Star size={20} className="text-[#FF385C] shrink-0 mt-0.5" fill="#FF385C" />, title: 'Top Rated', desc: 'In the top 10% of this location' },
                ].map((h, i) => (
                  <div key={i} className="flex gap-3 items-start p-4 rounded-2xl bg-slate-50 dark:bg-slate-900/50 border border-slate-100 dark:border-slate-800">
                    {h.icon}
                    <div>
                      <p className="text-sm font-semibold text-slate-900 dark:text-white">{h.title}</p>
                      <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">{h.desc}</p>
                    </div>
                  </div>
                ))}
              </div>

              {/* Description */}
              <div className="space-y-3">
                <h3 className="font-bold text-slate-900 dark:text-white text-lg">About this suite</h3>
                <p className="text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
                  {room.description ||
                    'Welcome to our luxurious resort suite — meticulously engineered for comfort and elegance. Featuring expansive king bedding, absolute high-speed WiFi, personal mini-bar, integrated central cooling, and panoramic valley views. Perfect for corporate travel or vacationing couples seeking an unforgettable stay.'}
                </p>
              </div>

              {/* Amenities */}
              <div className="space-y-4">
                <h3 className="font-bold text-slate-900 dark:text-white text-lg">What this place offers</h3>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                  {amenitiesList.map((amenity) => (
                    <div
                      key={amenity}
                      className="flex items-center gap-3 p-3 rounded-xl bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 text-sm font-medium text-slate-700 dark:text-slate-300"
                    >
                      <span className="text-slate-500 dark:text-slate-400">
                        {AMENITY_MAP[amenity] || <CheckCircle size={16} />}
                      </span>
                      {amenity}
                    </div>
                  ))}
                </div>
              </div>

              {/* ── Reviews ── */}
              <div className="space-y-6 pt-2">
                <div className="flex items-center gap-3 pb-5 border-b border-slate-200 dark:border-slate-800">
                  <div className="flex items-center gap-1.5">
                    <Star size={20} fill="#FF385C" stroke="none" />
                    <span className="text-2xl font-bold text-slate-900 dark:text-white">{avgRating}</span>
                  </div>
                  <div className="w-px h-8 bg-slate-200 dark:bg-slate-800" />
                  <div>
                    <p className="font-bold text-slate-900 dark:text-white">{room.reviews?.length || 0} reviews</p>
                    <p className="text-xs text-slate-500 dark:text-slate-400">from verified guests</p>
                  </div>
                </div>

                {/* Write Review Form */}
                {user && user.role === 'customer' && (
                  <form onSubmit={handleReviewSubmit} className="bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 space-y-4">
                    <h4 className="font-semibold text-slate-900 dark:text-white">Leave a review</h4>

                    {/* Star Rating */}
                    <div className="flex gap-1">
                      {[1, 2, 3, 4, 5].map((s) => (
                        <button
                          key={s}
                          type="button"
                          onClick={() => setRating(s)}
                          className="focus:outline-none transition-transform hover:scale-110 active:scale-125"
                        >
                          <Star
                            size={24}
                            className={s <= rating ? 'text-[#FF385C]' : 'text-slate-300'}
                            fill={s <= rating ? 'currentColor' : 'none'}
                          />
                        </button>
                      ))}
                    </div>

                    <div className="relative">
                      <textarea
                        rows={3}
                        value={comment}
                        onChange={(e) => setComment(e.target.value)}
                        placeholder="Share your experience…"
                        className="input-field resize-none pr-14"
                        required
                      />
                      <button
                        type="submit"
                        disabled={submittingReview || !comment.trim()}
                        className="absolute right-3 bottom-3 w-9 h-9 rounded-xl bg-[#FF385C] hover:bg-[#e0314f] text-white flex items-center justify-center disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                      >
                        {submittingReview
                          ? <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                          : <Send size={14} />
                        }
                      </button>
                    </div>
                  </form>
                )}

                {/* Reviews List */}
                {!room.reviews?.length ? (
                  <div className="py-8 text-center">
                    <p className="text-sm text-slate-500 dark:text-slate-400">No reviews yet. Be the first to share your experience!</p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {room.reviews.map((review) => (
                      <div key={review.id} className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-2xl p-4 space-y-2">
                        <div className="flex items-center gap-2">
                          <div className="w-9 h-9 rounded-full bg-[#FF385C]/10 text-[#FF385C] flex items-center justify-center font-bold text-sm">
                            {review.reviewer_name?.substring(0, 1)}
                          </div>
                          <div>
                            <p className="text-sm font-semibold text-slate-900 dark:text-white">{review.reviewer_name}</p>
                            <div className="flex gap-0.5">
                              {Array.from({ length: review.rating }).map((_, i) => (
                                <Star key={i} size={11} fill="#FF385C" stroke="none" />
                              ))}
                            </div>
                          </div>
                        </div>
                        <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">"{review.comment}"</p>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* RIGHT — Booking Widget */}
            <div className="lg:col-span-1">
              <div className="card p-6 sticky top-6 space-y-5 shadow-xl">
                {/* Price */}
                <div className="flex items-end gap-2">
                  <span className="text-2xl font-bold text-slate-900 dark:text-white">₹{parseFloat(room.price).toFixed(0)}</span>
                  <span className="text-slate-500 dark:text-slate-400 text-sm pb-0.5">/ night</span>
                </div>

                {/* Rating mini */}
                <div className="flex items-center gap-1 -mt-2">
                  <Star size={13} fill="#FF385C" stroke="none" />
                  <span className="text-xs font-semibold text-slate-700 dark:text-slate-300">{avgRating}</span>
                  <span className="text-xs text-slate-400 dark:text-slate-500">· {room.reviews?.length || 0} reviews</span>
                </div>

                {/* Date Picker */}
                <form onSubmit={handleBookingRedirect} className="space-y-4">
                  <div className="border-2 border-slate-200 dark:border-slate-800 rounded-2xl overflow-hidden divide-y divide-slate-200 dark:divide-slate-800 focus-within:border-slate-900 dark:focus-within:border-white transition-colors">
                    <div className="flex">
                      <div className="flex-1 px-4 py-3">
                        <p className="section-label mb-1">Check In</p>
                        <input
                          type="date"
                          value={checkIn}
                          min={today}
                          onChange={(e) => setCheckIn(e.target.value)}
                          className="w-full bg-transparent text-sm text-slate-900 dark:text-white font-semibold focus:outline-none cursor-pointer"
                          required
                        />
                      </div>
                      <div className="flex-1 px-4 py-3 border-l border-slate-200 dark:border-slate-800">
                        <p className="section-label mb-1">Check Out</p>
                        <input
                          type="date"
                          value={checkOut}
                          min={checkIn || today}
                          onChange={(e) => setCheckOut(e.target.value)}
                          className="w-full bg-transparent text-sm text-slate-900 dark:text-white font-semibold focus:outline-none cursor-pointer"
                          required
                        />
                      </div>
                    </div>
                    <div className="px-4 py-3">
                      <p className="section-label mb-1">Guests</p>
                      <p className="text-sm font-semibold text-slate-900 dark:text-white">{room.capacity} guests max</p>
                    </div>
                  </div>

                  {/* Price Breakdown */}
                  {diffDays > 0 && (
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between text-slate-600 dark:text-slate-300">
                        <span>₹{parseFloat(room.price).toFixed(0)} × {diffDays} night{diffDays > 1 ? 's' : ''}</span>
                        <span>₹{totalPrice.toFixed(0)}</span>
                      </div>
                      <div className="flex justify-between font-bold text-slate-900 dark:text-white border-t border-slate-100 dark:border-slate-800 pt-2 mt-2">
                        <span>Total</span>
                        <span>₹{totalPrice.toFixed(0)}</span>
                      </div>
                    </div>
                  )}

                  <button
                    type="submit"
                    disabled={room.availability_status !== 'available'}
                    className={`w-full py-4 rounded-2xl font-bold text-sm transition-all ${
                      room.availability_status === 'available'
                        ? 'bg-[#FF385C] hover:bg-[#e0314f] text-white shadow-lg active:scale-[0.98]'
                        : 'bg-slate-100 dark:bg-slate-800 text-slate-400 dark:text-slate-500 cursor-not-allowed'
                    }`}
                    style={room.availability_status === 'available' ? {
                      boxShadow: '0 4px 14px rgba(255,56,92,0.35)'
                    } : {}}
                  >
                    {room.availability_status === 'available' ? 'Reserve Now' : 'Currently Unavailable'}
                  </button>

                  <p className="text-center text-xs text-slate-400">
                    You won't be charged yet
                  </p>
                </form>

                {/* Trust Badges */}
                <div className="flex items-center justify-center gap-2 text-xs text-slate-500 dark:text-slate-400 bg-slate-50 dark:bg-slate-900/50 rounded-xl p-3">
                  <Shield size={14} className="text-[#FF385C]" />
                  <span>Secure & encrypted booking</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default RoomDetails;
