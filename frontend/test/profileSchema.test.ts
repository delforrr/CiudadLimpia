import assert from 'node:assert/strict'
import { test } from 'node:test'
import { nuevoDomicilioSchema, profileSchema, profileUpdateSchema } from '../src/schemas/profileSchema.ts'

const profile = { name: ' Ana ', lastName: ' Pérez ', email: ' ANA@example.com ',
  domicilios: [{ id: 'domicilio-1', direccion: ' San Martín 123 ', etiqueta: ' Casa ' }, { direccion: ' Belgrano 456 ' }] }

test('validates a new address before returning to the profile editor', () => {
  assert.equal(nuevoDomicilioSchema.safeParse({ calle: ' ', altura: '456' }).success, false)
  assert.equal(nuevoDomicilioSchema.safeParse({ calle: 'Belgrano', altura: 'abc' }).success, false)
  assert.equal(nuevoDomicilioSchema.safeParse({ calle: 'Belgrano', altura: '0' }).success, false)
  assert.equal(nuevoDomicilioSchema.safeParse({ calle: 'a'.repeat(197), altura: '456' }).success, false)
  assert.deepEqual(nuevoDomicilioSchema.parse({ calle: ' Belgrano ', altura: ' 456 ', etiqueta: ' Casa ' }), {
    direccion: 'Belgrano 456', frente: { calle: 'Belgrano', altura: 456 }, etiqueta: 'Casa',
  })
})

test('sends the existing address ID and the confirmed pin of the new address', () => {
  const id = '7a1487dd-134a-4020-abc0-0966fa38f447'
  const guardado = { ...profile.domicilios[0], id }
  const nuevo = nuevoDomicilioSchema.parse({ calle: 'Belgrano', altura: '456' })
  const ubicacion = { lat: -35.97, long: -62.73 }
  assert.deepEqual(profileUpdateSchema.parse({ ...profile, domicilios: [guardado, { ...nuevo, ubicacion }] }).domicilios, [
    { direccionId: id, etiqueta: 'Casa' },
    { direccion: { calle: 'Belgrano', altura: 456, ...ubicacion }, etiqueta: undefined },
  ])
  assert.equal(profileUpdateSchema.safeParse({ ...profile, domicilios: [guardado, nuevo] }).success, false)
})

test('normalizes the profile and omits form IDs from the API payload', () => {
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

test('accepts addresses without labels and allows clearing an existing label', () => {
  for (const etiqueta of [undefined, null, '']) {
    const domicilios = [{ direccion: 'San Martín 123', etiqueta }]
    assert.equal(profileSchema.safeParse({ ...profile, domicilios }).success, true)
  }
})
