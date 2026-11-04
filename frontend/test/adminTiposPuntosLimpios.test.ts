import assert from 'node:assert/strict'
import { after, before, test } from 'node:test'
import { createElement, type ComponentType } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { MemoryRouter } from 'react-router-dom'
import { createServer, type ViteDevServer } from 'vite'

let server: ViteDevServer
let AdminTiposPuntosLimpios: ComponentType

before(async () => {
  server = await createServer({
    configFile: false,
    server: { middlewareMode: true },
    appType: 'custom',
    ssr: { external: ['react', 'react/jsx-runtime', 'react-router-dom'] },
  })
  ;({ AdminTiposPuntosLimpios } = await server.ssrLoadModule(
    '/src/components/AdminTiposPuntosLimpios.tsx',
  ))
})

after(async () => server?.close())

test('renders the clean point types module with summary and CRUD actions', () => {
  const html = renderToStaticMarkup(
    createElement(
      MemoryRouter,
      null,
      createElement(AdminTiposPuntosLimpios),
    ),
  )
  assert.match(html, /Tipos de puntos/)
  assert.match(html, /Materiales registrados/)
  assert.match(html, /Puntos asignados/)
  assert.match(html, /Tipos de puntos limpios/)
  assert.match(html, /Agregar tipo/)
  assert.match(html, /Punto Limpio/)
  assert.match(html, /Botellero/)
  assert.match(html, /Latero/)
  assert.match(html, /Materiales/)
  assert.match(html, /Puntos asociados/)
  assert.match(html, /Plásticos/)
  // Muestra los logos de puntos limpios existentes
  assert.match(html, /admin-types-marker-img/)
  // Verifica que ya no muestra el esqueleto base
  assert.doesNotMatch(html, /Esqueleto base/)
})
