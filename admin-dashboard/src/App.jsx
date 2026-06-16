import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { ThemeProvider } from './context/ThemeContext';
import { SocketProvider } from './context/SocketContext';
import { Toaster } from 'react-hot-toast';
import ProtectedRoute from './components/ProtectedRoute';
import Sidebar from './components/Sidebar';
import Navbar from './components/Navbar';

// Page Imports
import Login from './pages/Login';
import AdminDashboard from './pages/AdminDashboard';
import TableManagement from './pages/TableManagement';
import MenuManagement from './pages/MenuManagement';
import StaffManagement from './pages/StaffManagement';

const DashboardLayout = ({ children }) => {
  return (
    <div className="app-container">
      <Sidebar />
      <div className="main-wrapper">
        <Navbar />
        <main className="scroll-area">
          {children}
        </main>
      </div>
    </div>
  );
};

const App = () => {
  return (
    <AuthProvider>
      <ThemeProvider>
        <SocketProvider>
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
          <Router>
            <Routes>
              {/* Public Routes */}
              <Route path="/login" element={<Login />} />

              {/* Protected Admin Console Operations */}
              <Route 
                path="/" 
                element={
                  <ProtectedRoute>
                    <DashboardLayout>
                      <AdminDashboard />
                    </DashboardLayout>
                  </ProtectedRoute>
                } 
              />
              <Route 
                path="/tables" 
                element={
                  <ProtectedRoute>
                    <DashboardLayout>
                      <TableManagement />
                    </DashboardLayout>
                  </ProtectedRoute>
                } 
              />
              <Route 
                path="/menu" 
                element={
                  <ProtectedRoute>
                    <DashboardLayout>
                      <MenuManagement />
                    </DashboardLayout>
                  </ProtectedRoute>
                } 
              />
              <Route 
                path="/staff" 
                element={
                  <ProtectedRoute>
                    <DashboardLayout>
                      <StaffManagement />
                    </DashboardLayout>
                  </ProtectedRoute>
                } 
              />

              {/* Fallback */}
              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          </Router>
        </SocketProvider>
      </ThemeProvider>
    </AuthProvider>
  );
};

export default App;
