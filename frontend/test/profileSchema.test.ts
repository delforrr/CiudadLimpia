import assert from 'node:assert/strict'
import { test } from 'node:test'
import { profileSchema } from '../src/schemas/profileSchema.ts'
import { registerSchema } from '../src/schemas/registerSchema.ts'

const profile = { name: ' Ana ', lastName: ' Pérez ', email: ' ANA@example.com ', direccion: ' San Martín 123 \n\n Belgrano 456 ' }

test('normalizes the profile and converts address lines for the API', () => {
  assert.deepEqual(profileSchema.parse(profile), {
    name: 'Ana', lastName: 'Pérez', email: 'ana@example.com',
    direccion: [{ direccion: 'San Martín 123' }, { direccion: 'Belgrano 456' }],
  })
})

test('rejects empty names, missing addresses and limits before saving', () => {
  for (const change of [
    { name: ' ' }, { lastName: ' ' }, { name: 'a'.repeat(101) },
    { lastName: 'a'.repeat(101) }, { email: 'invalid' },
    { direccion: '' }, { direccion: ' \n ' }, { direccion: 'a'.repeat(201) },
    { direccion: Array(21).fill('San Martín 123').join('\n') },
  ]) {
    assert.equal(profileSchema.safeParse({ ...profile, ...change }).success, false, JSON.stringify(change))
  }
  assert.equal(profileSchema.safeParse({ ...profile, direccion: Array(20).fill('a'.repeat(200)).join('\n') }).success, true)
})

test('registration requires matching passwords and a complete profile', () => {
  const registration = { ...profile, password: 'contraseña!2026', repeatedPassword: 'contraseña!2026', rememberMe: false }
  assert.equal(registerSchema.safeParse(registration).success, true)
  for (const change of [{ repeatedPassword: 'otra' }, { direccion: '' }, { name: '' }]) {
    assert.equal(registerSchema.safeParse({ ...registration, ...change }).success, false)
  }
})
