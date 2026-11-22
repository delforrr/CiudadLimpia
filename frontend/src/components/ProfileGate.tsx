import type { ReactNode } from 'react'
import { Navigate, useLocation } from 'react-router-dom'
import { useAuthContext } from '../hooks/useAuthContext'

export default function ProfileGate({ children }: Readonly<{ children: ReactNode }>) {
  const { user, checking } = useAuthContext()
  const { pathname } = useLocation()

  if (checking) return <p role="status">Comprobando sesión…</p>
  if (
    user &&
    user.role !== 'ADMIN' &&
    !pathname.startsWith('/admin') &&
    !user.cliente?.domicilios.length &&
    pathname !== '/perfil'
  ) {
    return <Navigate to="/perfil" replace />
  }
  return children
}
