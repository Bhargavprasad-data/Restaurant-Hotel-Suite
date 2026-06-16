import React, { useState, useEffect, useRef } from 'react';
import { useTheme } from '../context/ThemeContext';
import { useSocket } from '../context/SocketContext';
import { useAuth } from '../context/AuthContext';
import { useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Sun, Moon, Bell, X, Activity, ChevronRight, Wifi, WifiOff } from 'lucide-react';

const PAGE_TITLES = {
  '/': 'Overview',
  '/tables': 'Tables',
  '/menu': 'Menu',
  '/staff': 'Staff',
};

const Navbar = () => {
  const { theme, toggleTheme } = useTheme();
  const { user } = useAuth();
  const socket = useSocket();
  const location = useLocation();
  const [notifications, setNotifications] = useState([]);
  const [showNotifications, setShowNotifications] = useState(false);
  const [time, setTime] = useState(new Date());
  const [isOnline, setIsOnline] = useState(!!socket);
  const dropdownRef = useRef(null);

  const currentPage = PAGE_TITLES[location.pathname] || 'Dashboard';

  // Live clock
  useEffect(() => {
    const timer = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    setIsOnline(!!socket);
  }, [socket]);

  // Socket notifications
  useEffect(() => {
    if (!socket) return;

    const addNotification = (message, type) => {
      setNotifications(prev => [
        {
          id: Date.now() + Math.random().toString(36).slice(2),
          message,
          type,
          timestamp: new Date(),
          read: false,
        },
        ...prev.slice(0, 24),
      ]);

      try {
        const audio = new Audio('https://assets.mixkit.co/active_storage/sfx/2869/2869-84.wav');
        audio.volume = 0.2;
        audio.play().catch(() => {});
      } catch (_) {}
    };

    const onTableUpdate = data => {
      addNotification(
        `Table ${data.table?.table_number || data.table_number || data.id} → ${(data.table?.status || data.status || 'updated').toUpperCase()}`,
        'table'
      );
    };

    const onOrderUpdate = data => {
      addNotification(
        `Order for Table ${data.table_number || data.table_id} → ${(data.status || 'updated').toUpperCase()}`,
        'order'
      );
    };

    const onPayment = data => {
      addNotification(
        `💰 Payment received — Table ${data.table_number || data.table_id} (₹${data.amount || data.grand_total})`,
        'payment'
      );
    };

    const onNotification = data => {
      if (data.type === 'paid') return; // payment-success handles this distinctly
      addNotification(data.message, data.type || 'alert');
    };

    socket.on('table-update', onTableUpdate);
    socket.on('order-update', onOrderUpdate);
    socket.on('payment-success', onPayment);
    socket.on('notification', onNotification);

    return () => {
      socket.off('table-update', onTableUpdate);
      socket.off('order-update', onOrderUpdate);
      socket.off('payment-success', onPayment);
      socket.off('notification', onNotification);
    };
  }, [socket]);

  // Click outside to close dropdown
  useEffect(() => {
    const handler = e => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setShowNotifications(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const unread = notifications.filter(n => !n.read).length;

  const markAllRead = () => setNotifications(p => p.map(n => ({ ...n, read: true })));
  const clearOne = id => setNotifications(p => p.filter(n => n.id !== id));
  const clearAll = () => setNotifications([]);

  const typeIcon = type => {
    if (type === 'payment' || type === 'paid') return '💳';
    if (type === 'order' || type === 'ready') return '🍽️';
    return '🪑';
  };

  return (
    <header style={{
      height: 60,
      background: 'var(--bg-surface)',
      borderBottom: '1px solid var(--border)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      padding: '0 1.5rem',
      zIndex: 50,
      flexShrink: 0,
      boxShadow: 'var(--shadow-xs)',
      transition: 'background-color 0.3s ease, border-color 0.3s ease',
    }}>

      {/* ── Left: Breadcrumb ── */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
        <span style={{
          fontSize: '0.72rem',
          fontWeight: 500,
          color: 'var(--text-muted)',
          letterSpacing: '0.01em',
        }}>
          Admin
        </span>
        <ChevronRight size={12} style={{ color: 'var(--text-muted)', opacity: 0.4 }} />
        <span style={{
          fontSize: '0.82rem',
          fontWeight: 700,
          color: 'var(--text-primary)',
          fontFamily: "'Plus Jakarta Sans', sans-serif",
        }}>
          {currentPage}
        </span>
      </div>

      {/* ── Right: Actions ── */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.625rem' }}>

        {/* Connection status */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '0.35rem',
          padding: '0.3rem 0.65rem',
          borderRadius: 999,
          background: isOnline ? 'var(--success-bg)' : 'var(--danger-bg)',
          border: `1px solid ${isOnline ? 'var(--success-border)' : 'var(--danger-border)'}`,
          fontSize: '0.67rem',
          fontWeight: 700,
          color: isOnline ? 'var(--success)' : 'var(--danger)',
          textTransform: 'uppercase',
          letterSpacing: '0.05em',
        }}>
          <div style={{
            width: 5,
            height: 5,
            borderRadius: '50%',
            background: isOnline ? 'var(--success)' : 'var(--danger)',
            boxShadow: isOnline ? '0 0 6px var(--success)' : 'none',
          }} />
          {isOnline ? 'Live' : 'Offline'}
        </div>

        {/* Clock */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '0.4rem',
          padding: '0.35rem 0.75rem',
          borderRadius: 999,
          background: 'var(--info-bg)',
          border: '1px solid var(--info-border)',
          fontSize: '0.72rem',
          fontWeight: 700,
          color: 'var(--info)',
          fontVariantNumeric: 'tabular-nums',
          transition: 'background-color 0.3s ease',
          whiteSpace: 'nowrap',
          letterSpacing: '0.02em',
        }}>
          {time.toLocaleTimeString('en-US', {
            hour: '2-digit',
            minute: '2-digit',
            second: '2-digit',
            hour12: true,
          })}
        </div>

        {/* Theme toggle */}
        <motion.button
          onClick={toggleTheme}
          whileHover={{ scale: 1.06 }}
          whileTap={{ scale: 0.94 }}
          aria-label="Toggle theme"
          style={{
            width: 34,
            height: 34,
            borderRadius: 8,
            border: '1px solid var(--border)',
            background: 'var(--bg-surface)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: 'var(--text-muted)',
            cursor: 'pointer',
            transition: 'all 0.18s ease',
          }}
          onMouseEnter={e => {
            e.currentTarget.style.borderColor = 'var(--brand)';
            e.currentTarget.style.color = 'var(--brand)';
            e.currentTarget.style.background = 'var(--brand-light)';
          }}
          onMouseLeave={e => {
            e.currentTarget.style.borderColor = 'var(--border)';
            e.currentTarget.style.color = 'var(--text-muted)';
            e.currentTarget.style.background = 'var(--bg-surface)';
          }}
        >
          {theme === 'dark'
            ? <Sun size={15} style={{ color: '#f59e0b' }} />
            : <Moon size={15} />
          }
        </motion.button>

        {/* Notification Bell */}
        <div className="notify-bell-container" ref={dropdownRef}>
          <motion.button
            onClick={() => {
              setShowNotifications(v => !v);
              if (unread > 0) markAllRead();
            }}
            whileHover={{ scale: 1.06 }}
            whileTap={{ scale: 0.94 }}
            aria-label="Notifications"
            style={{
              width: 34,
              height: 34,
              borderRadius: 8,
              border: `1px solid ${unread > 0 ? 'var(--brand)' : 'var(--border)'}`,
              background: unread > 0 ? 'var(--brand-light)' : 'var(--bg-surface)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: unread > 0 ? 'var(--brand)' : 'var(--text-muted)',
              cursor: 'pointer',
              position: 'relative',
              transition: 'all 0.18s ease',
            }}
          >
            <Bell size={15} />
            <AnimatePresence>
              {unread > 0 && (
                <motion.span
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  exit={{ scale: 0 }}
                  style={{
                    position: 'absolute',
                    top: -4,
                    right: -4,
                    background: 'var(--brand)',
                    color: '#fff',
                    fontSize: '0.5rem',
                    fontWeight: 800,
                    width: 16,
                    height: 16,
                    borderRadius: '50%',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    border: '2px solid var(--bg-surface)',
                  }}
                >
                  {unread > 9 ? '9+' : unread}
                </motion.span>
              )}
            </AnimatePresence>
          </motion.button>

          {/* Dropdown */}
          <AnimatePresence>
            {showNotifications && (
              <motion.div
                initial={{ opacity: 0, y: 8, scale: 0.97 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: 8, scale: 0.97 }}
                transition={{ duration: 0.15 }}
                style={{
                  position: 'absolute',
                  right: 0,
                  top: 'calc(100% + 8px)',
                  width: 320,
                  background: 'var(--bg-surface)',
                  border: '1px solid var(--border)',
                  borderRadius: 14,
                  boxShadow: 'var(--shadow-xl)',
                  zIndex: 200,
                  overflow: 'hidden',
                }}
              >
                {/* Header */}
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '0.875rem 1.1rem 0.625rem',
                  borderBottom: '1px solid var(--border)',
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <Activity size={13} style={{ color: 'var(--brand)' }} />
                    <span style={{
                      fontFamily: "'Plus Jakarta Sans', sans-serif",
                      fontSize: '0.82rem',
                      fontWeight: 700,
                      color: 'var(--text-primary)',
                    }}>
                      Live Activity
                    </span>
                    {notifications.length > 0 && (
                      <span style={{
                        background: 'var(--brand-light)',
                        color: 'var(--brand)',
                        fontSize: '0.6rem',
                        fontWeight: 700,
                        padding: '0.1rem 0.4rem',
                        borderRadius: 999,
                      }}>
                        {notifications.length}
                      </span>
                    )}
                  </div>
                  {notifications.length > 0 && (
                    <button
                      onClick={clearAll}
                      style={{
                        fontSize: '0.68rem',
                        fontWeight: 600,
                        color: 'var(--brand)',
                        border: 'none',
                        background: 'transparent',
                        cursor: 'pointer',
                        fontFamily: "'Inter', sans-serif",
                      }}
                    >
                      Clear all
                    </button>
                  )}
                </div>

                {/* List */}
                <div style={{
                  maxHeight: 300,
                  overflowY: 'auto',
                  padding: '0.5rem',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 3,
                }}>
                  {notifications.length === 0 ? (
                    <div style={{
                      textAlign: 'center',
                      padding: '2rem 1rem',
                      color: 'var(--text-muted)',
                      fontSize: '0.78rem',
                    }}>
                      <Activity size={28} style={{ opacity: 0.3, margin: '0 auto 0.75rem', display: 'block' }} />
                      No recent activity
                    </div>
                  ) : (
                    notifications.map(notif => (
                      <motion.div
                        key={notif.id}
                        initial={{ opacity: 0, x: 8 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: -8 }}
                        style={{
                          display: 'flex',
                          alignItems: 'flex-start',
                          gap: '0.625rem',
                          padding: '0.625rem 0.75rem',
                          borderRadius: 8,
                          background: notif.type === 'payment' ? 'var(--success-bg)' : notif.type === 'order' ? 'var(--info-bg)' : 'var(--warning-bg)',
                          border: `1px solid ${notif.type === 'payment' ? 'var(--success-border)' : notif.type === 'order' ? 'var(--info-border)' : 'var(--warning-border)'}`,
                        }}
                      >
                        <span style={{ fontSize: '0.85rem', flexShrink: 0, lineHeight: 1 }}>
                          {typeIcon(notif.type)}
                        </span>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{
                            fontSize: '0.72rem',
                            fontWeight: 600,
                            color: 'var(--text-secondary)',
                            lineHeight: 1.4,
                          }}>
                            {notif.message}
                          </div>
                          <div style={{
                            fontSize: '0.62rem',
                            color: 'var(--text-muted)',
                            marginTop: 2,
                          }}>
                            {new Date(notif.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                          </div>
                        </div>
                        <button
                          onClick={() => clearOne(notif.id)}
                          style={{
                            border: 'none',
                            background: 'transparent',
                            color: 'var(--text-muted)',
                            cursor: 'pointer',
                            padding: 2,
                            borderRadius: 4,
                            display: 'flex',
                            flexShrink: 0,
                          }}
                        >
                          <X size={11} />
                        </button>
                      </motion.div>
                    ))
                  )}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* User Profile Chip */}
        {user && (
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '0.55rem',
            padding: '0.3rem 0.75rem 0.3rem 0.35rem',
            borderRadius: 999,
            border: '1px solid var(--border)',
            background: 'var(--bg-app)',
            cursor: 'default',
            userSelect: 'none',
            transition: 'all 0.18s ease',
          }}
            onMouseEnter={e => {
              e.currentTarget.style.borderColor = 'var(--brand)';
              e.currentTarget.style.background = 'var(--brand-light)';
            }}
            onMouseLeave={e => {
              e.currentTarget.style.borderColor = 'var(--border)';
              e.currentTarget.style.background = 'var(--bg-app)';
            }}
          >
            <div style={{
              width: 26,
              height: 26,
              borderRadius: '50%',
              background: 'linear-gradient(135deg, #ef4444, #f97316)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontWeight: 800,
              fontSize: '0.7rem',
              color: '#fff',
              flexShrink: 0,
              boxShadow: '0 2px 6px rgba(239,68,68,0.3)',
            }}>
              {user.name?.charAt(0)?.toUpperCase()}
            </div>
            <div style={{ display: 'flex', flexDirection: 'column' }}>
              <span style={{
                fontSize: '0.72rem',
                fontWeight: 700,
                color: 'var(--text-primary)',
                lineHeight: 1.2,
                whiteSpace: 'nowrap',
              }}>
                {user.name?.split(' ')[0]}
              </span>
              <span style={{
                fontSize: '0.58rem',
                fontWeight: 600,
                color: 'var(--brand)',
                textTransform: 'uppercase',
                letterSpacing: '0.05em',
              }}>
                Admin
              </span>
            </div>
          </div>
        )}
      </div>
    </header>
  );
};

export default Navbar;
