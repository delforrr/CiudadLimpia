import assert from 'node:assert/strict'
import { test } from 'node:test'
import { formatoContrato, validarContrato } from '../src/utils/contratoConductor.ts'

test('el contrato exige inicio y permite omitir fin', () => {
  assert.ok(validarContrato('', '').inicio)
  assert.deepEqual(validarContrato('2026-11-21', ''), {})
  assert.ok(validarContrato('2026-11-21', '2026-11-21').fin)
  assert.deepEqual(validarContrato('2026-11-21', '2027-01-01'), {})
})

test('rechaza fin anterior al inicio y fechas imposibles', () => {
  assert.ok(validarContrato('2026-11-21', '2026-11-20').fin)
  assert.ok(validarContrato('2026-02-30', '').inicio)
  assert.ok(validarContrato('2026-11-21', '2027-02-29').fin)
  assert.ok(validarContrato('21/11/2026', '').inicio)
  assert.deepEqual(validarContrato('2028-02-29', ''), {})
})

test('muestra las fechas del contrato sin desplazar el día por zona horaria', () => {
  assert.equal(formatoContrato(), 'Sin fechas cargadas')
  assert.equal(formatoContrato({ inicio: '2026-11-21' }), 'Desde 21/11/2026 · Sin fecha de fin')
  assert.equal(formatoContrato({ inicio: '2026-11-21', fin: '2027-01-01' }), '21/11/2026 al 01/01/2027')
})
