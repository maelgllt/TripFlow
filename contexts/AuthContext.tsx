import React, { createContext, useContext, useState, useEffect } from 'react';
import { User } from '@/types/database';
import { DatabaseService } from '@/services/database';
import { getRememberedUserId, rememberUser, forgetUser } from '@/services/userSession';

interface AuthContextType {
  isAuthenticated: boolean;
  user: User | null;
  login: (email: string, password: string) => Promise<boolean>;
  register: (email: string, password: string, name: string) => Promise<boolean>;
  logout: () => Promise<void>;
  deleteAccount: () => Promise<boolean>;
  loading: boolean;
}

const AuthContext = createContext<AuthContextType>({
  isAuthenticated: false,
  user: null,
  login: async () => false,
  register: async () => false,
  logout: async () => {},
  deleteAccount: async () => false,
  loading: true,
});

export const useAuth = () => useContext(AuthContext);

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    checkAuthStatus();
  }, []);

  const checkAuthStatus = async () => {
    try {
      // SecureStore
      const userId = await getRememberedUserId();
      if (userId) {
        const userData = await DatabaseService.getUserById(userId);
        if (userData) {
          setIsAuthenticated(true);
          setUser(userData);
        } else {
          await forgetUser();
        }
      }
    } catch (error) {
      console.error('Error checking auth status:', error);
    } finally {
      setLoading(false);
    }
  };

  const login = async (email: string, password: string): Promise<boolean> => {
    try {
      const userData = await DatabaseService.loginUser(email, password);
      if (userData) {
        // SecureStore
        await rememberUser(userData.id);
        setIsAuthenticated(true);
        setUser(userData);
        return true;
      }
      return false;
    } catch (error) {
      console.error('Error logging in:', error);
      return false;
    }
  };

  const register = async (email: string, password: string, name: string): Promise<boolean> => {
    try {
      const userId = await DatabaseService.createUser(email, password, name);
      if (userId) {
        const userData = await DatabaseService.getUserById(userId);
        if (userData) {
          // SecureStore
          await rememberUser(userId);
          setIsAuthenticated(true);
          setUser(userData);
          return true;
        }
      }
      return false;
    } catch (error) {
      console.error('Error registering:', error);
      return false;
    }
  };

  const logout = async () => {
    try {
      // SecureStore
      await forgetUser();
      setIsAuthenticated(false);
      setUser(null);
    } catch (error) {
      console.error('Error logging out:', error);
    }
  };

  const deleteAccount = async (): Promise<boolean> => {
    try {
      if (!user) {
        return false;
      }

      const success = await DatabaseService.deleteUser(user.id);
      
      if (success) {
        await forgetUser();
        setIsAuthenticated(false);
        setUser(null);
        return true;
      }
      
      return false;
    } catch (error) {
      console.error('Error deleting account:', error);
      return false;
    }
  };

  return (
    <AuthContext.Provider value={{ 
      isAuthenticated, 
      user, 
      login, 
      register, 
      logout, 
      deleteAccount, 
      loading 
    }}>
      {children}
    </AuthContext.Provider>
  );
};