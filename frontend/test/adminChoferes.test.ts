import assert from 'node:assert/strict'
import { after, before, test } from 'node:test'
import { createElement, type ComponentType } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { MemoryRouter } from 'react-router-dom'
import { createServer, type ViteDevServer } from 'vite'

let server: ViteDevServer
let AdminChoferes: ComponentType

before(async () => {
  server = await createServer({
    configFile: false,
    server: { middlewareMode: true },
    appType: 'custom',
    ssr: { external: ['react', 'react/jsx-runtime', 'react-router-dom'] },
  })
  ;({ AdminChoferes } = await server.ssrLoadModule(
    '/src/components/AdminChoferes.tsx',
  ))
})

after(async () => server?.close())

test('renders the drivers module with summary and actions', () => {
  const html = renderToStaticMarkup(
    createElement(MemoryRouter, null, createElement(AdminChoferes)),
  )
  assert.match(html, /Choferes totales/)
  assert.match(html, /Listado de choferes/)
  assert.match(html, /Agregar chofer/)
  assert.match(html, /Nombre, DNI, tel/)
  assert.match(html, /Camión 01/)
  assert.match(html, /Asignar/)
  assert.match(html, /admin-drivers-assign-btn/)
  assert.match(html, /<th[^>]*>Fecha contrato<\/th>/)
  assert.match(html, /Sin fechas cargadas/)
  // Verifica que en choferes sin camión se muestra el botón en lugar del texto "Sin asignar"
  assert.doesNotMatch(html, /Sin asignar/)
  // Verifica que no hay selector de estado en el formulario
  assert.doesNotMatch(html, /id="admin-drivers-form-status-select"/)
})

test('muestra las fechas guardadas desde Camiones aunque no se haya abierto Choferes antes', () => {
  const original = Object.getOwnPropertyDescriptor(globalThis, 'localStorage')
  const camiones = [
    { code: 'Camión 01', assignedDriver: 'Carlos González', contrato: { inicio: '2026-11-21', fin: '2027-01-31' } },
    { code: 'Camión 02', assignedDriver: 'Miguel Rodríguez', contrato: { inicio: '2026-10-01' } },
  ]
  Object.defineProperty(globalThis, 'localStorage', {
    configurable: true,
    value: { getItem: (clave: string) => clave === 'ciudad-limpia:camiones' ? JSON.stringify(camiones) : null },
  })
  try {
    const html = renderToStaticMarkup(createElement(AdminChoferes))
    assert.match(html, /21\/11\/2026 al 31\/01\/2027/)
    assert.match(html, /Desde 01\/10\/2026 · Sin fecha de fin/)
    assert.match(html, /Carlos González/)
    assert.match(html, /Miguel Rodríguez/)
  } finally {
    if (original) Object.defineProperty(globalThis, 'localStorage', original)
    else Reflect.deleteProperty(globalThis, 'localStorage')
  }
})

test('muestra las fechas de varios conductores asignados a un mismo camión', () => {
  const original = Object.getOwnPropertyDescriptor(globalThis, 'localStorage')
  const camiones = [{
    code: 'Camión 01',
    conductores: [
      { nombre: 'Carlos González', contrato: { inicio: '2026-11-21', fin: '2027-01-31' } },
      { nombre: 'Miguel Rodríguez', contrato: { inicio: '2026-10-01' } },
    ],
  }]
  Object.defineProperty(globalThis, 'localStorage', {
    configurable: true,
    value: { getItem: (clave: string) => clave === 'ciudad-limpia:camiones' ? JSON.stringify(camiones) : null },
  })
  try {
    const html = renderToStaticMarkup(createElement(AdminChoferes))
    assert.match(html, /21\/11\/2026 al 31\/01\/2027/)
    assert.match(html, /Desde 01\/10\/2026 · Sin fecha de fin/)
  } finally {
    if (original) Object.defineProperty(globalThis, 'localStorage', original)
    else Reflect.deleteProperty(globalThis, 'localStorage')
  }
})
