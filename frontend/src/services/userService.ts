import { httpRequest } from './http.ts'
import type { User } from './authService.ts'
import type { DomicilioReferencia } from '../schemas/profileSchema.ts'

export type ProfileUpdate = {
  email?: string
  password?: string
  cliente?: {
    name?: string
    lastName?: string
    domicilios?: DomicilioReferencia[]
  }
}

export type AdminUserUpdate = {
  email: string
  role: User['role']
  cliente: {
    name: string
    lastName: string
    domicilios: DomicilioReferencia[]
  }
}

export type AdminUserCreate = AdminUserUpdate & { password: string }

export const userService = {
  elegirDomicilio: (direccionId: string, signal: AbortSignal) =>
    httpRequest<void>('/users/me/domicilio-actual', {
      method: 'PATCH', signal, body: JSON.stringify({ direccionId }),
    }),
  updateProfile: (id: string, profile: ProfileUpdate) =>
    httpRequest<User>(`/users/${encodeURIComponent(id)}`, {
      method: 'PATCH',
      body: JSON.stringify(profile),
    }),
  list: () => httpRequest<User[]>('/users'),
  create: (user: AdminUserCreate) =>
    httpRequest<User>('/users', {
      method: 'POST',
      body: JSON.stringify(user),
    }),
  update: (id: string, user: AdminUserUpdate) =>
    httpRequest<User>(`/users/${encodeURIComponent(id)}`, {
      method: 'PATCH',
      body: JSON.stringify(user),
    }),
  remove: (id: string) =>
    httpRequest<void>(`/users/${encodeURIComponent(id)}`, {
      method: 'DELETE',
    }),
}
