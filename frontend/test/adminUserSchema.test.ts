import assert from 'node:assert/strict'
import { test } from 'node:test'
import { adminUserSchema } from '../src/schemas/adminUserSchema.ts'

const form = {
  name: 'Ana',
  lastName: 'Pérez',
  email: 'ana@example.com',
  role: 'USER',
  domicilios: [{ direccion: 'San Martín 123', etiqueta: 'Casa' }],
}

test('normalizes the admin edit form and keeps the selected role', () => {
  assert.deepEqual(
    adminUserSchema.parse({
      ...form,
      name: ' Ana ',
      email: ' ANA@example.com ',
      role: 'ADMIN',
    }),
    {
      ...form,
      name: 'Ana',
      email: 'ana@example.com',
      role: 'ADMIN',
    },
  )
})

test('rejects invalid roles, emails and missing addresses from the admin panel', () => {
  for (const change of [
    { role: 'SUPERADMIN' },
    { role: undefined },
    { email: 'invalido' },
    { domicilios: [] },
    { domicilios: [{ direccion: ' ' }] },
  ]) {
    assert.equal(
      adminUserSchema.safeParse({ ...form, ...change }).success,
      false,
      JSON.stringify(change),
    )
  }
})
