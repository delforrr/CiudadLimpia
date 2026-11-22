import assert from 'node:assert/strict'
import { after, before, test } from 'node:test'
import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { createServer, type ViteDevServer } from 'vite'

let server: ViteDevServer
let useMapaPuntosLimpios: () => { puntos: unknown[]; tipos: unknown[] }

before(async () => {
  server = await createServer({ configFile: false, server: { middlewareMode: true }, appType: 'custom',
    ssr: { external: ['react', 'react/jsx-runtime'] } })
  ;({ useMapaPuntosLimpios } = await server.ssrLoadModule('/src/hooks/useMapaPuntosLimpios.ts'))
})
after(async () => server?.close())

test('el mapa usa puntos activos y tipos guardados en administración', () => {
  const original = Object.getOwnPropertyDescriptor(globalThis, 'localStorage')
  const datos: Record<string, string> = {
    'ciudad-limpia:tipos-puntos-limpios': JSON.stringify([
      { id: 'pilas', nombre: 'Pilero', materiales: ['Pilas'], logo: 'pilas', colorFondo: '#cc0033' },
    ]),
    'ciudad-limpia:puntos-limpios': JSON.stringify([
      { id: '1', nombre: 'Nuevo', tipoId: 'pilas', direccion: 'Roca 123', estado: 'ACTIVO', lat: -35.97, lng: -62.73 },
      { id: '2', nombre: 'Cerrado', tipoId: 'pilas', direccion: 'Roca 124', estado: 'INACTIVO', lat: -35.97, lng: -62.73 },
      { id: '3', nombre: 'Sin ubicación', tipoId: 'pilas', direccion: 'Roca 125', estado: 'ACTIVO' },
    ]),
  }
  Object.defineProperty(globalThis, 'localStorage', { configurable: true, value: { getItem: (key: string) => datos[key] ?? null } })
  try {
    function Vista() {
      const { puntos, tipos } = useMapaPuntosLimpios()
      return createElement('p', null, JSON.stringify({ puntos, tipos }))
    }
    const html = renderToStaticMarkup(createElement(Vista))
    assert.match(html, /Nuevo/)
    assert.match(html, /Pilero/)
    assert.match(html, /Pilas/)
    assert.doesNotMatch(html, /Cerrado|Sin ubicación/)
  } finally {
    if (original) Object.defineProperty(globalThis, 'localStorage', original)
    else Reflect.deleteProperty(globalThis, 'localStorage')
  }
})
