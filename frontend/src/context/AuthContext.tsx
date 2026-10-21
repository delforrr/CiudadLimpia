import React, { createContext, useContext, useState, useEffect } from 'react';

export interface UserSession {
  nombre: string;
  email: string;
  direccion: string;
  barrio?: string;
}

interface AuthContextType {
  isAuthenticated: boolean;
  user: UserSession | null;
  login: (userData?: Partial<UserSession>) => void;
  updateUser: (userData: Partial<UserSession>) => void;
  logout: () => void;
}

const SESSION_KEY = 'ciudad_limpia_usuario_sesion';

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<UserSession | null>(() => {
    try {
      const stored = sessionStorage.getItem(SESSION_KEY);
      return stored ? JSON.parse(stored) : null;
    } catch {
      return null;
    }
  });

  const isAuthenticated = user !== null;

  const login = (userData?: Partial<UserSession>) => {
    const sessionUser: UserSession = {
      nombre: userData?.nombre || 'Martín',
      email: userData?.email || 'martin@trenquelauquen.gov.ar',
      direccion: userData?.direccion || 'Av. Las Palmas 450 · Barrio Los Olivos',
      barrio: userData?.barrio || 'Barrio Los Olivos',
    };

    try {
      sessionStorage.setItem(SESSION_KEY, JSON.stringify(sessionUser));
    } catch (e) {
      console.error('Error guardando sesión:', e);
    }

    setUser(sessionUser);
  };

  const updateUser = (userData: Partial<UserSession>) => {
    setUser((prev) => {
      if (!prev) return null;
      const updatedUser: UserSession = {
        ...prev,
        ...userData,
      };
      try {
        sessionStorage.setItem(SESSION_KEY, JSON.stringify(updatedUser));
      } catch (e) {
        console.error('Error actualizando sesión:', e);
      }
      return updatedUser;
    });
  };

  const logout = () => {
    try {
      sessionStorage.removeItem(SESSION_KEY);
    } catch (e) {
      console.error('Error eliminando sesión:', e);
    }
    setUser(null);
  };

  // Sincronizar en caso de cambios en otras pestañas
  useEffect(() => {
    const handleStorage = (e: StorageEvent) => {
      if (e.key === SESSION_KEY) {
        setUser(e.newValue ? JSON.parse(e.newValue) : null);
      }
    };
    window.addEventListener('storage', handleStorage);
    return () => window.removeEventListener('storage', handleStorage);
  }, []);

  return (
    <AuthContext.Provider value={{ isAuthenticated, user, login, updateUser, logout }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth debe ser utilizado dentro de un AuthProvider');
  }
  return context;
};
