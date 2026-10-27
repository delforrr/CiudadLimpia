import assert from 'node:assert/strict'
import { test } from 'node:test'
import { z } from 'zod'
import {
  authSchema,
  emailSchema,
  lastNameSchema,
  nameSchema,
  passwordSchema,
  registerSchema,
} from '../src/schemas/authSchema.ts'

test('rejects missing and malformed email addresses', () => {
  for (const email of ['', '   ', 'texto', 'ana@', '@correo.com', 'ana@correo', 'ana@@correo.com', 'ana perez@correo.com']) {
    assert.equal(emailSchema.safeParse(email).success, false, email)
  }
})

test('accepts common email formats and normalizes spaces and case', () => {
  for (const email of ['ana@correo.com', 'Ana.Perez+avisos@correo.com.ar', 'ana@sub.correo.org']) {
    assert.equal(emailSchema.safeParse(email).success, true, email)
  }
  assert.equal(emailSchema.parse('  ANA@Correo.com  '), 'ana@correo.com')
})

test('rejects addresses longer than the backend limit', () => {
  assert.equal(emailSchema.safeParse(`${'a'.repeat(245)}@correo.com`).success, false)
})

test('requires at least eight password characters', () => {
  for (const password of ['', '1234567', '😀'.repeat(7)]) {
    const result = passwordSchema.safeParse(password)
    assert.equal(result.success, false)
    if (!result.success) {
      assert.equal(result.error.issues[0].message, 'La contraseña debe tener al menos 8 caracteres')
    }
  }
  assert.equal(passwordSchema.safeParse('12345678').success, true)
  assert.equal(passwordSchema.safeParse('😀'.repeat(8)).success, true)
})

test('enforces bcrypt maximum in UTF-8 bytes', () => {
  for (const password of ['a'.repeat(72), 'é'.repeat(36), '😀'.repeat(18)]) {
    assert.equal(passwordSchema.safeParse(password).success, true)
  }
  for (const password of ['a'.repeat(73), 'é'.repeat(37), '😀'.repeat(19)]) {
    assert.equal(passwordSchema.safeParse(password).success, false)
  }
})

test('preserves password spaces and symbols', () => {
  const password = '  Clave!123  '
  assert.equal(passwordSchema.parse(password), password)
})

test('reports email and password errors together for submission', () => {
  const result = authSchema.safeParse({ email: 'texto', password: '123', rememberMe: false })
  assert.equal(result.success, false)
  if (!result.success) {
    const errors = z.flattenError(result.error).fieldErrors
    assert.ok(errors.email?.length)
    assert.ok(errors.password?.length)
  }
})

test('validates name and lastName with length and trimming constraints', () => {
  for (const empty of ['', '   ', 'Ana123', 'Perez!', '12345']) {
    assert.equal(nameSchema.safeParse(empty).success, false, empty)
    assert.equal(lastNameSchema.safeParse(empty).success, false, empty)
  }
  assert.equal(nameSchema.safeParse('a'.repeat(101)).success, false)
  assert.equal(lastNameSchema.safeParse('b'.repeat(101)).success, false)
  assert.equal(nameSchema.parse('  Ana María  '), 'Ana María')
  assert.equal(lastNameSchema.parse('  Pérez  '), 'Pérez')
})

test('validates registration schema and rejects mismatching passwords', () => {
  const validData = {
    name: 'Ana',
    lastName: 'Pérez',
    email: 'ana@example.com',
    password: 'password123',
    repeatedPassword: 'password123',
  }
  assert.equal(registerSchema.safeParse(validData).success, true)

  const mismatch = registerSchema.safeParse({
    ...validData,
    repeatedPassword: 'different-password',
  })
  assert.equal(mismatch.success, false)
  if (!mismatch.success) {
    const errors = z.flattenError(mismatch.error).fieldErrors
    assert.equal(errors.repeatedPassword?.[0], 'Las contraseñas no coinciden')
  }

  const missingAll = registerSchema.safeParse({
    name: '',
    lastName: '',
    email: 'invalido',
    password: '123',
    repeatedPassword: '',
  })
  assert.equal(missingAll.success, false)
  if (!missingAll.success) {
    const errors = z.flattenError(missingAll.error).fieldErrors
    assert.ok(errors.name?.length)
    assert.ok(errors.lastName?.length)
    assert.ok(errors.email?.length)
    assert.ok(errors.password?.length)
    assert.ok(errors.repeatedPassword?.length)
  }
})

