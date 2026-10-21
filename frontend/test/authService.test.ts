import assert from 'node:assert/strict'
import { afterEach, mock, test } from 'node:test'
import { authService } from '../src/services/authService.ts'

afterEach(() => mock.restoreAll())

test('uses each auth route with the expected credentials and body', async () => {
  const user = {
    id: '1',
    email: 'ana@example.com',
    name: 'Ana',
    lastName: 'Pérez',
  }
  const requests: { url: string; options: RequestInit }[] = []
  mock.method(
    globalThis,
    'fetch',
    async (url: string, options: RequestInit) => {
      requests.push({ url, options })
      return url.endsWith('/logout')
        ? new Response(null, { status: 204 })
        : Response.json(user)
    },
  )
  const login = {
    email: user.email,
    password: 'test-password!',
    rememberMe: true,
  }
  const register = {
    email: user.email,
    name: user.name,
    lastName: user.lastName,
    password: login.password,
    repeatedPassword: login.password,
  }
  assert.deepEqual(await authService.register(register), user)
  assert.deepEqual(await authService.login(login), user)
  assert.deepEqual(await authService.me(), user)
  assert.equal(await authService.logout(), undefined)
  assert.deepEqual(
    requests.map(({ url }) => url),
    ['/auth/register', '/auth/login', '/auth/me', '/auth/logout'],
  )
  assert.equal(requests[0].options.body, JSON.stringify(register))
  assert.equal(requests[1].options.body, JSON.stringify(login))
  assert.equal(requests[2].options.method, undefined)
  assert.equal(requests[3].options.method, 'POST')
  for (const { options } of requests) {
    assert.equal(options.credentials, 'same-origin')
    assert.deepEqual(options.headers, { 'Content-Type': 'application/json' })
  }
})

test('reports validation errors and non-JSON server errors', async () => {
  mock.method(globalThis, 'fetch', async () =>
    Response.json(
      { message: ['Email inválido', 'Contraseña inválida'] },
      { status: 400 },
    ),
  )
  await assert.rejects(authService.me(), /Email inválido\. Contraseña inválida/)
  mock.restoreAll()
  mock.method(
    globalThis,
    'fetch',
    async () => new Response('Bad gateway', { status: 502 }),
  )
  await assert.rejects(authService.me(), /No se pudo completar la solicitud/)
})

test('reports connection failures', async () => {
  mock.method(globalThis, 'fetch', () => {
    throw new TypeError('Failed to fetch')
  })
  await assert.rejects(authService.me(), /No se pudo conectar con el servidor/)
})
