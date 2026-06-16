import React, { useState, useEffect } from 'react';
import { useSearchParams, Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useSocket } from '../context/SocketContext';
import {
  SlidersHorizontal, Eye, Star, Search, X,
  MapPin, ChevronDown, ChevronUp, Users, ArrowLeft
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

/* ── Shimmer Card Component ── */
const RoomSkeletonCard = () => (
  <div className="card overflow-hidden animate-fade-in">
    <div className="skeleton aspect-[4/3] rounded-none" style={{ borderRadius: '16px 16px 0 0' }} />
    <div className="p-4 space-y-3">
      <div className="skeleton h-4 w-3/4" />
      <div className="skeleton h-3 w-1/2" />
      <div className="skeleton h-3 w-1/3" />
      <div className="flex justify-between items-center pt-2">
        <div className="skeleton h-5 w-20" />
        <div className="skeleton h-9 w-28 rounded-xl" />
      </div>
    </div>
  </div>
);

const RoomListing = () => {
  const { apiFetch } = useAuth();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();

  const [rooms, setRooms] = useState([]);
  const [loading, setLoading] = useState(true);
  const [pagination, setPagination] = useState({ page: 1, totalPages: 1 });

  // Filter state
  const [roomType, setRoomType] = useState(searchParams.get('room_type') || '');
  const [maxPrice, setMaxPrice] = useState(searchParams.get('max_price') || '15000');
  const [capacity, setCapacity] = useState(searchParams.get('capacity') || '');
  const [search, setSearch] = useState(searchParams.get('search') || '');
  const [page, setPage] = useState(parseInt(searchParams.get('page') || '1'));

  // Mobile filter panel
  const [showFilters, setShowFilters] = useState(false);

  const fetchRooms = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (roomType) params.append('room_type', roomType);
      if (maxPrice) params.append('max_price', maxPrice);
      if (capacity) params.append('capacity', capacity);
      if (search) params.append('search', search);
      params.append('page', page);
      params.append('limit', 8);

      const data = await apiFetch(`/rooms?${params.toString()}`);
      setRooms(data.rooms);
      setPagination(data.pagination);
    } catch (err) {
      console.error(err);
      toast.error('Failed to load rooms.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRooms();
  }, [roomType, maxPrice, capacity, page]);

  const socket = useSocket();

  useEffect(() => {
    if (!socket) return;

    const handleRoomUpdated = (data) => {
      fetchRooms();
      if (data.action === 'create') {
        toast.success(`A new ${data.room.room_type} room is now available!`, { id: 'room-listing-toast' });
      } else if (data.action === 'delete') {
        toast.success(`Room catalog updated by administrator`, { id: 'room-listing-toast' });
      } else if (data.action === 'update') {
        toast.success(`Room ${data.room.room_number || ''} details or status updated`, { id: 'room-listing-toast' });
      }
    };

    socket.on('room:updated', handleRoomUpdated);
    return () => {
      socket.off('room:updated', handleRoomUpdated);
    };
  }, [socket, roomType, maxPrice, capacity, page, search]);

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    setPage(1);
    const newParams = {};
    if (roomType) newParams.room_type = roomType;
    if (maxPrice) newParams.max_price = maxPrice;
    if (capacity) newParams.capacity = capacity;
    if (search) newParams.search = search;
    newParams.page = '1';
    setSearchParams(newParams);
    fetchRooms();
    setShowFilters(false);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handlePageChange = (newPage) => {
    setPage(newPage);
    const newParams = Object.fromEntries(searchParams.entries());
    newParams.page = newPage.toString();
    setSearchParams(newParams);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const clearFilters = () => {
    setRoomType('');
    setMaxPrice('15000');
    setCapacity('');
    setSearch('');
    setPage(1);
    setSearchParams({});
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const activeFilterCount = [roomType, capacity, search].filter(Boolean).length + (maxPrice !== '15000' ? 1 : 0);

  const TYPES = ['single', 'double', 'suite', 'deluxe'];

  return (
    <div className="min-h-screen bg-[#f7f7f7] dark:bg-slate-950 flex flex-col transition-colors duration-300">

      {/* ── Hero Banner ── */}
      <div
        className="relative pt-0 h-52 flex items-end pb-8 overflow-hidden"
        style={{
          backgroundImage: `linear-gradient(rgba(15,23,42,0.68), rgba(15,23,42,0.85)), url('https://images.unsplash.com/photo-1578683010236-d716f9a3f461?auto=format&fit=crop&w=1400&q=80')`,
          backgroundSize: 'cover',
          backgroundPosition: 'center',
        }}
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 w-full">
          <button
            onClick={() => navigate('/')}
            className="flex items-center gap-1.5 text-white/70 hover:text-white text-xs font-semibold mb-3 bg-white/10 hover:bg-white/20 border border-white/15 px-3 py-1.5 rounded-full transition-all backdrop-blur-sm shadow-sm active:scale-95"
          >
            <ArrowLeft size={13} />
            Back to Home
          </button>
          <h1 className="text-3xl font-bold text-white">Browse Rooms</h1>
          <p className="text-sm text-white/60 mt-1 font-light">
            {loading ? 'Loading…' : `${rooms.length} rooms available`}
          </p>
        </div>
      </div>

      {/* ── Inline Search Bar ── */}
      <div className="bg-white border-b border-slate-100 shadow-sm sticky top-[70px] z-30">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-3">
          <form onSubmit={handleSearchSubmit} className="flex items-center gap-3">
            <div className="flex-1 flex items-center gap-2 bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5">
              <Search size={16} className="text-slate-400 shrink-0" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search room number, type..."
                className="flex-1 bg-transparent text-sm text-slate-800 placeholder:text-slate-400 focus:outline-none font-medium"
              />
              {search && (
                <button type="button" onClick={() => setSearch('')} className="text-slate-400 hover:text-slate-600">
                  <X size={15} />
                </button>
              )}
            </div>

            {/* Filter Toggle Button */}
            <button
              type="button"
              onClick={() => setShowFilters(!showFilters)}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-xl border-2 font-semibold text-sm transition-all ${
                showFilters || activeFilterCount > 0
                  ? 'border-slate-900 bg-slate-900 text-white'
                  : 'border-slate-200 text-slate-700 hover:border-slate-300'
              }`}
            >
              <SlidersHorizontal size={16} />
              <span className="hidden sm:block">Filters</span>
              {activeFilterCount > 0 && (
                <span className={`w-5 h-5 rounded-full text-[10px] font-bold flex items-center justify-center ${
                  showFilters ? 'bg-white text-slate-900' : 'bg-[#FF385C] text-white'
                }`}>
                  {activeFilterCount}
                </span>
              )}
              {showFilters ? <ChevronUp size={15} /> : <ChevronDown size={15} />}
            </button>

            <button type="submit" className="btn-brand py-2.5 px-5 text-sm">
              Search
            </button>
          </form>

          {/* Expandable Filter Panel */}
          {showFilters && (
            <div className="mt-4 pt-4 border-t border-slate-100 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4 animate-fade-in-up">
              {/* Room Type */}
              <div className="space-y-2">
                <p className="section-label">Room Type</p>
                <div className="flex flex-wrap gap-2">
                  {TYPES.map((t) => (
                    <button
                      key={t}
                      type="button"
                      onClick={() => setRoomType(roomType === t ? '' : t)}
                      className={`filter-tag py-1.5 text-xs ${roomType === t ? 'active' : ''}`}
                    >
                      {t.charAt(0).toUpperCase() + t.slice(1)}
                    </button>
                  ))}
                </div>
              </div>

              {/* Capacity */}
              <div className="space-y-2">
                <p className="section-label">Guest Capacity</p>
                <div className="flex flex-wrap gap-2">
                  {['1', '2', '3', '4'].map((c) => (
                    <button
                      key={c}
                      type="button"
                      onClick={() => setCapacity(capacity === c ? '' : c)}
                      className={`filter-tag py-1.5 text-xs ${capacity === c ? 'active' : ''}`}
                    >
                      {c === '4' ? '4+' : c} {parseInt(c) === 1 ? 'Guest' : 'Guests'}
                    </button>
                  ))}
                </div>
              </div>

              {/* Price Range */}
              <div className="space-y-2 sm:col-span-2">
                <div className="flex justify-between">
                  <p className="section-label">Max Price / Night</p>
                  <p className="text-sm font-bold text-[#FF385C]">₹{parseInt(maxPrice).toLocaleString('en-IN')}</p>
                </div>
                <input
                  type="range"
                  min="1000"
                  max="30000"
                  step="500"
                  value={maxPrice}
                  onChange={(e) => setMaxPrice(e.target.value)}
                  className="w-full h-2 rounded-full bg-slate-200 accent-[#FF385C] cursor-pointer"
                />
                <div className="flex justify-between text-xs text-slate-400">
                  <span>₹1,000</span>
                  <span>₹30,000</span>
                </div>
              </div>

              {/* Clear / Apply */}
              <div className="sm:col-span-2 md:col-span-4 flex gap-3 justify-end pt-2">
                {activeFilterCount > 0 && (
                  <button type="button" onClick={clearFilters} className="btn-outline py-2 px-5 text-sm">
                    Clear All
                  </button>
                )}
                <button
                  type="button"
                  onClick={handleSearchSubmit}
                  className="btn-brand py-2 px-6 text-sm"
                >
                  Apply Filters
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ── Main Content ── */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 py-8 flex-1 w-full">

        {/* Active filter chips */}
        {activeFilterCount > 0 && (
          <div className="flex flex-wrap gap-2 mb-6">
            {roomType && (
              <span className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-slate-900 text-white text-xs font-semibold">
                {roomType.charAt(0).toUpperCase() + roomType.slice(1)}
                <button onClick={() => setRoomType('')}><X size={12} /></button>
              </span>
            )}
            {capacity && (
              <span className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-slate-900 text-white text-xs font-semibold">
                {capacity}+ Guests
                <button onClick={() => setCapacity('')}><X size={12} /></button>
              </span>
            )}
            {search && (
              <span className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-slate-900 text-white text-xs font-semibold">
                "{search}"
                <button onClick={() => setSearch('')}><X size={12} /></button>
              </span>
            )}
            {maxPrice !== '15000' && (
              <span className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-slate-900 text-white text-xs font-semibold">
                Under ₹{parseInt(maxPrice).toLocaleString('en-IN')}
                <button onClick={() => setMaxPrice('15000')}><X size={12} /></button>
              </span>
            )}
          </div>
        )}

        {/* Rooms Grid */}
        {loading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {Array.from({ length: 8 }).map((_, i) => (
              <RoomSkeletonCard key={i} />
            ))}
          </div>
        ) : rooms.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-28 gap-5 text-center animate-fade-in">
            <div className="w-20 h-20 rounded-3xl bg-slate-100 flex items-center justify-center">
              <Search size={32} className="text-slate-400" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-slate-800 dark:text-white">No rooms found</h3>
              <p className="text-sm text-slate-500 dark:text-slate-400 mt-1 max-w-sm">
                Try adjusting your filters or search terms to find the perfect room.
              </p>
            </div>
            <button onClick={clearFilters} className="btn-brand">
              Clear Filters
            </button>
          </div>
        ) : (
          <>
            <p className="text-sm text-slate-500 dark:text-slate-450 mb-5 font-medium">
              Showing <span className="text-slate-900 dark:text-white font-semibold">{rooms.length}</span> rooms
              {roomType && <span> · {roomType.charAt(0).toUpperCase() + roomType.slice(1)}</span>}
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              {rooms.map((room, i) => (
                <div
                  key={room.id}
                  className="room-card card overflow-hidden animate-fade-in-up"
                  style={{ animationDelay: `${i * 0.05}s` }}
                >
                  {/* Image */}
                  <div className="relative overflow-hidden aspect-[4/3] bg-slate-100">
                    <img
                      src={getRoomImage(room.image_url) || 'https://images.unsplash.com/photo-1618773928121-c32242e63f39?auto=format&fit=crop&w=600&q=80'}
                      alt={`Room ${room.room_number}`}
                      className="room-card-img w-full h-full object-cover"
                    />
                    {/* Status badge */}
                    <div className={`absolute top-3 left-3 px-2.5 py-1 rounded-full text-[10px] font-bold backdrop-blur-sm ${
                      room.availability_status === 'available'
                        ? 'bg-emerald-500/90 text-white'
                        : 'bg-red-500/90 text-white'
                    }`}>
                      {room.availability_status === 'available' ? '✓ Available' : '✗ Booked'}
                    </div>
                    {/* Wishlist */}
                    <button className="absolute top-3 right-3 w-8 h-8 rounded-full bg-white/90 backdrop-blur-sm flex items-center justify-center shadow-sm hover:bg-white transition-colors group">
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="text-slate-700 group-hover:stroke-[#FF385C] transition-colors">
                        <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
                      </svg>
                    </button>
                    {/* Room number tag */}
                    <div className="absolute bottom-3 left-3 px-2.5 py-1 rounded-full bg-black/60 backdrop-blur-sm text-white text-[10px] font-semibold">
                      Room {room.room_number}
                    </div>
                  </div>

                  {/* Info */}
                  <div className="p-4 space-y-2">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <p className="font-semibold text-slate-900 dark:text-white text-sm capitalize">{room.room_type} Room</p>
                        <p className="text-xs text-slate-500 dark:text-slate-400 flex items-center gap-1 mt-0.5">
                          <Users size={11} className="text-slate-400" />
                          Up to {room.capacity} guests
                        </p>
                      </div>
                      <div className="flex items-center gap-1 shrink-0">
                        <Star size={12} fill="#FF385C" stroke="none" />
                        <span className="text-xs font-semibold text-slate-700 dark:text-slate-200">4.8</span>
                      </div>
                    </div>

                    <p className="text-xs text-slate-500 dark:text-slate-400 line-clamp-2 leading-relaxed">
                      {room.description || 'Spacious resort suite with premium bedding, high-speed WiFi, mini-bar, and scenic valley views.'}
                    </p>

                    <div className="divider !my-3" />

                    <div className="flex items-center justify-between">
                      <div>
                        <span className="text-lg font-bold text-slate-900 dark:text-white">₹{parseFloat(room.price).toFixed(0)}</span>
                        <span className="text-xs text-slate-500 dark:text-slate-400"> / night</span>
                      </div>
                      <Link
                        to={`/rooms/${room.id}`}
                        className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold transition-all active:scale-95"
                      >
                        <Eye size={13} />
                        View
                      </Link>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Pagination */}
            {pagination.totalPages > 1 && (
              <div className="flex items-center justify-center gap-2 mt-12">
                <button
                  onClick={() => handlePageChange(page - 1)}
                  disabled={page === 1}
                  className={`px-5 py-2.5 rounded-xl border text-sm font-semibold transition-all ${
                    page === 1
                      ? 'border-slate-100 text-slate-300 bg-slate-50 cursor-not-allowed'
                      : 'border-slate-200 text-slate-700 hover:border-slate-900 hover:bg-slate-900 hover:text-white'
                  }`}
                >
                  ← Previous
                </button>

                {Array.from({ length: pagination.totalPages }, (_, i) => i + 1).map((p) => (
                  <button
                    key={p}
                    onClick={() => handlePageChange(p)}
                    className={`w-10 h-10 rounded-xl border text-sm font-semibold transition-all ${
                      p === page
                        ? 'bg-slate-900 text-white border-slate-900'
                        : 'border-slate-200 text-slate-600 hover:border-slate-300'
                    }`}
                  >
                    {p}
                  </button>
                ))}

                <button
                  onClick={() => handlePageChange(page + 1)}
                  disabled={page === pagination.totalPages}
                  className={`px-5 py-2.5 rounded-xl border text-sm font-semibold transition-all ${
                    page === pagination.totalPages
                      ? 'border-slate-100 text-slate-300 bg-slate-50 cursor-not-allowed'
                      : 'border-slate-200 text-slate-700 hover:border-slate-900 hover:bg-slate-900 hover:text-white'
                  }`}
                >
                  Next →
                </button>
              </div>
            )}
          </>
        )}
      </main>
    </div>
  );
};

export default RoomListing;
