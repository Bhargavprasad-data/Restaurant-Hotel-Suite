import React, { createContext, useContext, useState, useEffect } from 'react';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(localStorage.getItem('hotel_admin_token') || null);
  const [loading, setLoading] = useState(true);

  const BACKEND_URL = import.meta.env.VITE_BACKEND_URL || 'http://localhost:5000';
  const backendUrl = `${BACKEND_URL}/api/hotel`;

  useEffect(() => {
    const loadSession = () => {
      const storedUser = localStorage.getItem('hotel_admin_user');
      const storedToken = localStorage.getItem('hotel_admin_token');
      if (storedUser && storedToken) {
        try {
          const u = JSON.parse(storedUser);
          if (u && u.role === 'admin') {
            setUser(u);
            setToken(storedToken);
          } else {
            // Wipes out invalid non-admin session variables
            localStorage.removeItem('hotel_admin_token');
            localStorage.removeItem('hotel_admin_user');
          }
        } catch (e) {
          localStorage.removeItem('hotel_admin_token');
          localStorage.removeItem('hotel_admin_user');
        }
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
        throw new Error(data.error || 'Failed to authenticate.');
      }

      // STRICT ADMIN ONLY ROLE VERIFICATION CHECK!
      if (data.user.role !== 'admin') {
        throw new Error('Access denied. This console is restricted to Administrator roles only.');
      }

      localStorage.setItem('hotel_admin_token', data.token);
      localStorage.setItem('hotel_admin_user', JSON.stringify(data.user));
      setToken(data.token);
      setUser(data.user);
      return { success: true, user: data.user };
    } catch (err) {
      return { success: false, error: err.message };
    }
  };

  const logout = () => {
    localStorage.removeItem('hotel_admin_token');
    localStorage.removeItem('hotel_admin_user');
    setUser(null);
    setToken(null);
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
    <AuthContext.Provider value={{ user, token, loading, login, logout, apiFetch }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
export default AuthContext;
