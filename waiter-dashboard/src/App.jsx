import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { ThemeProvider } from './context/ThemeContext';
import { SocketProvider } from './context/SocketContext';
import { Toaster } from 'react-hot-toast';
import Sidebar from './components/Sidebar';
import ProtectedRoute from './components/ProtectedRoute';
import Navbar from './components/Navbar';

// Page imports
import Login from './pages/Login';
import FloorGrid from './pages/FloorGrid';
import OrderEntry from './pages/OrderEntry';
import WaiterOrders from './pages/WaiterOrders';
import Attendance from './pages/Attendance';
import SimulatedCheckout from './pages/SimulatedCheckout';

/**
 * Dashboard layout shell.
 * Sidebar is position:fixed — a 60px spacer div reserves the left rail space.
 * The sidebar expands on hover (220px) as an overlay on top of content.
 */
const DashboardLayout = ({ children }) => (
  <div className="flex h-screen w-screen overflow-hidden bg-[var(--bg-base)] text-[var(--text-primary)] transition-colors duration-300">
    <Sidebar />
    <div className="flex-1 flex flex-col overflow-hidden min-w-0">
      <Navbar />
      <main className="flex-1 overflow-y-auto">
        {children}
      </main>
    </div>
  </div>
);

const W = ({ children }) => (
  <ProtectedRoute>
    <DashboardLayout>{children}</DashboardLayout>
  </ProtectedRoute>
);

const App = () => (
  <AuthProvider>
    <ThemeProvider>
      <SocketProvider>
        <Router>
          <Toaster 
            position="top-right" 
            toastOptions={{
              style: {
                background: 'var(--bg-secondary)',
                color: 'var(--text-primary)',
                border: '1px solid var(--border-color)',
                fontFamily: 'var(--font-body)',
                fontSize: '0.875rem',
                borderRadius: 'var(--radius-md)',
              }
            }}
          />
          <Routes>
            {/* Public */}
            <Route path="/login" element={<Login />} />
            <Route path="/checkout/simulated" element={<SimulatedCheckout />} />

            {/* Protected */}
            <Route path="/"                    element={<W><FloorGrid /></W>} />
            <Route path="/order-menu/:table_id" element={<W><OrderEntry /></W>} />
            <Route path="/orders"              element={<W><WaiterOrders /></W>} />
            <Route path="/attendance"          element={<W><Attendance /></W>} />

            {/* Fallback */}
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </Router>
      </SocketProvider>
    </ThemeProvider>
  </AuthProvider>
);

export default App;
