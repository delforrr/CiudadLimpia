import assert from 'node:assert/strict'
import { test } from 'node:test'
import {
  actualizarAsignacion, asignacionesCamion, asignarConductor, formatoContrato,
  quitarConductor, validarContrato, type ContratoConductor,
} from '../src/utils/contratoConductor.ts'
import { driverSchema } from '../src/schemas/driverSchema.ts'

test('el contrato exige inicio y permite omitir fin o usar el mismo día', () => {
  assert.ok(validarContrato('', '').inicio)
  assert.deepEqual(validarContrato('2026-11-21', ''), {})
  assert.deepEqual(validarContrato('2026-11-21', '2026-11-21'), {})
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

test('el formulario de chofer requiere fechas solamente si asigna una unidad', () => {
  const base = { firstName: 'Ana', lastName: 'Pérez', dni: '12345678', phone: '02392456789' }
  assert.equal(driverSchema.safeParse(base).success, true)
  assert.equal(driverSchema.safeParse({ ...base, assignedTruck: 'Camión 01' }).success, false)
  assert.equal(driverSchema.safeParse({ ...base, assignedTruck: 'Camión 01', inicio: '2026-11-21' }).success, true)
  const invalido = driverSchema.safeParse({ ...base, assignedTruck: 'Camión 01', inicio: '2026-11-21', fin: '2026-11-20' })
  assert.equal(invalido.success, false)
  if (!invalido.success) assert.ok(invalido.error.issues.some((issue) => issue.path[0] === 'fin'))
})

test('reasignar un conductor conserva solo el contrato de la nueva unidad', () => {
  const anterior: { id: string; assignedDriver: string; contrato?: ContratoConductor; trayectos: string[] } = {
    id: '1', assignedDriver: 'Ana Pérez', contrato: { inicio: '2026-01-01' }, trayectos: ['ruta-1'],
  }
  const nueva: typeof anterior = { id: '2', assignedDriver: 'Sin asignar', trayectos: ['ruta-2'] }
  const actualizada = { ...nueva, assignedDriver: 'Ana Pérez', contrato: { inicio: '2026-11-21' } }
  const resultado = actualizarAsignacion([anterior, nueva], actualizada)
  assert.equal(resultado[0].assignedDriver, 'Sin asignar')
  assert.equal(resultado[0].contrato, undefined)
  assert.deepEqual(resultado[0].trayectos, ['ruta-1'])
  assert.deepEqual(resultado[1], actualizada)
  assert.equal(anterior.assignedDriver, 'Ana Pérez')
})

test('un camión admite varios conductores con fechas de contrato', () => {
  type Camion = { id: string; code: string; conductores?: { nombre: string; contrato?: ContratoConductor }[] }
  const camion: Camion = { id: '1', code: 'Camión 01', conductores: [] }
  const flota = asignarConductor([camion], camion, 'Ana Pérez', { inicio: '2026-11-21' })
  const conDos = asignarConductor(flota, flota[0], 'Luis Gómez', { inicio: '2026-12-01', fin: '2027-01-31' })
  const asignaciones = asignacionesCamion(conDos[0])

  assert.equal(asignaciones.length, 2)
  assert.equal(asignaciones[0].nombre, 'Ana Pérez')
  assert.deepEqual(asignaciones[0].contrato, { inicio: '2026-11-21' })
  assert.deepEqual(asignaciones[1].contrato, { inicio: '2026-12-01', fin: '2027-01-31' })
  assert.equal(formatoContrato(asignaciones[0].contrato), 'Desde 21/11/2026 · Sin fecha de fin')
  assert.equal(formatoContrato(asignaciones[1].contrato), '01/12/2026 al 31/01/2027')
})

test('reasignar un conductor actualiza su contrato sin duplicarlo', () => {
  type Camion = { id: string; conductores?: { nombre: string; contrato?: ContratoConductor }[] }
  const camion: Camion = { id: '1', conductores: [{ nombre: 'Ana Pérez', contrato: { inicio: '2026-01-01' } }] }
  const resultado = asignarConductor([camion], camion, 'Ana Pérez', { inicio: '2026-11-21', fin: '2026-12-31' })
  assert.deepEqual(asignacionesCamion(resultado[0]), [
    { nombre: 'Ana Pérez', contrato: { inicio: '2026-11-21', fin: '2026-12-31' } },
  ])
})

test('quitar un conductor no afecta a los demás', () => {
  type Camion = { id: string; conductores?: { nombre: string; contrato?: ContratoConductor }[] }
  const camion: Camion = { id: '1', conductores: [
    { nombre: 'Ana Pérez', contrato: { inicio: '2026-11-21' } },
    { nombre: 'Luis Gómez', contrato: { inicio: '2026-12-01' } },
  ] }
  const resultado = quitarConductor([camion], '1', 'Ana Pérez')
  assert.deepEqual(asignacionesCamion(resultado[0]), [
    { nombre: 'Luis Gómez', contrato: { inicio: '2026-12-01' } },
  ])
})

test('lee asignaciones guardadas con el formato anterior de un solo conductor', () => {
  const resultado = asignacionesCamion({
    assignedDriver: 'Ana Pérez', contrato: { inicio: '2026-11-21', fin: '2027-01-01' },
  })
  assert.deepEqual(resultado, [
    { nombre: 'Ana Pérez', contrato: { inicio: '2026-11-21', fin: '2027-01-01' } },
  ])
})
