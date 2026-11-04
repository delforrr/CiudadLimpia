import assert from 'node:assert/strict'
import { after, before, test } from 'node:test'
import { createElement, type ComponentType } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { MemoryRouter } from 'react-router-dom'
import { createServer, type ViteDevServer } from 'vite'

let server: ViteDevServer
let AdminCamiones: ComponentType<{ onNavigateToTrayectos?: () => void }>

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
  let navigated = false
  const html = renderToStaticMarkup(
    createElement(MemoryRouter, null, createElement(AdminCamiones, {
      onNavigateToTrayectos: () => {
        navigated = true
      },
    })),
  )
  assert.equal(navigated, false)
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

  // Verifica que en los encabezados de la tabla NO dice Zona ni Trayecto
  assert.doesNotMatch(html, /<th[^>]*>Zona[^<]*<\/th>/i)
  assert.doesNotMatch(html, /<th[^>]*>Trayecto<\/th>/i)

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
