import React, { createContext, useContext, useState, useEffect } from 'react';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(localStorage.getItem('hotel_token') || null);
  const [loading, setLoading] = useState(true);

  const BACKEND_URL = import.meta.env.VITE_BACKEND_URL || 'http://localhost:5000';
  const backendUrl = `${BACKEND_URL}/api/hotel`;

  useEffect(() => {
    const loadSession = () => {
      const storedUser = localStorage.getItem('hotel_user');
      const storedToken = localStorage.getItem('hotel_token');
      if (storedUser && storedToken) {
        setUser(JSON.parse(storedUser));
        setToken(storedToken);
      }
      setLoading(false);
    };
    loadSession();
  }, []);

  const login = async (email, password) => {
    try {
      const res = await fetch(`${backendUrl}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });

      const data = await res.json();
      if (!res.ok) {
        // Return verification status if unverified
        if (data.unverified) {
          return { success: false, unverified: true, email: data.email, error: data.error };
        }
        throw new Error(data.error || 'Failed to authenticate.');
      }

      localStorage.setItem('hotel_token', data.token);
      localStorage.setItem('hotel_user', JSON.stringify(data.user));
      setToken(data.token);
      setUser(data.user);
      return { success: true, user: data.user };
    } catch (err) {
      return { success: false, error: err.message };
    }
  };

  const signup = async (name, email, password, phone) => {
    try {
      const res = await fetch(`${backendUrl}/auth/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, email, password, phone }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Registration failed.');
      }
      return { success: true, message: data.message };
    } catch (err) {
      return { success: false, error: err.message };
    }
  };

  const verifyOtp = async (email, otp) => {
    try {
      const res = await fetch(`${backendUrl}/auth/verify-otp`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, otp }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Verification failed.');
      }
      return { success: true, message: data.message };
    } catch (err) {
      return { success: false, error: err.message };
    }
  };

  const resendOtp = async (email) => {
    try {
      const res = await fetch(`${backendUrl}/auth/resend-otp`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to resend code.');
      }
      return { success: true, message: data.message };
    } catch (err) {
      return { success: false, error: err.message };
    }
  };

  const forgotPassword = async (email) => {
    try {
      const res = await fetch(`${backendUrl}/auth/forgot-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Reset request failed.');
      }
      return { success: true, message: data.message };
    } catch (err) {
      return { success: false, error: err.message };
    }
  };

  const logout = () => {
    localStorage.removeItem('hotel_token');
    localStorage.removeItem('hotel_user');
    setUser(null);
    setToken(null);
  };

  const updateProfile = async (name, phone) => {
    try {
      const data = await apiFetch('/auth/profile', {
        method: 'PUT',
        body: JSON.stringify({ name, phone }),
      });
      localStorage.setItem('hotel_user', JSON.stringify(data.user));
      setUser(data.user);
      return { success: true, user: data.user };
    } catch (err) {
      return { success: false, error: err.message };
    }
  };

  const apiFetch = async (endpoint, options = {}) => {
    const url = `${backendUrl}${endpoint}`;
    const headers = {
      'Content-Type': 'application/json',
      ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
      ...options.headers,
    };

    const res = await fetch(url, {
      ...options,
      headers,
    });

    const data = await res.json();
    if (!res.ok) {
      if (res.status === 401 || res.status === 403) {
        logout();
      }
      throw new Error(data.error || 'API Request failed.');
    }
    return data;
  };

  return (
    <AuthContext.Provider value={{ user, token, loading, login, signup, verifyOtp, resendOtp, forgotPassword, logout, apiFetch, updateProfile }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
export default AuthContext;
