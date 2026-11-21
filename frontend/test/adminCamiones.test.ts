import assert from 'node:assert/strict'
import { after, before, test } from 'node:test'
import { createElement, type ComponentType } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { MemoryRouter } from 'react-router-dom'
import { createServer, type ViteDevServer } from 'vite'

let server: ViteDevServer
let AdminCamiones: ComponentType

before(async () => {
  server = await createServer({
    configFile: false,
    server: { middlewareMode: true },
    appType: 'custom',
    ssr: { external: ['react', 'react/jsx-runtime', 'react-router-dom'] },
  })
  ;({ AdminCamiones } = await server.ssrLoadModule(
    '/src/components/AdminCamiones.tsx',
  ))
})

after(async () => server?.close())

test('renders the trucks module with class diagram fields, buttons and sample data', () => {
  const html = renderToStaticMarkup(
    createElement(MemoryRouter, null, createElement(AdminCamiones)),
  )
  assert.match(html, /Camiones totales/)
  assert.match(html, /Operativos/)
  assert.match(html, /En mantenimiento/)
  assert.match(html, /Flota de camiones/)
  assert.match(html, /Agregar camión/)
  assert.match(html, /Unidad \/ Patente/)
  assert.match(html, /Marca/)
  assert.match(html, /Modelo/)
  assert.match(html, /Año/)
  assert.match(html, /Conductor/)

  assert.doesNotMatch(html, /<th[^>]*>Zona[^<]*<\/th>/i)
  assert.match(html, /<th[^>]*>Trayectos<\/th>/i)
  assert.match(html, /aria-label="Asignar trayectos a Camión 01"/)

  // Datos alineados con el diagrama
  assert.match(html, /Camión 01/)
  assert.match(html, /AE 123 CD/)
  assert.match(html, /Iveco/)
  assert.match(html, /Tector 170E28/)
  assert.match(html, /2022/)
  assert.match(html, /Carlos González/)

  // Formato alineado con los demás apartados
  assert.match(html, /admin-trucks-count/)
  assert.match(html, /admin-trucks-marker/)
  assert.match(html, /admin-trucks-assign-btn/)
  assert.doesNotMatch(html, /<span class="admin-trucks-muted">Sin asignar<\/span>/)

  // Botones de acción operativos
  assert.match(html, /aria-label="Ver detalle de Camión 01"/)
  assert.match(html, /aria-label="Editar Camión 01"/)
  assert.match(html, /aria-label="Eliminar Camión 01"/)
  assert.doesNotMatch(html, /Esqueleto base/)
})

test('el número de trayectos de la tabla es un botón que abre la asignación', () => {
  const clave = 'ciudad-limpia:camiones'
  const unidades = [1, 2].map((cantidad) => ({
    id: String(cantidad),
    code: `Unidad ${cantidad}`,
    plate: 'AE 123 CD',
    brand: 'Iveco',
    model: 'Tector',
    year: 2022,
    assignedDriver: 'Sin asignar',
    status: 'OPERATIVO',
    trayectos: Array.from({ length: cantidad }, (_, indice) => ({
      id: `ruta-${indice}`, name: `Ruta ${indice}`,
    })),
  }))
  const original = Object.getOwnPropertyDescriptor(globalThis, 'localStorage')
  Object.defineProperty(globalThis, 'localStorage', {
    configurable: true,
    value: { getItem: (key: string) => key === clave ? JSON.stringify(unidades) : null },
  })

  try {
    const html = renderToStaticMarkup(createElement(AdminCamiones))
    assert.match(html, /<button[^>]*aria-label="Gestionar trayectos de Unidad 1"[^>]*>[\s\S]*?1 trayecto[\s\S]*?<\/button>/)
    assert.match(html, /<button[^>]*aria-label="Gestionar trayectos de Unidad 2"[^>]*>[\s\S]*?2 trayectos[\s\S]*?<\/button>/)
    assert.doesNotMatch(html, /aria-label="Asignar trayectos a Unidad/)
  } finally {
    if (original) Object.defineProperty(globalThis, 'localStorage', original)
    else Reflect.deleteProperty(globalThis, 'localStorage')
  }
})

test('oculta el botón de asignar conductor en la tabla si la unidad ya tiene conductores', () => {
  const clave = 'ciudad-limpia:camiones'
  const base = {
    plate: 'AE 123 CD',
    brand: 'Iveco',
    model: 'Tector',
    year: 2022,
    status: 'OPERATIVO',
    trayectos: [],
  }
  const unidades = [
    { ...base, id: '1', code: 'Con conductor', conductores: [{ nombre: 'Ana Pérez' }] },
    { ...base, id: '2', code: 'Sin conductor', conductores: [] },
  ]
  const original = Object.getOwnPropertyDescriptor(globalThis, 'localStorage')
  Object.defineProperty(globalThis, 'localStorage', {
    configurable: true,
    value: { getItem: (key: string) => key === clave ? JSON.stringify(unidades) : null },
  })

  try {
    const html = renderToStaticMarkup(createElement(AdminCamiones))
    assert.doesNotMatch(html, /aria-label="Asignar conductor a Con conductor"/)
    assert.match(html, /aria-label="Asignar conductor a Sin conductor"/)
  } finally {
    if (original) Object.defineProperty(globalThis, 'localStorage', original)
    else Reflect.deleteProperty(globalThis, 'localStorage')
  }
})
