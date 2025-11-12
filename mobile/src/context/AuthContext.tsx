import AsyncStorage from '@react-native-async-storage/async-storage';
import React, {
  createContext,
  ReactNode,
  useContext,
  useEffect,
  useMemo,
  useState
} from 'react';
import client from '../api/client';

const getErrorMessage = (error: any, fallback: string) =>
  error?.response?.data?.message ?? error?.message ?? fallback;

interface User {
  id: string;
  name: string;
  email: string;
}

interface AuthContextType {
  user: User | null;
  token: string | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (
    name: string,
    email: string,
    password: string,
    age: number,
    interests: string[]
  ) => Promise<void>;
  sendVerificationCode: (email: string) => Promise<void>;
  verifyEmail: (email: string, code: string) => Promise<void>;
  updateProfile: (profileData: { name?: string; age?: number; interests?: string[] }) => Promise<void>;
  deleteAccount: () => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const TOKEN_STORAGE_KEY = '@share_project_token';

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const initializeAuth = async () => {
      try {
        const storedToken = await AsyncStorage.getItem(TOKEN_STORAGE_KEY);
        if (!storedToken) {
          setLoading(false);
          return;
        }

        client.defaults.headers.common.Authorization = `Bearer ${storedToken}`;
        const { data } = await client.get('/users/me');

        setUser({
          id: data.user.userId,
          name: data.user.name ?? 'User',
          email: data.user.email
        });
        setToken(storedToken);
      } catch (error) {
        await AsyncStorage.removeItem(TOKEN_STORAGE_KEY);
        delete client.defaults.headers.common.Authorization;
      } finally {
        setLoading(false);
      }
    };

    initializeAuth();
  }, []);

  const login = async (email: string, password: string) => {
    try {
      const { data } = await client.post('/users/login', { email, password });
      const { token: newToken, user: userData } = data;

      client.defaults.headers.common.Authorization = `Bearer ${newToken}`;
      await AsyncStorage.setItem(TOKEN_STORAGE_KEY, newToken);

      setToken(newToken);
      setUser({
        id: userData.id,
        name: userData.name,
        email: userData.email
      });
    } catch (error: any) {
      throw new Error(getErrorMessage(error, 'Login failed'));
    }
  };

  const register = async (
    name: string,
    email: string,
    password: string,
    age: number,
    interests: string[]
  ) => {
    try {
      await client.post('/users/register', {
        name,
        email,
        password,
        age,
        interests
      });
    } catch (error: any) {
      throw new Error(getErrorMessage(error, 'Registration failed'));
    }
  };

  const sendVerificationCode = async (email: string) => {
    try {
      await client.post('/email-verification/send-code', { email });
    } catch (error: any) {
      throw new Error(getErrorMessage(error, 'Failed to send verification code'));
    }
  };

  const verifyEmail = async (email: string, code: string) => {
    try {
      await client.post('/email-verification/verify', { email, code });
    } catch (error: any) {
      throw new Error(getErrorMessage(error, 'Email verification failed'));
    }
  };

  const updateProfile = async (profileData: { name?: string; age?: number; interests?: string[] }) => {
    try {
      await client.put('/users/profile', profileData);

      setUser((previous) =>
        previous
          ? {
              ...previous,
              name: profileData.name ?? previous.name
            }
          : previous
      );
    } catch (error: any) {
      throw new Error(getErrorMessage(error, 'Failed to update profile'));
    }
  };

  const deleteAccount = async () => {
    try {
      await client.delete('/users/account');
      await logout();
    } catch (error: any) {
      throw new Error(getErrorMessage(error, 'Failed to delete account'));
    }
  };

  const logout = async () => {
    await AsyncStorage.removeItem(TOKEN_STORAGE_KEY);
    delete client.defaults.headers.common.Authorization;
    setToken(null);
    setUser(null);
  };

  const value = useMemo<AuthContextType>(
    () => ({
      user,
      token,
      loading,
      login,
      register,
      sendVerificationCode,
      verifyEmail,
      updateProfile,
      deleteAccount,
      logout
    }),
    [user, token, loading]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }

  return context;
};
