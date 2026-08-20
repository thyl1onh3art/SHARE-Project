import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import axios from 'axios';

interface User {
  id: string;
  name: string;
  firstName?: string;
  lastName?: string;
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
  refreshUser: () => Promise<void>;
  deleteAccount: () => Promise<void>;
  logout: () => void;
  loading: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const API_BASE_URL = process.env.REACT_APP_API_URL || 'https://share-project-production.up.railway.app/api';

// Configure axios defaults
axios.defaults.baseURL = API_BASE_URL;

/** Normalise login /me /profile user payloads into a stable AuthContext User. */
const mapUserFromApi = (userData: {
  id?: string;
  _id?: string;
  userId?: string;
  name?: string;
  firstName?: string;
  lastName?: string;
  email: string;
}): User => {
  const firstName = userData.firstName?.trim() || undefined;
  const lastName = userData.lastName?.trim() || undefined;
  const name =
    userData.name?.trim() ||
    `${firstName || ''} ${lastName || ''}`.trim() ||
    'User';

  return {
    id: String(userData.id || userData._id || userData.userId || ''),
    name,
    firstName,
    lastName,
    email: userData.email
  };
};

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
          setUser(mapUserFromApi(response.data.user));
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
      setUser(mapUserFromApi(userData));
    } catch (error: any) {
      throw new Error(error.response?.data?.message || 'Login failed');
    }
  };

  const register = async (name: string, email: string, password: string, age: number, interests: string[]) => {
    try {
      const response = await axios.post('/users/register', {
        name,
        email,
        password,
        age,
        interests
      });
      return response.data;
    } catch (error: any) {
      // Log the full error for debugging
      console.error('Registration error:', error.response?.data || error.message);
      
      // Return detailed error information
      const errorMessage = error.response?.data?.errors 
        ? error.response.data.errors.map((e: any) => e.message || e).join(', ')
        : error.response?.data?.message || error.message || 'Registration failed';
      
      throw new Error(errorMessage);
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

  const refreshUser = async () => {
    const response = await axios.get('/users/me');
    setUser(mapUserFromApi(response.data.user));
  };

  const updateProfile = async (profileData: { name?: string; age?: number; interests?: string[] }) => {
    try {
      const response = await axios.put('/users/profile', profileData);
      if (response.data.user) {
        setUser(mapUserFromApi(response.data.user));
      } else if (user) {
        setUser({
          ...user,
          name: profileData.name?.trim() || user.name
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
    refreshUser,
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
