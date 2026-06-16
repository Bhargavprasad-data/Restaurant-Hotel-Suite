import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { ThemeProvider } from './context/ThemeContext';
import { SocketProvider } from './context/SocketContext';
import ProtectedRoute from './components/ProtectedRoute';
import Sidebar from './components/Sidebar';
import Navbar from './components/Navbar';

// Page Imports
import Login from './pages/Login';
import Signup from './pages/Signup';
import KitchenBoard from './pages/KitchenBoard';
import Attendance from './pages/Attendance';
import { Toaster } from 'react-hot-toast';

const DashboardLayout = ({ children }) => {
  return (
    <div
      className="flex h-screen w-screen overflow-hidden transition-colors duration-300"
      style={{ backgroundColor: 'var(--bg-base)', color: 'var(--text-primary)' }}
    >
      <Sidebar />
      <div className="flex-1 flex flex-col overflow-hidden">
        <Navbar />
        <main
          className="flex-1 overflow-y-auto transition-colors duration-300"
          style={{ backgroundColor: 'var(--bg-base)' }}
        >
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
          <Router>
            <Routes>
              {/* Public Routes */}
              <Route path="/login"  element={<Login />}  />
              <Route path="/signup" element={<Signup />} />

              {/* Protected Kitchen Dashboard Operations */}
              <Route
                path="/"
                element={
                  <ProtectedRoute>
                    <DashboardLayout>
                      <KitchenBoard />
                    </DashboardLayout>
                  </ProtectedRoute>
                }
              />
              <Route
                path="/attendance"
                element={
                  <ProtectedRoute>
                    <DashboardLayout>
                      <Attendance />
                    </DashboardLayout>
                  </ProtectedRoute>
                }
              />

                <Route path="*" element={<Navigate to="/" replace />} />
              </Routes>
            </Router>
            <Toaster 
              position="top-right" 
              toastOptions={{
                duration: 4000,
                style: {
                  background: 'var(--bg-secondary)',
                  color: 'var(--text-primary)',
                  border: '1px solid var(--border-color)'
                }
              }} 
            />
          </SocketProvider>
        </ThemeProvider>
    </AuthProvider>
  );
};

export default App;
