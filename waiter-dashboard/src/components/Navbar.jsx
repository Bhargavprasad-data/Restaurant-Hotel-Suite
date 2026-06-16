import React, { useState, useEffect, useRef } from 'react';
import { useTheme } from '../context/ThemeContext';
import { useSocket } from '../context/SocketContext';
import { Sun, Moon, Bell, X, Menu } from 'lucide-react';

const Navbar = () => {
  const { theme, toggleTheme } = useTheme();
  const socket = useSocket();
  const [notifications, setNotifications] = useState([]);
  const [showNotifications, setShowNotifications] = useState(false);
  const [time, setTime] = useState(new Date());
  const dropdownRef = useRef(null);

  // Live clock
  useEffect(() => {
    const t = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(t);
  }, []);

  // Socket notifications
  useEffect(() => {
    if (!socket) return;
    const handler = (notif) => {
      setNotifications(prev => [{ ...notif, timestamp: new Date(), read: false }, ...prev]);
      try {
        const audio = new Audio('https://assets.mixkit.co/active_storage/sfx/2869/2869-84.wav');
        audio.volume = 0.4;
        audio.play();
      } catch { /* audio blocked */ }
    };
    socket.on('notification', handler);
    return () => socket.off('notification', handler);
  }, [socket]);

  // Close dropdown on outside click
  useEffect(() => {
    const handler = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target))
        setShowNotifications(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const unreadCount = notifications.filter(n => !n.read).length;
  const markRead    = () => setNotifications(prev => prev.map(n => ({ ...n, read: true })));
  const clearAll    = () => setNotifications([]);
  const clearOne    = (id) => setNotifications(prev => prev.filter(n => n.id !== id));

  return (
    <header
      className="flex items-center justify-between shrink-0 px-5
        bg-white dark:bg-[#111420]
        border-b border-slate-100 dark:border-white/[0.07]
        select-none transition-colors duration-300"
      style={{ height: 'var(--topbar-h)' }}
    >
      {/* ── Left: hamburger (mobile) + subtitle ── */}
      <div className="flex items-center gap-3">
        <button
          onClick={() => window.dispatchEvent(new CustomEvent('toggle-mobile-sidebar'))}
          className="p-1.5 rounded-lg text-slate-400 hover:bg-slate-100 dark:hover:bg-white/[0.06]
            hover:text-slate-600 dark:hover:text-slate-300 transition-all sm:hidden"
          title="Toggle Menu"
        >
          <Menu size={17} />
        </button>

        <span className="hidden sm:block text-[11px] font-semibold uppercase tracking-[0.1em] text-slate-300 dark:text-slate-600">
          Waiter Operations
        </span>
      </div>

      {/* ── Right: clock + theme + notifications ── */}
      <div className="flex items-center gap-1">

        {/* Live clock */}
        <div className="hidden sm:flex items-center gap-1.5 mr-1 px-3 py-1.5 rounded-lg
          text-[11px] font-bold tabular-nums tracking-wide
          text-blue-500 dark:text-blue-400
          bg-blue-50 dark:bg-blue-500/[0.1]
          border border-blue-500/20 dark:border-blue-500/20">
          {time.toLocaleTimeString('en-US', {
            hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: true,
          })}
        </div>

        {/* Theme toggle */}
        <button
          onClick={toggleTheme}
          title={theme === 'dark' ? 'Switch to Light' : 'Switch to Dark'}
          className="p-1.5 rounded-lg text-slate-400 dark:text-slate-500
            hover:bg-slate-100 dark:hover:bg-white/[0.06]
            hover:text-slate-600 dark:hover:text-slate-300
            transition-all"
        >
          {theme === 'dark'
            ? <Sun size={15} className="text-amber-400" />
            : <Moon size={15} />
          }
        </button>

        {/* Notification bell */}
        <div className="relative" ref={dropdownRef}>
          <button
            onClick={() => {
              setShowNotifications(prev => !prev);
              if (unreadCount > 0) markRead();
            }}
            className="relative p-1.5 rounded-lg text-slate-400 dark:text-slate-500
              hover:bg-slate-100 dark:hover:bg-white/[0.06]
              hover:text-slate-600 dark:hover:text-slate-300
              transition-all"
            title="Alerts"
          >
            <Bell size={15} />
            {unreadCount > 0 && (
              <>
                <span className="absolute top-1 right-1 h-2 w-2 rounded-full bg-rose-500
                  ring-2 ring-white dark:ring-[#111420] animate-ping" />
                <span className="absolute top-1 right-1 h-2 w-2 rounded-full bg-rose-500
                  ring-2 ring-white dark:ring-[#111420]" />
              </>
            )}
          </button>

          {/* Dropdown */}
          {showNotifications && (
            <div className="absolute right-0 top-[calc(100%+6px)] w-72 z-50
              bg-white dark:bg-[#161a26]
              border border-slate-100 dark:border-white/[0.08]
              rounded-xl shadow-2xl overflow-hidden
              fade-in-up">

              <div className="flex items-center justify-between px-4 py-3
                border-b border-slate-100 dark:border-white/[0.06]">
                <span className="text-[12px] font-bold text-slate-700 dark:text-slate-200">
                  Floor Alerts
                </span>
                {notifications.length > 0 && (
                  <button
                    onClick={clearAll}
                    className="text-[10px] font-semibold text-slate-400
                      hover:text-rose-500 transition-colors"
                  >
                    Clear all
                  </button>
                )}
              </div>

              <div className="max-h-56 overflow-y-auto divide-y divide-slate-50 dark:divide-white/[0.04]">
                {notifications.length === 0 ? (
                  <div className="py-8 text-center text-[12px] text-slate-400 dark:text-slate-600">
                    No active alerts
                  </div>
                ) : (
                  notifications.map(n => (
                    <div
                      key={n.id}
                      className="flex items-start gap-3 px-4 py-3
                        hover:bg-slate-50 dark:hover:bg-white/[0.03] transition-colors"
                    >
                      <div className={`w-1.5 h-1.5 rounded-full mt-1.5 shrink-0
                        ${n.type === 'ready' ? 'bg-blue-500' : 'bg-emerald-500'}`}
                      />
                      <div className="flex-1 min-w-0">
                        <p className="text-[12px] font-medium text-slate-700 dark:text-slate-300 leading-snug">
                          {n.message}
                        </p>
                        <span className="text-[10px] text-slate-400 mt-0.5 block">
                          {new Date(n.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </span>
                      </div>
                      <button
                        onClick={() => clearOne(n.id)}
                        className="text-slate-300 dark:text-slate-700
                          hover:text-slate-500 dark:hover:text-slate-400 transition-colors"
                      >
                        <X size={11} />
                      </button>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </header>
  );
};

export default Navbar;
