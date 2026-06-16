import React, { createContext, useContext, useEffect, useState } from 'react';
import { io } from 'socket.io-client';
import { useAuth } from './AuthContext';
import { useLocation } from 'react-router-dom';
import Sidebar from '../components/Sidebar';
import { useTheme } from './ThemeContext';
import { Sun, Moon } from 'lucide-react';

const SocketContext = createContext(null);

export const useSocket = () => useContext(SocketContext);

export const SocketProvider = ({ children }) => {
  const [socket, setSocket] = useState(null);
  const [connected, setConnected] = useState(false);

  useEffect(() => {
    const socketUrl = import.meta.env.VITE_BACKEND_URL || 'http://localhost:5000';
    const socketInstance = io(socketUrl, {
      withCredentials: true,
      transports: ['websocket', 'polling'],
      reconnection: true,
      reconnectionAttempts: Infinity,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 3000,
      timeout: 10000
    });

    socketInstance.on('connect', () => {
      console.log('⚡ Connected to socket server:', socketInstance.id);
      socketInstance.emit('join-room', 'hotel');
      setConnected(true);
    });

    socketInstance.on('disconnect', () => {
      console.log('🔌 Disconnected from socket server');
      setConnected(false);
    });

    socketInstance.on('connect_error', () => {
      setConnected(false);
    });

    setSocket(socketInstance);

    return () => {
      socketInstance.disconnect();
    };
  }, []);

  const auth = useAuth();
  const location = useLocation();
  const { toggleTheme, isDark } = useTheme();
  const user = auth?.user;
  const isLoginPage = location.pathname === '/login';

  if (!connected && user && !isLoginPage) {
    return (
      <div style={{
        minHeight: '100vh',
        width: '100%',
        display: 'flex',
        background: 'var(--bg-primary)',
        color: 'var(--text-primary)',
        fontFamily: 'Inter, sans-serif',
        position: 'relative',
        overflow: 'hidden'
      }}>
        <Sidebar />

        {/* Main Content Mockup */}
        <div className="admin-main" style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
          {/* Topbar Mockup */}
          <div className="admin-topbar" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 24px', height: 58, borderBottom: '1px solid var(--border-subtle)' }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
              <div style={{ fontSize: '15px', fontWeight: 700, color: 'var(--text-primary)' }}>Connecting...</div>
              <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Establishing real-time connection to server</div>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <button
                onClick={toggleTheme}
                className="btn btn-secondary btn-icon"
                title={isDark ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
              >
                {isDark ? <Sun size={13} style={{ color: '#fb923c' }} /> : <Moon size={13} style={{ color: '#818cf8' }} />}
              </button>
              
              <div style={{ padding: '5px 12px', borderRadius: 8, background: 'rgba(251,146,60,0.08)', border: '1px solid rgba(251,146,60,0.18)', display: 'flex', alignItems: 'center', gap: 6 }}>
                <span className="animate-pulse" style={{ width: 6, height: 6, background: '#fb923c', borderRadius: '50%', boxShadow: '0 0 5px #fb923c' }} />
                <span style={{ fontSize: 11, fontWeight: 600, color: '#fb923c' }}>Connecting</span>
              </div>
            </div>
          </div>

          {/* Page contents Mockup */}
          <div className="admin-content" style={{ padding: 24, display: 'flex', flexDirection: 'column', gap: 20 }}>
            {/* KPI Cards Grid */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px,1fr))', gap: 14 }}>
              {[1, 2, 3, 4].map(i => (
                <div key={i} className="skeleton" style={{ height: 88, borderRadius: 10 }} />
              ))}
            </div>

            {/* Giant Panel Mockup */}
            <div className="panel-card" style={{ flex: 1, padding: 20, display: 'flex', flexDirection: 'column', gap: 12 }}>
              <div className="skeleton" style={{ width: 180, height: 18, borderRadius: 4, marginBottom: 8 }} />
              {[1, 2, 3, 4, 5].map(i => (
                <div key={i} className="skeleton" style={{ height: 42, borderRadius: 8 }} />
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <SocketContext.Provider value={socket}>
      {children}
    </SocketContext.Provider>
  );
};
