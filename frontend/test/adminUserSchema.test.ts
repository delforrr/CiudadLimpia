import assert from 'node:assert/strict'
import { test } from 'node:test'
import { adminUserCreateSchema, adminUserSchema } from '../src/schemas/adminUserSchema.ts'

const form = {
  name: 'Ana',
  lastName: 'Pérez',
  email: 'ana@example.com',
  role: 'USER',
  domicilios: [{ id: 'b9c8d7e6-1234-4abc-8abc-123456789012', direccion: 'San Martín 123', etiqueta: 'Casa' }],
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
      domicilios: [{ direccionId: form.domicilios[0].id, etiqueta: 'Casa' }],
    },
  )
})

test('requires a matching bcrypt-compatible password and a located address when creating a user', () => {
  const domicilio = { direccion: 'Roca 850', frente: { calle: 'Roca', altura: 850 }, ubicacion: { lat: -35.97, long: -62.73 } }
  const create = { ...form, domicilios: [domicilio], password: '  clave-segura  ', repeatedPassword: '  clave-segura  ' }
  assert.equal(adminUserCreateSchema.parse(create).password, create.password)
  assert.deepEqual(adminUserCreateSchema.parse(create).domicilios, [
    { direccion: { ...domicilio.frente, ...domicilio.ubicacion }, etiqueta: undefined },
  ])
  for (const change of [
    { password: '' },
    { password: 'corta', repeatedPassword: 'corta' },
    { repeatedPassword: 'distinta' },
    { password: 'á'.repeat(37), repeatedPassword: 'á'.repeat(37) },
    { role: 'SUPERADMIN' },
    { domicilios: [] },
    { domicilios: [{ ...domicilio, ubicacion: undefined }] },
  ]) {
    assert.equal(adminUserCreateSchema.safeParse({ ...create, ...change }).success, false)
  }
  assert.equal(adminUserSchema.safeParse(form).success, true)
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
