import React, { createContext, useState, useEffect, useContext } from 'react';
import { apiClient, API_BASE_URL } from '../api/client';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (token) {
      // Validate token and get user info
      apiClient('/auth/me')
        .then(userData => {
          setUser(userData);
          setLoading(false);
        })
        .catch(err => {
          console.error("Token validation failed", err);
          localStorage.removeItem('token');
          setLoading(false);
        });
    } else {
      setLoading(false);
    }
  }, []);

  const login = async (email, password) => {
    try {
      const response = await fetch(`${API_BASE_URL}/auth/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ email, password })
      });
      
      if (!response.ok) {
        throw new Error('Invalid login credentials');
      }
      
      const data = await response.json();
      localStorage.setItem('token', data.access_token);
      
      const userData = await apiClient('/auth/me');
      setUser(userData);
      return true;
    } catch (err) {
      console.error(err);
      throw err;
    }
  };

  const logout = () => {
    localStorage.removeItem('token');
    setUser(null);
  };

  const isReader = user?.role === 'READER';
  const isSuperAdmin = user?.role === 'SUPER_ADMIN';
  const requiresPasswordChange = user?.requires_password_change === true;

  return (
    <AuthContext.Provider value={{ user, login, logout, loading, isReader, isSuperAdmin, requiresPasswordChange, setUser }}>
      {!loading && children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
