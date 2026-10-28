import { httpRequest } from './http.ts'
import type { Domicilio, User } from './authService.ts'

export type ProfileUpdate = {
  email: string
  cliente: {
    name: string
    lastName: string
    domicilios: Domicilio[]
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

export const userService = {
  updateProfile: (id: string, profile: ProfileUpdate) =>
    httpRequest<User>(`/users/${encodeURIComponent(id)}`, {
      method: 'PATCH',
      body: JSON.stringify(profile),
    }),
  list: () => httpRequest<User[]>('/users'),
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
