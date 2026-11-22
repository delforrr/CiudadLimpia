import assert from 'node:assert/strict'
import { test } from 'node:test'
import { tipoPuntoLimpioSchema } from '../src/schemas/tipoPuntoLimpioSchema.ts'

const BASE = {
  nombre: 'Punto Limpio',
  materiales: ['Plásticos', 'Cartón', 'Vidrio'],
}

test('validates and normalizes a clean point type', () => {
  const result = tipoPuntoLimpioSchema.parse({
    nombre: '  Punto Limpio  ',
    materiales: [' Plásticos ', ' Cartón '],
    logo: 'data:image/png;base64,sample',
  })

  assert.equal(result.nombre, 'Punto Limpio')
  assert.deepEqual(result.materiales, ['Plásticos', 'Cartón'])
  assert.equal(result.logo, 'data:image/png;base64,sample')
})

test('rejects invalid clean point types', () => {
  for (const change of [
    { nombre: '' },
    { nombre: 'a'.repeat(51) },
    { materiales: [] },
    { materiales: [''] },
    { materiales: ['a'.repeat(51)] },
    { colorFondo: 'red' },
    { colorFondo: '#123' },
    { colorFondo: '#zzzzzz' },
    {
      materiales: Array.from({ length: 21 }, (_, index) => `Material ${index}`),
    },
  ]) {
    assert.equal(
      tipoPuntoLimpioSchema.safeParse({ ...BASE, ...change }).success,
      false,
      JSON.stringify(change),
    )
  }
})

test('accepts a custom background and does not expose a symbol color setting', () => {
  const result = tipoPuntoLimpioSchema.parse({ ...BASE, colorFondo: '#36cc00', colorIcono: '#000000' })
  assert.equal(result.colorFondo, '#36cc00')
  assert.equal('colorIcono' in result, false)
})
