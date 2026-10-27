import { httpRequest } from './http.ts'

export type User = {
  id: string
  email: string
  role: 'USER' | 'ADMIN'
  cliente: {
    id: string
    name: string
    lastName: string
    domicilios: { id: string; direccion: string }[]
  } | null
}
export type LoginCredentials = {
  email: string
  password: string
  rememberMe?: boolean
}
export type RegisterCredentials = {
  email: string
  password: string
  name: string
  lastName: string
  repeatedPassword: string
  domicilios: { direccion: string }[]
}

export const authService = {
  register: (credentials: RegisterCredentials) =>
    httpRequest<User>('/auth/register', {
      method: 'POST',
      body: JSON.stringify(credentials),
    }),
  login: (credentials: LoginCredentials) =>
    httpRequest<User>('/auth/login', {
      method: 'POST',
      body: JSON.stringify(credentials),
    }),
  me: () => httpRequest<User>('/auth/me'),
  logout: () => httpRequest<void>('/auth/logout', { method: 'POST' }),
}
