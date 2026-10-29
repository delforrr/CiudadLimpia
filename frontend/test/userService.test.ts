import assert from 'node:assert/strict'
import { afterEach, mock, test } from 'node:test'
import { userService } from '../src/services/userService.ts'

afterEach(() => mock.restoreAll())

test('saves the cliente and addresses through the authenticated user endpoint', async () => {
  const profile = {
    email: 'ana@example.com',
    cliente: {
      name: 'Ana',
      lastName: 'Pérez',
      domicilios: [{ direccion: 'San Martín 123', etiqueta: 'Casa' }],
    },
  }
  const saved = { id: '1', role: 'USER', ...profile }
  mock.method(
    globalThis,
    'fetch',
    async (url: string, options: RequestInit) => {
      assert.equal(url, '/users/1')
      assert.equal(options.method, 'PATCH')
      assert.equal(options.credentials, 'same-origin')
      assert.deepEqual(options.headers, { 'Content-Type': 'application/json' })
      assert.deepEqual(JSON.parse(options.body as string), profile)
      return Response.json(saved)
    },
  )
  assert.deepEqual(await userService.updateProfile('1', profile), saved)
})

test('preserves the backend error when the profile cannot be saved', async () => {
  mock.method(globalThis, 'fetch', async () =>
    Response.json(
      { message: 'Ya existe una cuenta con ese email' },
      { status: 409 },
    ),
  )
  await assert.rejects(
    userService.updateProfile('1', {
      email: 'taken@example.com',
      cliente: { name: 'Ana', lastName: 'Pérez', domicilios: [] },
    }),
    /Ya existe una cuenta/,
  )
})
