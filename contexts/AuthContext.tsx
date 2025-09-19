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
  loading: boolean;
}

const AuthContext = createContext<AuthContextType>({
  isAuthenticated: false,
  user: null,
  login: async () => false,
  register: async () => false,
  logout: async () => {},
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
      // Utiliser SecureStore au lieu d'AsyncStorage
      const userId = await getRememberedUserId();
      if (userId) {
        const userData = await DatabaseService.getUserById(userId);
        if (userData) {
          setIsAuthenticated(true);
          setUser(userData);
        } else {
          // Si l'utilisateur n'existe plus dans la DB, nettoyer la session
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
        // Utiliser SecureStore au lieu d'AsyncStorage
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
          // Utiliser SecureStore au lieu d'AsyncStorage
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
      // Utiliser SecureStore au lieu d'AsyncStorage
      await forgetUser();
      setIsAuthenticated(false);
      setUser(null);
    } catch (error) {
      console.error('Error logging out:', error);
    }
  };

  return (
    <AuthContext.Provider value={{ isAuthenticated, user, login, register, logout, loading }}>
      {children}
    </AuthContext.Provider>
  );
};