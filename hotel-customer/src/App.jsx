import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { ThemeProvider } from './context/ThemeContext';
import { SocketProvider } from './context/SocketContext';
import { Toaster } from 'react-hot-toast';

// Pages
import Home          from './pages/Home';
import Login         from './pages/Login';
import Signup        from './pages/Signup';
import VerifyOtp     from './pages/VerifyOtp';
import ForgotPassword from './pages/ForgotPassword';
import RoomListing   from './pages/RoomListing';
import RoomDetails   from './pages/RoomDetails';
import Booking       from './pages/Booking';
import MyBookings    from './pages/MyBookings';
import Profile       from './pages/Profile';

/* ─── Loading Screen with shimmer skeleton ─── */
const LoadingScreen = () => (
  <div className="min-h-screen bg-[#f7f7f7] dark:bg-slate-950 flex flex-col transition-colors duration-300">
    {/* Fake navbar skeleton */}
    <div className="h-[70px] bg-white dark:bg-slate-900 border-b border-slate-100 dark:border-slate-800 flex items-center px-6 gap-4">
      <div className="skeleton w-9 h-9 rounded-xl" />
      <div className="skeleton w-28 h-4 rounded" />
      <div className="flex-1" />
      <div className="skeleton w-20 h-8 rounded-xl" />
      <div className="skeleton w-24 h-8 rounded-xl" />
    </div>
    {/* Fake hero skeleton */}
    <div className="skeleton flex-1 rounded-none m-0" style={{ minHeight: '92vh' }} />
  </div>
);

/* ─── Protected Route Wrapper ─── */
const ProtectedRoute = ({ children }) => {
  const { user, loading } = useAuth();
  if (loading) return <LoadingScreen />;
  if (!user) return <Navigate to="/login" replace />;
  return children;
};

function App() {
  return (
    <Router>
      <ThemeProvider>
        <AuthProvider>
          <SocketProvider>
            <Toaster
              position="top-right"
              toastOptions={{
                duration: 4000,
                style: {
                  fontFamily: 'Inter, sans-serif',
                  fontSize: '14px',
                  fontWeight: '500',
                  borderRadius: '14px',
                  padding: '12px 16px',
                  boxShadow: '0 8px 30px rgba(0,0,0,0.12)',
                },
                success: {
                  iconTheme: { primary: '#22c55e', secondary: '#fff' },
                },
                error: {
                  iconTheme: { primary: '#FF385C', secondary: '#fff' },
                },
              }}
            />
            <Routes>
              {/* Public */}
              <Route path="/"                element={<Home />} />
              <Route path="/login"           element={<Login />} />
              <Route path="/signup"          element={<Signup />} />
              <Route path="/verify-otp"      element={<VerifyOtp />} />
              <Route path="/forgot-password" element={<ForgotPassword />} />
              <Route path="/rooms"           element={<RoomListing />} />
              <Route path="/rooms/:id"       element={<RoomDetails />} />

              {/* Protected */}
              <Route path="/booking"     element={<ProtectedRoute><Booking /></ProtectedRoute>} />
              <Route path="/my-bookings" element={<ProtectedRoute><MyBookings /></ProtectedRoute>} />
              <Route path="/profile"     element={<ProtectedRoute><Profile /></ProtectedRoute>} />

              {/* Fallback */}
              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          </SocketProvider>
        </AuthProvider>
      </ThemeProvider>
    </Router>
  );
}

export default App;
