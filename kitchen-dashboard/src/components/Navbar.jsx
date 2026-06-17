import React, { useState, useEffect, useRef } from 'react';
import { useTheme } from '../context/ThemeContext';
import { useAuth } from '../context/AuthContext';
import { useSocket } from '../context/SocketContext';
import { Sun, Moon, Clock as ClockIcon, Menu, Bell, X } from 'lucide-react';

const Navbar = () => {
  const { theme, toggleTheme } = useTheme();
  const { user } = useAuth();
  const socket = useSocket();
  const [time, setTime] = useState(new Date());
  const [notifications, setNotifications] = useState([]);
  const [showNotifications, setShowNotifications] = useState(false);
  const dropdownRef = useRef(null);

  useEffect(() => {
    const timer = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  // Socket notifications listener
  useEffect(() => {
    if (!socket) return;
    const handler = (notif) => {
      setNotifications(prev => [{ ...notif, timestamp: new Date(), read: false }, ...prev].slice(0, 25));
      try {
        const audio = new Audio('https://assets.mixkit.co/active_storage/sfx/2869/2869-84.wav');
        audio.volume = 0.3;
        audio.play().catch(() => {});
      } catch { /* browser blocked audio */ }
    };
    socket.on('notification', handler);
    return () => socket.off('notification', handler);
  }, [socket]);

  // Click outside listener for notifications dropdown
  useEffect(() => {
    const handler = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setShowNotifications(false);
      }
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
      className="shrink-0 flex items-center justify-between px-5 border-b select-none z-10"
      style={{
        height: 'var(--topbar-h)',
        background: 'var(--bg-surface)',
        borderColor: 'var(--border)',
      }}
    >
      {/* ── Left: mobile toggle + breadcrumb ── */}
      <div className="flex items-center gap-3">
        <button
          onClick={() => window.dispatchEvent(new CustomEvent('toggle-mobile-sidebar'))}
          className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 hover:bg-slate-100 dark:hover:bg-white/[0.06] transition-all sm:hidden cursor-pointer"
          title="Toggle Navigation"
        >
          <Menu size={18} />
        </button>

        {/* Breadcrumb */}
        <div className="flex items-center gap-2">
          <span
            className="text-[11px] font-semibold uppercase tracking-[0.12em]"
            style={{ color: 'var(--text-muted)' }}
          >
            Kitchen Operations
          </span>
        </div>
      </div>

      {/* ── Right: clock, theme, avatar ── */}
      <div className="flex items-center gap-2">

        {/* Live clock */}
        <div
          className="hidden sm:flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[11px] font-semibold tabular-nums"
          style={{
            background: 'rgba(245, 158, 11, 0.1)',
            color: '#f59e0b',
            border: '1px solid rgba(245, 158, 11, 0.2)',
          }}
        >
          <ClockIcon size={11} />
          <span>
            {time.toLocaleTimeString('en-US', {
              hour: '2-digit',
              minute: '2-digit',
              second: '2-digit',
              hour12: true,
            })}
          </span>
        </div>

        {/* Theme toggle */}
        <button
          onClick={toggleTheme}
          className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 hover:bg-slate-100 dark:hover:bg-white/[0.06] transition-all cursor-pointer"
          title="Toggle theme"
        >
          {theme === 'dark'
            ? <Sun size={16} className="text-amber-400" />
            : <Moon size={16} />
          }
        </button>

        {/* Notification bell */}
        <div className="relative flex items-center" ref={dropdownRef}>
          <button
            onClick={() => {
              setShowNotifications(prev => !prev);
              if (unreadCount > 0) markRead();
            }}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 hover:bg-slate-100 dark:hover:bg-white/[0.06] transition-all cursor-pointer relative"
            title="Alerts"
          >
            <Bell size={16} />
            {unreadCount > 0 && (
              <>
                <span className="absolute top-1.5 right-1.5 h-2 w-2 rounded-full bg-rose-500 ring-2 ring-white dark:ring-slate-900 animate-ping" />
                <span className="absolute top-1.5 right-1.5 h-2 w-2 rounded-full bg-rose-500 ring-2 ring-white dark:ring-slate-900" />
              </>
            )}
          </button>

          {/* Dropdown */}
          {showNotifications && (
            <div
              className="absolute right-0 top-[calc(100%+8px)] w-72 z-50 rounded-xl shadow-2xl border overflow-hidden animate-fade-in-up animate-duration-150"
              style={{
                background: 'var(--bg-surface)',
                borderColor: 'var(--border)',
              }}
            >
              <div
                className="flex items-center justify-between px-4 py-3 border-b"
                style={{ borderColor: 'var(--border)' }}
              >
                <span className="text-[12px] font-bold" style={{ color: 'var(--text-primary)' }}>
                  Kitchen Alerts
                </span>
                {notifications.length > 0 && (
                  <button
                    onClick={clearAll}
                    className="text-[10px] font-semibold text-slate-400 hover:text-rose-500 transition-colors cursor-pointer"
                  >
                    Clear all
                  </button>
                )}
              </div>

              <div
                className="max-h-56 overflow-y-auto divide-y"
                style={{ borderColor: 'var(--border)' }}
              >
                {notifications.length === 0 ? (
                  <div className="py-8 text-center text-[12px]" style={{ color: 'var(--text-muted)' }}>
                    No active alerts
                  </div>
                ) : (
                  notifications.map(n => (
                    <div
                      key={n.id}
                      className="flex items-start gap-3 px-4 py-3 hover:bg-slate-100/30 dark:hover:bg-white/[0.02] transition-colors"
                    >
                      <div className={`w-1.5 h-1.5 rounded-full mt-1.5 shrink-0 ${
                        n.type === 'new-order' ? 'bg-rose-500' : n.type === 'ready' ? 'bg-blue-500' : 'bg-emerald-500'
                      }`} />
                      <div className="flex-1 min-w-0">
                        <p className="text-[12px] font-semibold leading-snug text-left" style={{ color: 'var(--text-secondary)' }}>
                          {n.message}
                        </p>
                        <span className="text-[10px] mt-0.5 block text-left" style={{ color: 'var(--text-muted)' }}>
                          {new Date(n.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </span>
                      </div>
                      <button
                        onClick={() => clearOne(n.id)}
                        className="hover:text-rose-500 transition-colors cursor-pointer"
                        style={{ color: 'var(--text-muted)' }}
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
