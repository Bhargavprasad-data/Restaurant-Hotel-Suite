import React, { useState, useEffect, useRef } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import {
  Menu, X, Home, BedDouble, CalendarCheck, User, LogOut,
  Globe, ChevronRight, Search, Bell, Star, Hotel, Sun, Moon,
  ArrowLeft, HelpCircle
} from 'lucide-react';
import { useTheme } from '../context/ThemeContext';

const Navbar = ({ isConnecting = false }) => {
  const { user, logout } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const location = useLocation();
  const navigate = useNavigate();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [sidebarClosing, setSidebarClosing] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const sidebarRef = useRef(null);

  // Scroll effect for transparent → white header
  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 10);
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // Lock body scroll when sidebar open
  useEffect(() => {
    document.body.style.overflow = sidebarOpen ? 'hidden' : '';
    return () => { document.body.style.overflow = ''; };
  }, [sidebarOpen]);

  // Close sidebar on route change
  useEffect(() => {
    closeSidebar();
  }, [location.pathname]);

  // Close on outside click
  useEffect(() => {
    const handler = (e) => {
      if (sidebarOpen && sidebarRef.current && !sidebarRef.current.contains(e.target)) {
        closeSidebar();
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [sidebarOpen]);

  // Close on Escape key
  useEffect(() => {
    const handler = (e) => {
      if (e.key === 'Escape' && sidebarOpen) closeSidebar();
    };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [sidebarOpen]);

  const openSidebar = () => {
    setSidebarClosing(false);
    setSidebarOpen(true);
  };

  const closeSidebar = () => {
    if (!sidebarOpen) return;
    setSidebarClosing(true);
    setTimeout(() => {
      setSidebarOpen(false);
      setSidebarClosing(false);
    }, 300);
  };

  const handleLogout = () => {
    logout();
    closeSidebar();
    navigate('/');
  };

  const isActive = (path) => location.pathname === path;

  const navLinks = [
    { label: 'Home', path: '/', icon: <Home size={18} /> },
    { label: 'Browse Rooms', path: '/rooms', icon: <BedDouble size={18} /> },
    ...(user ? [
      { label: 'My Bookings', path: '/my-bookings', icon: <CalendarCheck size={18} /> },
    ] : []),
    { label: 'Help & Contact', path: '/help', icon: <HelpCircle size={18} /> },
  ];

  const isHeroPage = ['/', '/rooms'].includes(location.pathname);

  return (
    <>
      {/* ── Main Navbar ── */}
      <header
        className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${scrolled || !isHeroPage
            ? 'bg-white/95 dark:bg-slate-950/95 backdrop-blur-md border-b border-slate-100 dark:border-slate-800 shadow-sm'
            : 'bg-transparent'
          }`}
        style={{ height: 'var(--header-h)' }}
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 h-full flex items-center justify-between gap-4">

          {/* Logo + Back Button */}
          <div className="flex items-center gap-2.5 shrink-0">
            {location.pathname !== '/' && (
              <button
                onClick={() => navigate(-1)}
                className={`flex items-center justify-center w-9 h-9 rounded-xl border transition-all ${scrolled || !isHeroPage
                    ? 'border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-900 active:scale-95'
                    : 'border-white/20 text-white hover:bg-white/10 active:scale-95'
                  }`}
                title="Go Back"
              >
                <ArrowLeft size={16} />
              </button>
            )}

            <Link to="/" className="flex items-center gap-2.5 shrink-0 group">
              <div className="w-9 h-9 rounded-xl bg-[#FF385C] flex items-center justify-center shadow-md group-hover:scale-105 transition-transform">
                <Hotel size={18} className="text-white" />
              </div>
              <div className="hidden sm:block">
                <p className={`font-bold text-[15px] leading-tight transition-colors ${scrolled || !isHeroPage ? 'text-slate-900 dark:text-white' : 'text-white'
                  }`}>Tasty Suites</p>
                <p className={`text-[10px] font-medium transition-colors ${scrolled || !isHeroPage ? 'text-slate-400 dark:text-slate-400' : 'text-white/60'
                  }`}>Premium Stays</p>
              </div>
            </Link>
          </div>

          {/* Desktop Nav Links */}
          <nav className="hidden lg:flex items-center gap-1">
            {navLinks.map((link) => (
              <Link
                key={link.path}
                to={link.path}
                className={`px-4 py-2 rounded-xl text-sm font-medium transition-all duration-150 ${isActive(link.path)
                    ? 'bg-slate-100 dark:bg-slate-800 text-[#FF385C] dark:text-[#FF385C] font-semibold'
                    : scrolled || !isHeroPage
                      ? 'text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white hover:bg-slate-50 dark:hover:bg-slate-800'
                      : 'text-white/80 hover:text-white hover:bg-white/10'
                  }`}
              >
                {link.label}
              </Link>
            ))}
          </nav>

          {/* Desktop Actions */}
          <div className="hidden md:flex items-center gap-3">
            {/* Connection Status Badge */}
            <div className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl border text-xs font-semibold select-none transition-all ${isConnecting
                ? 'border-amber-200 bg-amber-500/10 text-amber-500 dark:border-amber-900/30'
                : scrolled || !isHeroPage
                  ? 'border-emerald-200 bg-emerald-500/10 text-emerald-600 dark:border-emerald-900/30 dark:text-emerald-500'
                  : 'border-white/20 bg-white/10 text-emerald-400'
              }`}>
              <span className={`w-1.5 h-1.5 rounded-full ${isConnecting ? 'bg-amber-500 animate-pulse' : 'bg-emerald-500'} shadow-sm`} />
              <span>{isConnecting ? 'Connecting' : 'Live'}</span>
            </div>

            {/* Theme Toggle */}
            <button
              onClick={toggleTheme}
              className={`p-2 rounded-xl border transition-all ${scrolled || !isHeroPage
                  ? 'border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800'
                  : 'border-white/20 text-white/80 hover:bg-white/10'
                }`}
              aria-label="Toggle theme"
            >
              {theme === 'dark' ? <Sun size={17} /> : <Moon size={17} />}
            </button>

            {user ? (
              <>
                <span className={`text-sm font-medium hidden lg:block transition-colors ${scrolled || !isHeroPage ? 'text-slate-600 dark:text-slate-350' : 'text-white/80'
                  }`}>
                  Hi, {user.name.split(' ')[0]} 👋
                </span>
                <button
                  onClick={() => navigate('/profile')}
                  className="w-9 h-9 rounded-full bg-[#FF385C] text-white flex items-center justify-center font-bold text-sm uppercase shadow-md hover:bg-[#e0314f] transition-colors"
                >
                  {user.name.substring(0, 1)}
                </button>
                <button
                  onClick={handleLogout}
                  className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold border transition-all ${scrolled || !isHeroPage
                      ? 'border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800'
                      : 'border-white/20 text-white/80 hover:bg-white/10'
                    }`}
                >
                  <LogOut size={13} />
                  <span>Logout</span>
                </button>
              </>
            ) : (
              <div className="flex items-center gap-2">
                <Link
                  to="/login"
                  className={`px-4 py-2 rounded-xl text-sm font-medium transition-all ${scrolled || !isHeroPage
                      ? 'text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800'
                      : 'text-white/90 hover:bg-white/10'
                    }`}
                >
                  Sign In
                </Link>
                <Link to="/signup" className="btn-brand py-2 px-4 text-sm">
                  Register
                </Link>
              </div>
            )}
          </div>

          {/* Mobile Actions */}
          <div className="md:hidden flex items-center gap-2">
            {/* Connection Status Badge (Mobile) */}
            <div className={`flex items-center gap-1 px-2.5 py-1.5 rounded-full border text-[10px] font-bold select-none transition-all ${isConnecting
                ? 'border-amber-200 bg-amber-500/10 text-amber-500 dark:border-amber-900/30'
                : scrolled || !isHeroPage
                  ? 'border-emerald-200 bg-emerald-500/10 text-emerald-600 dark:border-emerald-900/30 dark:text-emerald-500'
                  : 'border-white/20 bg-white/10 text-emerald-400'
              }`}>
              <span className={`w-1.5 h-1.5 rounded-full ${isConnecting ? 'bg-amber-500 animate-pulse' : 'bg-emerald-500'}`} />
              <span>{isConnecting ? 'Connecting' : 'Live'}</span>
            </div>

            {/* Theme Toggle */}
            <button
              onClick={toggleTheme}
              className={`p-2 rounded-full border transition-all ${scrolled || !isHeroPage
                  ? 'border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm text-slate-700 dark:text-slate-350'
                  : 'border-white/25 bg-white/10 text-white'
                }`}
              aria-label="Toggle theme"
            >
              {theme === 'dark' ? <Sun size={17} /> : <Moon size={17} />}
            </button>

            {/* Mobile Menu Trigger */}
            <button
              onClick={openSidebar}
              aria-label="Open navigation menu"
              className={`flex items-center gap-2 pl-3 pr-4 py-2 rounded-full border transition-all ${scrolled || !isHeroPage
                  ? 'border-slate-200 bg-white dark:bg-slate-900 dark:border-slate-800 shadow-sm text-slate-700 dark:text-slate-300'
                  : 'border-white/25 bg-white/10 text-white'
                }`}
            >
              <Menu size={18} />
              <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold ${user ? 'bg-[#FF385C] text-white' : 'bg-slate-200 dark:bg-slate-800 text-slate-600 dark:text-slate-400'
                }`}>
                {user ? user.name.substring(0, 1).toUpperCase() : <User size={13} />}
              </div>
            </button>
          </div>
        </div>
      </header>

      {/* ── Sidebar Overlay ── */}
      {(sidebarOpen || sidebarClosing) && (
        <div
          className={`fixed inset-0 z-[99] ${sidebarClosing ? 'overlay-exit' : 'overlay-enter'}`}
          style={{ background: 'rgba(15,23,42,0.55)', backdropFilter: 'blur(3px)' }}
          onClick={closeSidebar}
        />
      )}

      {/* ── Sidebar Drawer (Jio/Hotstar Style) ── */}
      {(sidebarOpen || sidebarClosing) && (
        <aside
          ref={sidebarRef}
          className={`fixed top-0 left-0 bottom-0 z-[100] bg-white dark:bg-slate-900 flex flex-col shadow-2xl overflow-y-auto no-scrollbar border-r border-transparent dark:border-slate-800 ${sidebarClosing ? 'sidebar-exit' : 'sidebar-enter'
            }`}
          style={{ width: '300px', maxWidth: '85vw' }}
        >
          {/* Sidebar Header */}
          <div className="flex items-center justify-between p-5 border-b border-slate-100 dark:border-slate-800">
            <Link to="/" onClick={closeSidebar} className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-[#FF385C] flex items-center justify-center shadow-md">
                <Hotel size={22} className="text-white" />
              </div>
              <div>
                <p className="font-bold text-slate-900 dark:text-white text-[15px] leading-tight">Tasty Suites</p>
                <p className="text-[10px] text-slate-400 dark:text-slate-500 font-medium">Premium Stays</p>
              </div>
            </Link>
            <button
              onClick={closeSidebar}
              className="w-9 h-9 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 flex items-center justify-center text-slate-500 dark:text-slate-400 transition-colors"
            >
              <X size={18} />
            </button>
          </div>

          {/* User Profile Strip */}
          {user ? (
            <div className="m-4 p-4 rounded-2xl bg-gradient-to-r from-[#FF385C]/8 to-[#FF385C]/4 border border-[#FF385C]/15 dark:from-[#FF385C]/15 dark:to-[#FF385C]/5 dark:border-[#FF385C]/30">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-full bg-[#FF385C] text-white flex items-center justify-center font-bold text-lg uppercase shadow-md">
                  {user.name.substring(0, 1)}
                </div>
                <div className="min-w-0">
                  <p className="font-bold text-slate-900 dark:text-white text-sm truncate">{user.name}</p>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400 truncate">{user.email}</p>
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-[#FF385C]/10 text-[#FF385C] text-[10px] font-semibold capitalize mt-0.5">
                    <Star size={9} fill="currentColor" />
                    {user.role} Member
                  </span>
                </div>
              </div>
            </div>
          ) : (
            <div className="m-4 p-4 rounded-2xl bg-slate-50 dark:bg-slate-950 border border-slate-100 dark:border-slate-800 space-y-3">
              <p className="text-sm text-slate-600 dark:text-slate-400 font-medium">Sign in to manage your bookings</p>
              <div className="flex gap-2">
                <Link to="/login" onClick={closeSidebar} className="flex-1 text-center py-2 rounded-xl border-2 border-slate-200 dark:border-slate-800 text-sm font-semibold text-slate-700 dark:text-slate-300 hover:border-slate-300 dark:hover:border-slate-700 transition-all">
                  Sign In
                </Link>
                <Link to="/signup" onClick={closeSidebar} className="flex-1 text-center py-2 rounded-xl bg-[#FF385C] text-white text-sm font-semibold hover:bg-[#e0314f] transition-all">
                  Register
                </Link>
              </div>
            </div>
          )}

          {/* Nav Links */}
          <nav className="flex-1 px-3 py-2 space-y-1">
            <p className="section-label px-4 mb-2">Navigation</p>
            {navLinks.map((link) => (
              <Link
                key={link.path}
                to={link.path}
                onClick={closeSidebar}
                className={`sidebar-nav-item ${isActive(link.path) ? 'active' : ''}`}
              >
                <span className={`p-2 rounded-xl ${isActive(link.path) ? 'bg-[#FF385C]/10 text-[#FF385C]' : 'bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400'}`}>
                  {link.icon}
                </span>
                <span className="flex-1">{link.label}</span>
                <ChevronRight size={16} className="text-slate-300" />
              </Link>
            ))}
          </nav>

          {/* Sidebar Footer */}
          {user && (
            <div className="p-4 border-t border-slate-100 dark:border-slate-800">
              <button
                onClick={handleLogout}
                className="w-full flex items-center gap-3 px-4 py-3 rounded-xl bg-red-50 dark:bg-red-950/20 text-red-500 hover:bg-red-100 dark:hover:bg-red-950/40 transition-colors font-medium text-sm border border-red-100 dark:border-red-900/30"
              >
                <LogOut size={17} />
                <span>Sign Out</span>
              </button>
            </div>
          )}

          <div className="px-4 py-3 text-center">
            <p className="text-[10px] text-slate-400 dark:text-slate-500">© 2025 Tasty Suites · Premium Hotel</p>
          </div>
        </aside>
      )}
    </>
  );
};

export default Navbar;
