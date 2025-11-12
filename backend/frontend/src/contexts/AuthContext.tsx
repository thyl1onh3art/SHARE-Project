import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import axios from 'axios';

interface User {
  id: string;
  name: string;
  email: string;
}

interface AuthContextType {
  user: User | null;
  token: string | null;
  login: (email: string, password: string) => Promise<void>;
  register: (name: string, email: string, password: string, age: number, interests: string[]) => Promise<void>;
  sendVerificationCode: (email: string) => Promise<void>;
  verifyEmail: (email: string, code: string) => Promise<void>;
  updateProfile: (profileData: { name?: string; age?: number; interests?: string[] }) => Promise<void>;
  deleteAccount: () => Promise<void>;
  logout: () => void;
  loading: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';

// Configure axios defaults
axios.defaults.baseURL = API_BASE_URL;

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(localStorage.getItem('token'));
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const initAuth = async () => {
      const storedToken = localStorage.getItem('token');
      if (storedToken) {
        try {
          // Set the token in axios headers
          axios.defaults.headers.common['Authorization'] = `Bearer ${storedToken}`;
          
          // Verify token by getting user profile
          const response = await axios.get('/users/me');
          setUser({
            id: response.data.user.userId,
            name: response.data.user.name || 'User',
            email: response.data.user.email
          });
          setToken(storedToken);
        } catch (error) {
          // Token is invalid, remove it
          localStorage.removeItem('token');
          delete axios.defaults.headers.common['Authorization'];
        }
      }
      setLoading(false);
    };

    initAuth();
  }, []);

  const login = async (email: string, password: string) => {
    try {
      const response = await axios.post('/users/login', { email, password });
      const { token: newToken, user: userData } = response.data;
      
      // Store token in localStorage
      localStorage.setItem('token', newToken);
      
      // Set token in axios headers
      axios.defaults.headers.common['Authorization'] = `Bearer ${newToken}`;
      
      setToken(newToken);
      setUser({
        id: userData.id,
        name: userData.name,
        email: userData.email
      });
    } catch (error: any) {
      throw new Error(error.response?.data?.message || 'Login failed');
    }
  };

  const register = async (name: string, email: string, password: string, age: number, interests: string[]) => {
    try {
      await axios.post('/users/register', {
        name,
        email,
        password,
        age,
        interests
      });
    } catch (error: any) {
      throw new Error(error.response?.data?.message || 'Registration failed');
    }
  };

  const sendVerificationCode = async (email: string) => {
    try {
      await axios.post('/email-verification/send-code', { email });
    } catch (error: any) {
      throw new Error(error.response?.data?.message || 'Failed to send verification code');
    }
  };

  const verifyEmail = async (email: string, code: string) => {
    try {
      await axios.post('/email-verification/verify', { email, code });
    } catch (error: any) {
      throw new Error(error.response?.data?.message || 'Email verification failed');
    }
  };

  const updateProfile = async (profileData: { name?: string; age?: number; interests?: string[] }) => {
    try {
      await axios.put('/users/profile', profileData);
      
      // Update local user state
      if (user) {
        setUser({
          ...user,
          name: profileData.name || user.name,
          email: user.email // Email cannot be changed
        });
      }
    } catch (error: any) {
      throw new Error(error.response?.data?.message || 'Failed to update profile');
    }
  };

  const deleteAccount = async () => {
    try {
      await axios.delete('/users/account');
      logout(); // This will clear the user state and token
    } catch (error: any) {
      throw new Error(error.response?.data?.message || 'Failed to delete account');
    }
  };

  const logout = () => {
    localStorage.removeItem('token');
    delete axios.defaults.headers.common['Authorization'];
    setToken(null);
    setUser(null);
  };

  const value: AuthContextType = {
    user,
    token,
    login,
    register,
    sendVerificationCode,
    verifyEmail,
    updateProfile,
    deleteAccount,
    logout,
    loading
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
