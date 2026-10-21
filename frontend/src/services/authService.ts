export type User = { id: string; email: string; name: string; lastName: string }
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
}

async function authRequest<T>(
  path: string,
  options: RequestInit = {},
): Promise<T> {
  let response: Response
  try {
    response = await fetch(`/auth/${path}`, {
      ...options,
      credentials: 'same-origin',
      headers: { 'Content-Type': 'application/json', ...options.headers },
    })
  } catch {
    throw new Error('No se pudo conectar con el servidor. Intentá nuevamente.')
  }
  if (!response.ok) {
    const body = (await response.json().catch(() => null)) as {
      message?: string | string[]
    } | null
    throw new Error(
      body?.message
        ? Array.isArray(body.message)
          ? body.message.join('. ')
          : body.message
        : 'No se pudo completar la solicitud',
    )
  }
  return response.status === 204
    ? (undefined as T)
    : (response.json() as Promise<T>)
}

export const authService = {
  register: (credentials: RegisterCredentials) =>
    authRequest<User>('register', {
      method: 'POST',
      body: JSON.stringify(credentials),
    }),
  login: (credentials: LoginCredentials) =>
    authRequest<User>('login', {
      method: 'POST',
      body: JSON.stringify(credentials),
    }),
  me: () => authRequest<User>('me'),
  logout: () => authRequest<void>('logout', { method: 'POST' }),
}
