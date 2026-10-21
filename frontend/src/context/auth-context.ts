import { createContext } from 'react'
import type { useAuth } from '../hooks/useAuth.ts'

export type AuthContextValue = ReturnType<typeof useAuth> & {
  isAuthenticated: boolean
}

export const AuthContext = createContext<AuthContextValue | undefined>(undefined)
