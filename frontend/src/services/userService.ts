import { httpRequest } from './http.ts'
import type { Domicilio, User } from './authService.ts'

export type ProfileUpdate = {
  email?: string
  password?: string
  cliente?: {
    name?: string
    lastName?: string
    domicilios?: Domicilio[]
  }
}

export type AdminUserUpdate = {
  email: string
  role: User['role']
  cliente: {
    name: string
    lastName: string
    domicilios: Domicilio[]
  }
}

export type AdminUserCreate = AdminUserUpdate & { password: string }

export const userService = {
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
