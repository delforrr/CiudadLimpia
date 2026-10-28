import assert from 'node:assert/strict'
import { test } from 'node:test'
import { driverSchema } from '../src/schemas/driverSchema.ts'

test('validates and normalizes driver data', () => {
  const result = driverSchema.parse({
    firstName: ' Carlos ',
    lastName: ' González ',
    dni: ' 28456789 ',
    phone: ' 02392-456789 ',
    status: 'ACTIVO',
    assignedTruck: ' Camión 01 ',
  })

  assert.equal(result.firstName, 'Carlos')
  assert.equal(result.lastName, 'González')
  assert.equal(result.assignedTruck, 'Camión 01')
})

test('rejects invalid driver data', () => {
  const base = {
    firstName: 'Carlos',
    lastName: 'González',
    dni: '28456789',
    phone: '02392456789',
    status: 'ACTIVO' as const,
  }

  for (const change of [
    { firstName: '' },
    { lastName: '' },
    { dni: 'abc' },
    { phone: 'abc' },
    { status: 'OTRO' },
  ]) {
    assert.equal(
      driverSchema.safeParse({ ...base, ...change }).success,
      false,
      JSON.stringify(change),
    )
  }

  assert.equal(
    driverSchema.safeParse({ ...base, assignedTruck: '' }).success,
    true,
  )
})
