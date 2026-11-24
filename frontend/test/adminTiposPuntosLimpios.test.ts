import assert from 'node:assert/strict'
import { after, before, test } from 'node:test'
import { createElement, type ComponentType } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { MemoryRouter } from 'react-router-dom'
import type { ViteDevServer } from 'vite'
import { crearServidorPruebas } from './servidorPruebas.ts'
import { conLocalStorage, puntos, tipos } from './fixtures.ts'

let server: ViteDevServer
let AdminTiposPuntosLimpios: ComponentType

before(async () => {
  server = await crearServidorPruebas(['react', 'react/jsx-runtime', 'react-router-dom'])
  ;({ AdminTiposPuntosLimpios } = await server.ssrLoadModule(
    '/src/components/AdminTiposPuntosLimpios.tsx',
  ))
})

after(async () => server?.close())

test('ignora el catálogo local y espera la respuesta del servidor', () => {
  conLocalStorage({
    'ciudad-limpia:tipos-puntos-limpios': tipos,
    'ciudad-limpia:puntos-limpios': puntos,
  }, () => {
    const html = renderToStaticMarkup(
      createElement(
        MemoryRouter,
        null,
        createElement(AdminTiposPuntosLimpios),
      ),
    )
    assert.match(html, /Materiales registrados/)
    assert.match(html, /Cargando tipos/)
    assert.doesNotMatch(html, /Supermercado Cooperativa Obrera|Plásticos|Botellero/)
  })
})
