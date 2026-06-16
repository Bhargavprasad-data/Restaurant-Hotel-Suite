import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const ProtectedRoute = ({ children }) => {
  const { user, loading } = useAuth();
  const location = useLocation();

  if (loading) {
    return (
      <div className="flex h-screen w-screen overflow-hidden bg-slate-50 dark:bg-[#0d0f18]">
        <div className="w-[60px] h-full shrink-0 border-r border-slate-200 dark:border-white/[0.05] p-3 flex flex-col gap-4 items-center pt-5">
          <div className="shimmer-skeleton h-8 w-8 rounded-lg" />
          <div className="shimmer-skeleton h-8 w-8 rounded-lg mt-4" />
          <div className="shimmer-skeleton h-8 w-8 rounded-lg" />
          <div className="shimmer-skeleton h-8 w-8 rounded-lg" />
        </div>
        
        <div className="flex-1 flex flex-col p-6 space-y-6 animate-pulse-slow">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="space-y-1.5">
              <div className="shimmer-skeleton h-7 w-48 rounded-lg" />
              <div className="shimmer-skeleton h-3.5 w-32 rounded" />
            </div>
            <div className="flex gap-2">
              <div className="shimmer-skeleton h-8 w-24 rounded-xl" />
              <div className="shimmer-skeleton h-8 w-24 rounded-xl" />
            </div>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {[1, 2, 3, 4].map(i => <div key={i} className="shimmer-skeleton h-24 w-full rounded-2xl" />)}
          </div>
          <div className="shimmer-skeleton flex-1 w-full rounded-2xl" />
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
