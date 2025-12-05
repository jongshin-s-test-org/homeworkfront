'use client';

import React, { createContext, useContext, useState, useCallback, useEffect, ReactNode } from 'react';
import axios from 'axios';

interface User {
  email: string;
  id?: string;
  name?: string;
}

interface AuthContextType {
  user: User | null;
  loadingUser: boolean;
  isInitialized: boolean;
  login: (userInfo: User) => Promise<void>;
  logout: () => Promise<void>;
  isAuthenticated: boolean;
}

const AuthContext = createContext<AuthContextType | null>(null);

interface AuthProviderProps {
  children: ReactNode;
}

export function AuthProvider({ children }: AuthProviderProps) {
  const [user, setUser] = useState<User | null>(null);
  const [loadingUser, setLoadingUser] = useState(false);
  const [isInitialized, setIsInitialized] = useState(false);

  // localStorage는 클라이언트에서만 접근 가능하므로 useEffect 사용
  useEffect(() => {
    try {
      const stored = localStorage.getItem('auth:user');
      if (stored) {
        setUser(JSON.parse(stored) as User);
      }
    } catch (err) {
      console.error('Failed to load user from localStorage:', err);
    } finally {
      setIsInitialized(true);
    }
  }, []);

  const login = useCallback(async (userInfo: User) => {
    if (userInfo) {
      setUser(userInfo);
      try {
        localStorage.setItem('auth:user', JSON.stringify(userInfo));
      } catch (err) {
        console.error('Failed to save user to localStorage:', err);
      }
    }
    setLoadingUser(true);
    try {
      await axios.get('/api/posts/lists', {
        params: { page: 1, size: 10, sort: 'latest' },
        withCredentials: true
      });
    } catch (err) {
      console.error('Failed to verify login:', err);
    } finally {
      setLoadingUser(false);
    }
  }, []);

  const logout = useCallback(async () => {
    try {
      await axios.post('/api/auth/logout', {}, { withCredentials: true });
    } catch (err) {
      console.error('로그아웃 실패:', err);
    } finally {
      setUser(null);
      try {
        localStorage.removeItem('auth:user');
      } catch (err) {
        console.error('Failed to remove user from localStorage:', err);
      }
    }
  }, []);

  const value: AuthContextType = {
    user,
    loadingUser,
    isInitialized,
    login,
    logout,
    isAuthenticated: !!user
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextType {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}