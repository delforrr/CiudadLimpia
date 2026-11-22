import { useCallback, useEffect, useState } from 'react'
import { authService, type User } from '../services/authService.ts'

export function useAuth() {
  const [user, setUser] = useState<User | null>(null)
  const [checking, setChecking] = useState(true)
  const [logoutError, setLogoutError] = useState('')
  const [loggingOut, setLoggingOut] = useState(false)

  useEffect(() => {
    let active = true
    authService
      .me()
      .then((user) => {
        if (active) setUser(user)
      })
      .catch(() => {
        /* The login form allows retrying an unavailable or expired session. */
      })
      .finally(() => {
        if (active) setChecking(false)
      })
    return () => {
      active = false
    }
  }, [])

  const logout = useCallback(async () => {
    setLoggingOut(true)
    setLogoutError('')
    try {
      await authService.logout()
      setUser(null)
    } catch (error) {
      setLogoutError(
        error instanceof Error ? error.message : 'No se pudo cerrar sesión',
      )
    } finally {
      setLoggingOut(false)
    }
  }, [])

  return {
    user,
    onAuthenticated: setUser,
    checking,
    logout,
    logoutError,
    loggingOut,
  }
}
