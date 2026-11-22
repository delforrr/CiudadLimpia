import assert from 'node:assert/strict'
import { test } from 'node:test'
import { puntoLimpioSchema } from '../src/schemas/puntoLimpioSchema.ts'

const BASE = {
  nombre: 'Punto Limpio Barrio Esperanza',
  tipoId: 'PUNTO_LIMPIO',
  direccion: 'Freyre 1200',
  estado: 'ACTIVO' as const,
}

test('validates and normalizes clean point data', () => {
  const result = puntoLimpioSchema.parse({
    ...BASE,
    nombre: '  Punto Limpio Barrio Esperanza  ',
    tipoId: '  PUNTO_LIMPIO  ',
    direccion: '  Freyre 1200  ',
  })

  assert.equal(result.nombre, 'Punto Limpio Barrio Esperanza')
  assert.equal(result.tipoId, 'PUNTO_LIMPIO')
  assert.equal(result.direccion, 'Freyre 1200')
})

test('accepts both states', () => {
  for (const estado of ['ACTIVO', 'INACTIVO']) {
    assert.equal(
      puntoLimpioSchema.safeParse({ ...BASE, estado }).success,
      true,
      estado,
    )
  }
})

test('rejects invalid clean point data', () => {
  for (const change of [
    { nombre: '' },
    { nombre: 'a'.repeat(101) },
    { tipoId: '' },
    { direccion: '' },
    { direccion: 'a'.repeat(201) },
    { estado: 'OTRO' },
  ]) {
    assert.equal(
      puntoLimpioSchema.safeParse({ ...BASE, ...change }).success,
      false,
      JSON.stringify(change),
    )
  }
})
