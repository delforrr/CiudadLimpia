import test, { afterEach } from 'node:test'
import assert from 'node:assert/strict'
import { mock } from 'node:test'
import { userService } from '../src/services/userService.ts'

afterEach(() => mock.restoreAll())

test('creates users and administrators without changing the session', async () => {
  for (const role of ['USER', 'ADMIN'] as const) {
    const input = {
      role,
      email: 'nueva@example.com',
      password: 'clave-de-prueba',
      cliente: { name: 'Ana', lastName: 'Pérez', domicilios: [{ direccion: 'San Martín 123' }] },
    }
    const saved = { id: 'new-user', role, email: input.email, cliente: { id: 'new-cliente', ...input.cliente } }
    mock.method(globalThis, 'fetch', async (url: string, options: RequestInit) => {
      assert.equal(url, '/users')
      assert.equal(options.method, 'POST')
      assert.equal(options.credentials, 'same-origin')
      assert.deepEqual(options.headers, { 'Content-Type': 'application/json' })
      assert.deepEqual(JSON.parse(options.body as string), input)
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
  const user = { id: '1', ...profile }
  mock.method(globalThis, 'fetch', async (url: string, options: RequestInit) => {
    assert.equal(url, '/users/1')
    assert.equal(options.method, 'PATCH')
    assert.equal(options.credentials, 'same-origin')
    assert.deepEqual(options.headers, { 'Content-Type': 'application/json' })
    assert.deepEqual(JSON.parse(options.body as string), profile)
    return Response.json(user)
  })

  assert.deepEqual(await userService.updateProfile('1', profile), user)
})

test('allows deleting addresses by sending an empty list through updateProfile', async () => {
  mock.method(globalThis, 'fetch', async (_url: string, options: RequestInit) => {
    assert.deepEqual(JSON.parse(options.body as string), { cliente: { domicilios: [] } })
    return Response.json({ id: '1', cliente: { domicilios: [] } })
  })

  await userService.updateProfile('1', { cliente: { domicilios: [] } })
})

test('preserves the backend error when an address or field is rejected', async () => {
  mock.method(globalThis, 'fetch', async () =>
    Response.json(
      { message: 'Ya existe una cuenta con ese email' },
      { status: 409 },
    ),
  )

  await assert.rejects(
    userService.updateProfile('1', { email: 'otro@example.com' }),
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
