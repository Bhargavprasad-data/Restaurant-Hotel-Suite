import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { ThemeProvider } from './context/ThemeContext';
import { SocketProvider } from './context/SocketContext';
import { NotificationProvider } from './context/NotificationContext';
import { Toaster } from 'react-hot-toast';

// Pages
import AdminDashboard from './pages/AdminDashboard';
import ManageRooms from './pages/ManageRooms';
import ManageBookings from './pages/ManageBookings';
import ManageUsers from './pages/ManageUsers';
import Login from './pages/Login';

// Admin-only route guard
const AdminRoute = ({ children }) => {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--bg-primary)' }}>
        <div style={{ width: 32, height: 32, border: '3px solid rgba(255,107,53,0.2)', borderTopColor: '#ff6b35', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
      </div>
    );
  }

  if (!user || user.role !== 'admin') {
    return <Navigate to="/login" replace />;
  }

  return children;
};

function App() {
  return (
    <Router>
      <ThemeProvider>
        <AuthProvider>
          <SocketProvider>
            <NotificationProvider>
              <Toaster
                position="top-right"
                toastOptions={{
                  style: {
                    background: 'var(--bg-card)',
                    color: 'var(--text-primary)',
                    border: '1px solid var(--border-subtle)',
                    fontSize: '13px',
                    fontFamily: 'Inter, sans-serif',
                    borderRadius: '10px',
                  },
                  success: { iconTheme: { primary: '#4ade80', secondary: 'var(--bg-card)' } },
                  error:   { iconTheme: { primary: '#f87171', secondary: 'var(--bg-card)' } },
                }}
              />
              <Routes>
                <Route path="/login" element={<Login />} />
                <Route path="/"         element={<AdminRoute><AdminDashboard /></AdminRoute>} />
                <Route path="/rooms"    element={<AdminRoute><ManageRooms    /></AdminRoute>} />
                <Route path="/bookings" element={<AdminRoute><ManageBookings /></AdminRoute>} />
                <Route path="/users"    element={<AdminRoute><ManageUsers    /></AdminRoute>} />
                <Route path="*"         element={<Navigate to="/" replace />} />
              </Routes>
            </NotificationProvider>
          </SocketProvider>
        </AuthProvider>
      </ThemeProvider>
    </Router>
  );
}

export default App;
