import assert from 'node:assert/strict'
import { test } from 'node:test'
import { profileSchema } from '../src/schemas/profileSchema.ts'
import { registerSchema } from '../src/schemas/registerSchema.ts'

const profile = { name: ' Ana ', lastName: ' Pérez ', email: ' ANA@example.com ',
  domicilios: [{ direccion: ' San Martín 123 ', etiqueta: ' Casa ' }, { direccion: ' Belgrano 456 ' }] }

test('normalizes the profile and preserves address labels for the API', () => {
  assert.deepEqual(profileSchema.parse(profile), {
    name: 'Ana', lastName: 'Pérez', email: 'ana@example.com',
    domicilios: [{ direccion: 'San Martín 123', etiqueta: 'Casa' }, { direccion: 'Belgrano 456' }],
  })
})

test('rejects empty names, missing addresses and limits before saving', () => {
  for (const change of [
    { name: ' ' }, { lastName: ' ' }, { name: 'a'.repeat(101) },
    { lastName: 'a'.repeat(101) }, { email: 'invalid' },
    { domicilios: [] }, { domicilios: [{ direccion: ' ' }] },
    { domicilios: [{ direccion: 'a'.repeat(201) }] },
    { domicilios: [{ direccion: 'San Martín 123', etiqueta: 'a'.repeat(101) }] },
    { domicilios: [{ direccion: 'San Martín 123', etiqueta: 123 }] },
    { domicilios: Array(21).fill({ direccion: 'San Martín 123' }) },
  ]) {
    assert.equal(profileSchema.safeParse({ ...profile, ...change }).success, false, JSON.stringify(change))
  }
  assert.equal(profileSchema.safeParse({ ...profile, domicilios: Array(20).fill({ direccion: 'a'.repeat(200), etiqueta: 'a'.repeat(100) }) }).success, true)
})

test('registration requires matching passwords and valid credentials', () => {
  const registration = { name: 'Ana', lastName: 'Pérez', email: 'ana@example.com', password: 'contraseña!2026', repeatedPassword: 'contraseña!2026', rememberMe: false }
  assert.equal(registerSchema.safeParse(registration).success, true)
  for (const change of [{ repeatedPassword: 'otra' }, { name: '' }, { email: 'invalido' }]) {
    assert.equal(registerSchema.safeParse({ ...registration, ...change }).success, false)
  }
})

test('accepts addresses without labels and allows clearing an existing label', () => {
  for (const etiqueta of [undefined, null, '']) {
    const domicilios = [{ direccion: 'San Martín 123', etiqueta }]
    assert.equal(profileSchema.safeParse({ ...profile, domicilios }).success, true)
  }
})
