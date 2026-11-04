import assert from 'node:assert/strict'
import { afterEach, mock, test } from 'node:test'
import { userService } from '../src/services/userService.ts'

afterEach(() => mock.restoreAll())

test('creates users and administrators with the role in the query and without changing the session', async () => {
  for (const role of ['USER', 'ADMIN'] as const) {
    const input = {
      role, email: 'nueva@example.com', password: 'clave-de-prueba',
      cliente: { name: 'Ana', lastName: 'Pérez', domicilios: [{ direccion: 'San Martín 123' }] },
    }
    const saved = { id: 'new-user', role, email: input.email, cliente: { id: 'new-cliente', ...input.cliente } }
    mock.method(globalThis, 'fetch', async (url: string, options: RequestInit) => {
      assert.equal(url, `/users?role=${role}`)
      assert.equal(options.method, 'POST')
      assert.equal(options.credentials, 'same-origin')
      assert.deepEqual(options.headers, { 'Content-Type': 'application/json' })
      assert.deepEqual(JSON.parse(options.body as string), {
        email: input.email, password: input.password, cliente: input.cliente,
      })
      return Response.json(saved, { status: 201 })
    })
    assert.deepEqual(await userService.create(input), saved)
    mock.restoreAll()
  }
})

test('preserves duplicate-email errors during user creation', async () => {
  mock.method(globalThis, 'fetch', async () => Response.json({ message: 'Ya existe una cuenta con ese email' }, { status: 409 }))
  await assert.rejects(userService.create({
    role: 'USER', email: 'duplicado@example.com', password: 'clave-de-prueba',
    cliente: { name: 'Ana', lastName: 'Pérez', domicilios: [{ direccion: 'San Martín 123' }] },
  }), /Ya existe una cuenta con ese email/)
})

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

test('lists every user through the admin endpoint', async () => {
  const users = [
    {
      id: 'admin-1',
      email: 'admin@example.com',
      role: 'ADMIN',
      cliente: {
        id: 'cliente-1',
        name: 'Ana',
        lastName: 'Pérez',
        domicilios: [{ id: 'd1', direccion: 'San Martín 123', etiqueta: 'Casa' }],
      },
    },
  ]
  mock.method(globalThis, 'fetch', async (url: string, options: RequestInit) => {
    assert.equal(url, '/users')
    assert.equal(options.credentials, 'same-origin')
    assert.equal(options.method, undefined)
    return Response.json(users)
  })

  assert.deepEqual(await userService.list(), users)
})

test('updates an account, its addresses and role from the admin panel', async () => {
  const changes = {
    email: 'ana@example.com',
    role: 'ADMIN' as const,
    cliente: {
      name: 'Ana',
      lastName: 'Pérez',
      domicilios: [{ direccion: 'Belgrano 456', etiqueta: 'Trabajo' }],
    },
  }
  const saved = {
    id: '1',
    ...changes,
    cliente: {
      id: 'cliente-1',
      ...changes.cliente,
      domicilios: [{ id: 'd2', ...changes.cliente.domicilios[0] }],
    },
  }
  mock.method(globalThis, 'fetch', async (url: string, options: RequestInit) => {
    assert.equal(url, '/users/1')
    assert.equal(options.method, 'PATCH')
    assert.deepEqual(JSON.parse(options.body as string), changes)
    return Response.json(saved)
  })

  assert.deepEqual(await userService.update('1', changes), saved)
})

test('deletes a user with the admin endpoint', async () => {
  mock.method(globalThis, 'fetch', async (url: string, options: RequestInit) => {
    assert.equal(url, '/users/1')
    assert.equal(options.method, 'DELETE')
    assert.equal(options.credentials, 'same-origin')
    return new Response(null, { status: 204 })
  })

  assert.equal(await userService.remove('1'), undefined)
})

