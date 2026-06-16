import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const ProtectedRoute = ({ children }) => {
  const { user, loading } = useAuth();
  const location = useLocation();

  if (loading) {
    return (
      <div
        className="flex h-screen w-screen overflow-hidden"
        style={{ background: 'var(--bg-base)' }}
      >
        {/* Sidebar rail skeleton */}
        <div
          className="shrink-0 border-r flex flex-col items-center pt-5 gap-4 p-3"
          style={{ width: '60px', background: '#0d1117', borderColor: 'rgba(255,255,255,0.07)' }}
        >
          <div className="shimmer-skeleton h-7 w-7 rounded-lg" />
          <div className="shimmer-skeleton h-7 w-7 rounded-lg mt-4" />
          <div className="shimmer-skeleton h-7 w-7 rounded-lg" />
        </div>

        {/* Main content skeleton */}
        <div className="flex-1 flex flex-col overflow-hidden">
          {/* Navbar skeleton */}
          <div
            className="shrink-0 flex items-center justify-between px-5 border-b"
            style={{ height: '52px', background: 'var(--bg-surface)', borderColor: 'var(--border)' }}
          >
            <div className="shimmer-skeleton h-4 w-32 rounded" />
            <div className="flex gap-2">
              <div className="shimmer-skeleton h-7 w-20 rounded-lg" />
              <div className="shimmer-skeleton h-7 w-7 rounded-full" />
            </div>
          </div>

          {/* Page skeleton */}
          <div className="flex-1 p-6 space-y-6 animate-pulse-slow">
            <div className="flex items-center justify-between">
              <div className="space-y-1.5">
                <div className="shimmer-skeleton h-7 w-48 rounded-lg" />
                <div className="shimmer-skeleton h-3 w-32 rounded" />
              </div>
              <div className="shimmer-skeleton h-8 w-36 rounded-lg" />
            </div>
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
              {[1, 2, 3].map(i => (
                <div key={i} className="surface-card p-4 space-y-3">
                  <div className="shimmer-skeleton h-5 w-32 rounded" />
                  <div className="shimmer-skeleton h-24 w-full rounded-lg" />
                  <div className="shimmer-skeleton h-24 w-full rounded-lg" />
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  return children;
};

export default ProtectedRoute;
