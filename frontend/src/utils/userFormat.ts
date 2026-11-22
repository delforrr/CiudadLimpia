import type { User } from '../services/authService.ts'

export function userFullName(user: User) {
  const name = user.cliente?.name?.trim()
  const lastName = user.cliente?.lastName?.trim()
  const fullName = [name, lastName].filter(Boolean).join(' ')
  return fullName || 'Cuenta sin datos de cliente'
}

export function userInitials(user: User) {
  const name = user.cliente?.name?.trim()
  const lastName = user.cliente?.lastName?.trim()
  if (name && lastName) return `${name[0]}${lastName[0]}`.toUpperCase()
  if (name) return name.slice(0, 2).toUpperCase()
  return user.email.slice(0, 2).toUpperCase()
}

export function addressCountLabel(count: number) {
  return `${count} ${count === 1 ? 'domicilio' : 'domicilios'}`
}
