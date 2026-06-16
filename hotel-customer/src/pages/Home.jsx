import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import Navbar from '../components/Navbar';
import {
  Search, Calendar, Users, Award, Shield, MapPin, ArrowRight,
  Star, TrendingUp, ChevronRight, Wifi, Coffee, Car, Dumbbell,
  Hotel, Bed, BedDouble, Sparkles, Gem, Map
} from 'lucide-react';

/* ─── Static Showcase Data ─── */
const FEATURED_ROOMS = [
  {
    id: 'f1',
    title: 'Presidential Suite',
    type: 'Suite',
    price: 12000,
    rating: 4.97,
    reviews: 318,
    location: 'Paradise Valley Wing',
    img: 'https://images.unsplash.com/photo-1631049307264-da0ec9d70304?auto=format&fit=crop&w=800&q=80',
    badge: '⭐ Guest Favourite',
  },
  {
    id: 'f2',
    title: 'Deluxe King Bedroom',
    type: 'Deluxe',
    price: 7500,
    rating: 4.85,
    reviews: 204,
    location: 'Garden View Block',
    img: 'https://images.unsplash.com/photo-1618773928121-c32242e63f39?auto=format&fit=crop&w=800&q=80',
    badge: null,
  },
  {
    id: 'f3',
    title: 'Luxury Double Room',
    type: 'Double',
    price: 4500,
    rating: 4.72,
    reviews: 187,
    location: 'Poolside Terrace',
    img: 'https://images.unsplash.com/photo-1578683010236-d716f9a3f461?auto=format&fit=crop&w=800&q=80',
    badge: null,
  },
  {
    id: 'f4',
    title: 'Cozy Single Retreat',
    type: 'Single',
    price: 2800,
    rating: 4.68,
    reviews: 142,
    location: 'Quiet East Wing',
    img: 'https://images.unsplash.com/photo-1540518614846-7eded433c457?auto=format&fit=crop&w=800&q=80',
    badge: null,
  },
];

const AMENITIES = [
  { icon: <Wifi size={22} />, label: 'Free High-Speed WiFi' },
  { icon: <Coffee size={22} />, label: 'Complimentary Breakfast' },
  { icon: <Car size={22} />, label: 'Free Valet Parking' },
  { icon: <Dumbbell size={22} />, label: 'Fitness & Spa Center' },
];

const ROOM_TYPES = ['All', 'Single', 'Double', 'Suite', 'Deluxe'];

