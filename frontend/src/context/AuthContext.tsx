import { type ReactNode, useMemo } from 'react';
import { AuthContext } from './auth-context';
import { useAuth } from '../hooks/useAuth';

export function AuthProvider({ children }: Readonly<{ children: ReactNode }>) {
  const { user, onAuthenticated, checking, logout, logoutError, loggingOut } = useAuth();

  const authCtx = useMemo(
    () => ({
      user,
      onAuthenticated,
      checking,
      logout,
      logoutError,
      loggingOut,
      isAuthenticated: user !== null,
    }),
    [user, onAuthenticated, checking, logout, logoutError, loggingOut],
  );

  return (
    <AuthContext.Provider value={authCtx}>{children}</AuthContext.Provider>
  );
}
