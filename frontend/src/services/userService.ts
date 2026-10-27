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

export const userService = {
  updateProfile: (id: string, profile: ProfileUpdate) =>
    httpRequest<User>(`/users/${encodeURIComponent(id)}`, {
      method: 'PATCH',
      body: JSON.stringify(profile),
    }),
}
