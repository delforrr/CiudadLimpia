import assert from 'node:assert/strict'
import { test } from 'node:test'
import { cargarFlota, contratosPendientes, fechasContrato, flotaService } from '../src/services/flotaService.ts'

test('acepta listas vacías y propaga los errores del servidor', async (t) => {
  const urls: string[] = []
  const fetch = t.mock.method(globalThis, 'fetch', async (url: string) => {
    urls.push(url)
    return Response.json([])
  })
  assert.deepEqual(await cargarFlota(), { camiones: [], conductores: [], contratos: [] })
  assert.deepEqual(urls, ['/api/camiones', '/api/conductores', '/api/contratos-conductor'])
  fetch.mock.mockImplementation(async () => Response.json({ message: 'Acceso denegado' }, { status: 403 }))
  await assert.rejects(cargarFlota(), /Acceso denegado/)
})

test('archiva camiones y choferes cambiando solo su estado', async (t) => {
  const solicitudes: unknown[][] = []
  t.mock.method(globalThis, 'fetch', async (url: string, req: RequestInit) => {
    assert.equal(req.credentials, 'same-origin')
    assert.equal(new Headers(req.headers).get('Content-Type'), 'application/json')
    solicitudes.push([url, req.method, req.body && JSON.parse(String(req.body))])
    return Response.json({ id: 'id-servidor', ...JSON.parse(String(req.body)) })
  })

  const camion = { patente: 'AB 123 CD', marca: 'Iveco', modelo: 'Tector', anio: 2024, estado: 'ACTIVO' as const }
  const conductor = { nombre: 'Ana', apellido: 'Pérez', activo: true }
  assert.equal((await flotaService.guardarCamion(camion)).id, 'id-servidor')
  await flotaService.guardarCamion(camion, 'camion')
  await flotaService.archivarCamion('camion')
  assert.equal((await flotaService.guardarConductor(conductor)).id, 'id-servidor')
  await flotaService.guardarConductor(conductor, 'conductor')
  await flotaService.archivarConductor('conductor')
  assert.deepEqual(solicitudes, [
    ['/api/camiones', 'POST', camion],
    ['/api/camiones/camion', 'PATCH', camion],
    ['/api/camiones/camion', 'PATCH', { estado: 'INACTIVO' }],
    ['/api/conductores', 'POST', conductor],
    ['/api/conductores/conductor', 'PATCH', conductor],
    ['/api/conductores/conductor', 'PATCH', { activo: false }],
  ])
})

test('asigna por UUID y finaliza usando la fecha de inicio exacta del servidor', async (t) => {
  const base = { idCamion: 'camion', idConductor: 'conductor', fechaInicio: '2026-11-22T03:00:00.000Z' }
  const url = '/api/contratos-conductor'
  const fin = '2026-11-23T13:12:11.543Z'
  t.mock.method(globalThis, 'fetch', async (path: string, req: RequestInit) => {
    const datos = JSON.parse(String(req.body))
    if (req.method === 'POST') {
      assert.equal(path, url)
      assert.deepEqual(datos, { ...base, fechaInicio: '2026-11-22T00:00:00-03:00', fechaFin: null })
      return Response.json({ ...base, fechaFin: null })
    }
    assert.equal(req.method, 'PATCH')
    assert.equal(path, url + '/camion/conductor/' + encodeURIComponent(base.fechaInicio))
    assert.deepEqual(datos, { fechaFin: fin })
    return Response.json({ ...base, fechaFin: fin })
  })
  const asignado = await flotaService.asignar('camion', 'conductor', { inicio: '2026-11-22' })
  assert.equal((await flotaService.finalizar(asignado, fin)).fechaFin, fin)
})

test('separa períodos vencidos y muestra el día de Trenque Lauquen', () => {
  const ahora = Date.parse('2026-11-22T03:00:00Z')
  const base = { idCamion: 'camion', idConductor: 'conductor' }
  const vencido = { ...base, fechaInicio: '2026-11-21T03:00:00Z', fechaFin: '2026-11-22T03:00:00Z' }
  const vigente = { ...base, fechaInicio: '2026-11-22T03:00:00Z', fechaFin: '2026-11-24T00:30:00Z' }
  const futuro = { ...base, fechaInicio: '2026-11-24T03:00:00Z', fechaFin: null }

  assert.deepEqual(contratosPendientes([futuro, vencido, vigente], ahora), [vigente, futuro])
  assert.deepEqual(fechasContrato(vigente), { inicio: '2026-11-22', fin: '2026-11-23' })
})
