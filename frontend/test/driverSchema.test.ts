import assert from 'node:assert/strict'
import { test } from 'node:test'
import { driverSchema } from '../src/schemas/driverSchema.ts'

test('valida los campos del DTO del conductor y conserva el estado explícito', () => {
  const base = { nombre: ' Zoë ', apellido: ' Gómez ', activo: false }
  assert.deepEqual(driverSchema.parse(base), { nombre: 'Zoë', apellido: 'Gómez', activo: false })

  for (const cambio of [{ nombre: ' ' }, { apellido: 'x'.repeat(101) }, { activo: 'true' }]) {
    assert.equal(driverSchema.safeParse({ ...base, ...cambio }).success, false)
  }
})