const Home = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [activeType, setActiveType] = useState('All');

  return (
    <div className="min-h-screen bg-[#f7f7f7] dark:bg-slate-950 flex flex-col transition-colors duration-300">
      <Navbar />

      {/* ══════════════════════ HERO ══════════════════════ */}
      <section className="relative min-h-[92vh] flex items-center justify-center overflow-hidden">
        {/* Background image */}
        <div className="absolute inset-0 z-0">
          <img
            src="https://images.unsplash.com/photo-1542314831-068cd1dbfeeb?auto=format&fit=crop&w=1800&q=80"
            alt="Tasty Suites luxury hotel lobby"
            className="w-full h-full object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-b from-slate-900/70 via-slate-900/55 to-slate-900/80" />
        </div>

        {/* Floating orbs */}
        <div className="absolute top-32 left-16 w-72 h-72 bg-[#FF385C]/15 rounded-full blur-[80px] pointer-events-none z-10" />
        <div className="absolute bottom-24 right-16 w-96 h-96 bg-purple-600/10 rounded-full blur-[100px] pointer-events-none z-10" />

        {/* Hero Content */}
        <div className="relative z-20 w-full max-w-5xl mx-auto px-4 sm:px-6 text-center pt-24 pb-16 animate-fade-in-up">
          <span className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-white/10 border border-white/20 text-white/90 text-xs font-semibold mb-6 backdrop-blur-sm">
            <TrendingUp size={12} className="text-[#FF385C]" />
            Rated #1 in Paradise Valley — 2025
          </span>

          <h1 className="text-5xl sm:text-6xl md:text-7xl font-bold text-white leading-[1.08] tracking-tight mb-6">
            Find your perfect<br />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#FF385C] to-[#FF8C69]">
              luxury escape
            </span>
          </h1>

          <div className="flex justify-center gap-4 mt-6">
            <Link
              to="/rooms"
              className="px-8 py-3.5 rounded-full bg-[#FF385C] hover:bg-[#e0314f] text-white font-semibold text-sm transition-all active:scale-95 shadow-lg flex items-center gap-2 hover:shadow-xl"
              style={{ boxShadow: '0 6px 20px rgba(255,56,92,0.45)' }}
            >
              <span>Explore Our Suites</span>
              <ArrowRight size={16} />
            </Link>
          </div>
        </div>
      </section>

      {/* ══════════════════════ ROOM TYPE TABS ══════════════════════ */}
      <section className="bg-white dark:bg-slate-950 border-b border-slate-100 dark:border-slate-900 sticky top-[70px] z-30 transition-colors duration-300">
        <div className="max-w-7xl mx-auto px-4 sm:px-6">
          <div className="flex items-center gap-2 py-3 overflow-x-auto no-scrollbar">
            {ROOM_TYPES.map((type) => (
              <button
                key={type}
                onClick={() => {
                  setActiveType(type);
                  const p = new URLSearchParams();
                  if (type !== 'All') p.append('room_type', type.toLowerCase());
                  navigate(`/rooms?${p.toString()}`);
                }}
                className={`filter-tag shrink-0 ${activeType === type ? 'active' : ''}`}
              >
                <span className="flex items-center gap-1.5 font-medium">
                  {type === 'All' && <Hotel size={15} />}
                  {type === 'Single' && <Bed size={15} />}
                  {type === 'Double' && <BedDouble size={15} />}
                  {type === 'Suite' && <Sparkles size={15} />}
                  {type === 'Deluxe' && <Gem size={15} />}
                  <span>{type === 'All' ? 'All Rooms' : type}</span>
                </span>
              </button>
            ))}
            <div className="ml-auto shrink-0">
              <button
                onClick={() => navigate('/rooms')}
                className="flex items-center gap-1.5 text-sm font-medium text-slate-700 dark:text-slate-350 hover:text-slate-900 dark:hover:text-white border border-slate-200 dark:border-slate-800 px-4 py-2 rounded-full hover:border-slate-300 dark:hover:border-slate-700 transition-all"
              >
                <span>Filters</span>
                <span className="w-5 h-5 rounded-full bg-slate-900 dark:bg-white text-white dark:text-slate-900 text-[10px] flex items-center justify-center font-bold">4</span>
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* ══════════════════════ FEATURED ROOMS ══════════════════════ */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 py-12">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-2xl font-bold text-slate-900 dark:text-white">Featured Suites</h2>
            <p className="text-sm text-slate-500 dark:text-slate-400 mt-0.5">Curated picks — based on top reviews</p>
          </div>
          <Link
            to="/rooms"
            className="flex items-center gap-1 text-sm font-semibold text-slate-800 dark:text-slate-200 hover:text-[#FF385C] transition-colors underline-offset-2 hover:underline"
          >
            Show all <ArrowRight size={15} />
          </Link>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {FEATURED_ROOMS.map((room, i) => (
            <Link
              key={room.id}
              to="/rooms"
              className="room-card group animate-fade-in-up"
              style={{ animationDelay: `${i * 0.07}s` }}
            >
              {/* Image */}
              <div className="relative overflow-hidden rounded-2xl aspect-[4/3] bg-slate-100">
                <img
                  src={room.img}
                  alt={room.title}
                  className="room-card-img w-full h-full object-cover"
                />
                {room.badge && (
                  <div className="absolute top-3 left-3 px-2.5 py-1 rounded-full bg-white text-slate-800 text-[10px] font-bold shadow-md">
                    {room.badge}
                  </div>
                )}
                <button className="absolute top-3 right-3 w-8 h-8 rounded-full bg-white/90 backdrop-blur-sm flex items-center justify-center shadow-sm hover:bg-white transition-colors">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="text-slate-700">
                    <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
                  </svg>
                </button>
              </div>

              {/* Info */}
              <div className="pt-3 space-y-1">
                <div className="flex items-center justify-between">
                  <p className="font-semibold text-slate-900 dark:text-white text-sm truncate">{room.title}</p>
                  <div className="flex items-center gap-1 shrink-0 ml-2">
                    <Star size={12} fill="#FF385C" stroke="none" />
                    <span className="text-xs font-semibold text-slate-700 dark:text-slate-350">{room.rating}</span>
                  </div>
                </div>
                <p className="text-xs text-slate-500 dark:text-slate-400 flex items-center gap-1">
                  <MapPin size={11} className="text-slate-400" />
                  {room.location}
                </p>
                <p className="text-xs text-slate-400 dark:text-slate-500">{room.reviews} reviews</p>
                <p className="text-sm font-semibold text-slate-900 dark:text-white pt-1">
                  <span>₹{room.price.toLocaleString('en-IN')}</span>
                  <span className="font-normal text-slate-500 dark:text-slate-400"> / night</span>
                </p>
              </div>
            </Link>
          ))}
        </div>
      </section>

      {/* ══════════════════════ AMENITIES ══════════════════════ */}
      <section className="bg-white dark:bg-slate-900 border-y border-slate-100 dark:border-slate-800 py-14 transition-colors duration-300">
        <div className="max-w-7xl mx-auto px-4 sm:px-6">
          <div className="text-center mb-10">
            <p className="section-label mb-2">What's included</p>
            <h2 className="text-2xl font-bold text-slate-900 dark:text-white">Premium Amenities</h2>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
            {AMENITIES.map((a, i) => (
              <div
                key={i}
                className="flex flex-col items-center gap-3 p-6 rounded-2xl bg-slate-50 dark:bg-slate-850 hover:bg-slate-100 dark:hover:bg-slate-800 border border-slate-100 dark:border-slate-750 transition-all duration-300 animate-fade-in-up"
                style={{ animationDelay: `${i * 0.08}s` }}
              >
                <div className="w-12 h-12 rounded-2xl bg-[#FF385C]/10 flex items-center justify-center text-[#FF385C]">
                  {a.icon}
                </div>
                <p className="text-sm font-semibold text-slate-700 dark:text-slate-300 text-center">{a.label}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ══════════════════════ WHY CHOOSE US ══════════════════════ */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 py-14">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {[
            { icon: <Award size={26} className="text-[#FF385C]" />, title: 'Five-Star Hospitality', desc: 'Award-winning service and 24/7 concierge ready to make your stay unforgettable.' },
            { icon: <Shield size={26} className="text-[#FF385C]" />, title: 'Secure Booking', desc: 'Fully encrypted payments, secure digital keys, and verified bookings — always safe.' },
            { icon: <Map size={26} className="text-[#FF385C]" />, title: 'Scenic Location', desc: 'Set in Paradise Valley with panoramic views, infinity pools, and local attractions.' },
          ].map((benefit, i) => (
            <div
              key={i}
              className="card p-6 flex gap-4 hover:shadow-md transition-all animate-fade-in-up"
              style={{ animationDelay: `${i * 0.1}s` }}
            >
              <div className="w-14 h-14 rounded-2xl bg-slate-50 dark:bg-slate-800 flex items-center justify-center shrink-0 transition-colors duration-300">
                {benefit.icon}
              </div>
              <div>
                <h3 className="font-bold text-slate-900 dark:text-white mb-1.5">{benefit.title}</h3>
                <p className="text-sm text-slate-500 dark:text-slate-400 leading-relaxed">{benefit.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* ══════════════════════ CTA BANNER ══════════════════════ */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 pb-16">
        <div
          className="relative overflow-hidden rounded-3xl p-10 md:p-14 text-white text-center"
          style={{
            background: 'linear-gradient(135deg, #1a1a2e 0%, #16213e 40%, #0f3460 100%)',
          }}
        >
          <div className="absolute top-0 right-0 w-72 h-72 bg-[#FF385C]/10 rounded-full blur-[80px] pointer-events-none" />
          <div className="absolute bottom-0 left-0 w-72 h-72 bg-blue-500/10 rounded-full blur-[80px] pointer-events-none" />
          <div className="relative z-10">
            <p className="section-label text-white/50 mb-3">Limited time offer</p>
            <h2 className="text-3xl md:text-4xl font-bold mb-4">Book your perfect suite today</h2>
            <p className="text-white/70 mb-8 max-w-lg mx-auto text-sm leading-relaxed">
              Enjoy exclusive member rates, priority check-in, and personalized service when you book directly through Tasty Suites.
            </p>
            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              <Link to="/rooms" className="btn-brand px-8 py-3.5">
                Browse All Rooms
              </Link>
              {!user && (
                <Link to="/signup" className="inline-flex items-center justify-center px-8 py-3.5 rounded-xl border-2 border-white/20 text-white font-semibold text-sm hover:bg-white/10 transition-all">
                  Create Free Account
                </Link>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* ══════════════════════ FOOTER ══════════════════════ */}
      <footer className="bg-slate-900 text-slate-400 text-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-10">
          <div className="flex flex-col md:flex-row items-center justify-between gap-6">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-[#FF385C] flex items-center justify-center">
                <Hotel size={18} className="text-white" />
              </div>
              <div>
                <p className="text-white font-bold text-sm">Tasty Suites</p>
                <p className="text-[11px] text-slate-500">Premium Stays & Dining</p>
              </div>
            </div>
            <p className="text-xs text-slate-500 text-center">
              © {new Date().getFullYear()} Tasty Bites & Suites. All rights reserved.
            </p>
            <div className="flex gap-6 text-xs">
              <Link to="/rooms" className="hover:text-white transition-colors">Suites</Link>
              <Link to="/" className="hover:text-white transition-colors">Dining</Link>
              <Link to="/" className="hover:text-white transition-colors">Privacy</Link>
              <Link to="/" className="hover:text-white transition-colors">Terms</Link>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default Home;
