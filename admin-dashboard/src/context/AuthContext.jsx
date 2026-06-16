import React, { createContext, useContext, useState, useEffect } from 'react';

const AuthContext = createContext();
const BACKEND_URL = import.meta.env.VITE_BACKEND_URL || 'http://localhost:5000';
const API_BASE_URL = `${BACKEND_URL}/api`;

export const AuthProvider = ({ children }) => {
  const [token, setToken] = useState(() => localStorage.getItem('admin_token'));
  const [user, setUser] = useState(() => {
    try {
      const saved = localStorage.getItem('admin_user');
      return saved ? JSON.parse(saved) : null;
    } catch (e) {
      return null;
    }
  });
  const [loading, setLoading] = useState(() => {
    const savedToken = localStorage.getItem('admin_token');
    const savedUser = localStorage.getItem('admin_user');
    return !!(savedToken && !savedUser);
  });

  useEffect(() => {
    const fetchProfile = async () => {
      if (!token) {
        setUser(null);
        setLoading(false);
        return;
      }

      let isNetworkError = false;
      try {
        const response = await fetch(`${API_BASE_URL}/auth/me`, {
          headers: {
            'Authorization': `Bearer ${token}`,
          },
        });

        if (response.ok) {
          const profileData = await response.json();
          if (profileData.role === 'admin') {
            setUser(profileData);
            localStorage.setItem('admin_user', JSON.stringify(profileData));
          } else {
            logout();
          }
        } else {
          if (response.status === 401 || response.status === 403) {
            logout();
          }
        }
      } catch (error) {
        console.error('Error fetching admin profile:', error);
        // If it's a network error (backend down), we retry
        if (error.message === 'Failed to fetch' || error.message.includes('Network')) {
          isNetworkError = true;
          setTimeout(fetchProfile, 3000);
        }
      } finally {
        // Only stop loading if we successfully parsed a response or deliberately logged out
        if (!isNetworkError) {
          setLoading(false);
        }
      }
    };

    fetchProfile();
  }, [token]);

  const login = async (email, password) => {
    const response = await fetch(`${API_BASE_URL}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error || 'Login failed');
    }

    if (data.user.role !== 'admin') {
      throw new Error('Unauthorized. This portal is restricted to Admins.');
    }

    localStorage.setItem('admin_token', data.token);
    localStorage.setItem('admin_user', JSON.stringify(data.user));
    setToken(data.token);
    setUser(data.user);
    return data.user;
  };

  const logout = () => {
    localStorage.removeItem('admin_token');
    localStorage.removeItem('admin_user');
    setToken(null);
    setUser(null);
  };

  const apiFetch = async (endpoint, options = {}) => {
    const headers = {
      'Content-Type': 'application/json',
      ...options.headers,
    };

    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    const response = await fetch(`${API_BASE_URL}${endpoint}`, {
      ...options,
      headers,
    });

    if (response.status === 401 || response.status === 403) {
      logout();
      throw new Error('Session expired or unauthorized. Please log in again.');
    }

    const contentType = response.headers.get('content-type');
    let data;
    if (contentType && contentType.includes('application/json')) {
      data = await response.json();
    } else {
      data = { message: await response.text() };
    }

    if (!response.ok) {
      throw new Error(data.error || `HTTP Error ${response.status}`);
    }

    return data;
  };

  return (
    <AuthContext.Provider value={{ user, setUser, token, loading, login, logout, apiFetch, API_BASE_URL }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
export { API_BASE_URL };
