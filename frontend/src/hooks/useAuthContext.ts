import { useContext } from 'react'
import { AuthContext } from '../context/auth-context.ts'

export function useAuthContext() {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error('useAuthContext debe ser utilizado dentro de un AuthProvider')
  }
  return context
}
