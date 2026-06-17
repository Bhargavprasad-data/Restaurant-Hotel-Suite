import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { useNotifications } from '../context/NotificationContext';
import { Sun, Moon, RefreshCw, Bell, X, Activity, CalendarCheck, BedDouble, Users } from 'lucide-react';

const Topbar = ({ title, breadcrumb, onRefresh, refreshing, extraActions }) => {
  const { user } = useAuth();
  const { toggleTheme, isDark } = useTheme();
  const {
    notifications,
    unreadCount,
    markAllRead,
    clearAll,
    clearOne
  } = useNotifications();

  const [showDropdown, setShowDropdown] = useState(false);
  const dropdownRef = useRef(null);

  // Close dropdown on click outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setShowDropdown(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleToggleDropdown = () => {
    setShowDropdown(!showDropdown);
    if (!showDropdown && unreadCount > 0) {
      markAllRead();
    }
  };

  const getNotifIcon = (type) => {
    switch (type) {
      case 'booking':
        return <CalendarCheck size={13} style={{ color: '#ff6b35' }} />;
      case 'room':
        return <BedDouble size={13} style={{ color: '#818cf8' }} />;
      case 'user':
        return <Users size={13} style={{ color: '#4ade80' }} />;
      default:
        return <Activity size={13} style={{ color: 'var(--text-muted)' }} />;
    }
  };

  const getNotifBg = (type) => {
    switch (type) {
      case 'booking':
        return 'rgba(255, 107, 53, 0.06)';
      case 'room':
        return 'rgba(99, 102, 241, 0.06)';
      case 'user':
        return 'rgba(34, 197, 94, 0.06)';
      default:
        return 'rgba(255, 255, 255, 0.02)';
    }
  };

  const getNotifBorder = (type) => {
    switch (type) {
      case 'booking':
        return 'rgba(255, 107, 53, 0.12)';
      case 'room':
        return 'rgba(99, 102, 241, 0.12)';
      case 'user':
        return 'rgba(34, 197, 94, 0.12)';
      default:
        return 'var(--border-subtle)';
    }
  };

  return (
    <div className="admin-topbar">
      <div>
        <div className="topbar-title">{title}</div>
        <div className="topbar-breadcrumb">{breadcrumb}</div>
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        {/* Extra Actions (e.g. Add Room button) */}
        {extraActions && extraActions}

        {/* Live Websocket Indicator */}
        <div style={{
          padding: '5px 12px',
          borderRadius: 8,
          background: 'rgba(34,197,94,0.06)',
          border: '1px solid rgba(34,197,94,0.15)',
          display: 'flex',
          alignItems: 'center',
          gap: 6
        }}>
          <span style={{
            width: 6,
            height: 6,
            background: '#4ade80',
            borderRadius: '50%',
            boxShadow: '0 0 5px #4ade80'
          }} />
          <span style={{ fontSize: 11, fontWeight: 600, color: '#4ade80' }}>Live</span>
        </div>

        {/* Notification Bell Icon */}
        <div ref={dropdownRef} style={{ position: 'relative' }}>
          <button
            onClick={handleToggleDropdown}
            className="btn btn-secondary btn-icon"
            title="Notifications"
            style={{
              position: 'relative',
              borderColor: unreadCount > 0 ? 'var(--accent)' : 'var(--border-subtle)',
              background: unreadCount > 0 ? 'var(--accent-subtle)' : 'var(--bg-surface)',
              color: unreadCount > 0 ? 'var(--accent)' : 'var(--text-secondary)'
            }}
          >
            <Bell size={13} />
            {unreadCount > 0 && (
              <span style={{
                position: 'absolute',
                top: -3,
                right: -3,
                width: 7,
                height: 7,
                borderRadius: '50%',
                background: 'var(--accent)',
                boxShadow: '0 0 4px var(--accent)'
              }} />
            )}
          </button>

          {/* Dropdown Menu */}
          {showDropdown && (
            <div style={{
              position: 'absolute',
              right: 0,
              top: 'calc(100% + 8px)',
              width: 320,
              background: 'var(--bg-card)',
              border: '1px solid var(--border-soft)',
              borderRadius: 14,
              boxShadow: 'var(--shadow-modal)',
              zIndex: 999,
              overflow: 'hidden'
            }}>
              {/* Dropdown Header */}
              <div style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '12px 16px',
                borderBottom: '1px solid var(--border-subtle)',
                background: 'var(--bg-panel)'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <Activity size={13} style={{ color: 'var(--accent)' }} />
                  <span style={{ fontSize: 12.5, fontWeight: 700, color: 'var(--text-primary)' }}>Live Activity</span>
                  {notifications.length > 0 && (
                    <span style={{
                      background: 'var(--accent-subtle)',
                      color: 'var(--accent)',
                      fontSize: 10,
                      fontWeight: 700,
                      padding: '1px 6px',
                      borderRadius: 999
                    }}>
                      {notifications.length}
                    </span>
                  )}
                </div>
                {notifications.length > 0 && (
                  <button
                    onClick={clearAll}
                    style={{
                      fontSize: 11,
                      fontWeight: 600,
                      color: 'var(--accent)',
                      border: 'none',
                      background: 'transparent',
                      cursor: 'pointer'
                    }}
                  >
                    Clear all
                  </button>
                )}
              </div>

              {/* Notification List */}
              <div style={{
                maxHeight: 280,
                overflowY: 'auto',
                padding: 8,
                display: 'flex',
                flexDirection: 'column',
                gap: 6
              }}>
                {notifications.length === 0 ? (
                  <div style={{
                    textAlign: 'center',
                    padding: '24px 16px',
                    color: 'var(--text-muted)',
                    fontSize: 12
                  }}>
                    <Activity size={20} style={{ opacity: 0.3, margin: '0 auto 6px', display: 'block' }} />
                    No recent updates
                  </div>
                ) : (
                  notifications.map((notif) => (
                    <div
                      key={notif.id}
                      style={{
                        display: 'flex',
                        alignItems: 'flex-start',
                        gap: 10,
                        padding: '8px 10px',
                        borderRadius: 8,
                        background: getNotifBg(notif.type),
                        border: `1px solid ${getNotifBorder(notif.type)}`,
                        transition: 'transform 0.15s ease'
                      }}
                    >
                      <div style={{
                        marginTop: 2,
                        padding: 4,
                        borderRadius: 6,
                        background: 'rgba(255, 255, 255, 0.03)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        flexShrink: 0
                      }}>
                        {getNotifIcon(notif.type)}
                      </div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{
                          fontSize: 11.5,
                          fontWeight: notif.read ? 500 : 600,
                          color: 'var(--text-primary)',
                          lineHeight: 1.4
                        }}>
                          {notif.message}
                        </div>
                        <div style={{
                          fontSize: 9.5,
                          color: 'var(--text-muted)',
                          marginTop: 3
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
                          flexShrink: 0
                        }}
                        title="Dismiss"
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

        {/* Theme Toggle Button */}
        <button
          onClick={toggleTheme}
          className="btn btn-secondary btn-icon"
          title={isDark ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
        >
          {isDark ? <Sun size={13} style={{ color: '#fb923c' }} /> : <Moon size={13} style={{ color: '#818cf8' }} />}
        </button>

        {/* Refresh Button */}
        {onRefresh && (
          <button
            onClick={onRefresh}
            className="btn btn-secondary btn-icon"
            disabled={refreshing}
            title="Refresh"
          >
            <RefreshCw size={13} style={{ animation: refreshing ? 'spin 1s linear infinite' : 'none' }} />
          </button>
        )}
      </div>
    </div>
  );
};

export default Topbar;
