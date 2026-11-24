import assert from 'node:assert/strict'
import { after, before, test } from 'node:test'
import type { ViteDevServer } from 'vite'
import { crearServidorPruebas } from './servidorPruebas.ts'

let server: ViteDevServer
type LogoModule = {
  APP_LOGOS_PUNTOS_LIMPIOS: { id: string; src: string }[]
  DEFAULT_TIPO_LOGOS: Record<string, string>
  resolvePuntoLimpioLogo: (logo?: string, tipoId?: string, nombre?: string) => string | undefined
  puntoLimpioIconSrc: (logo?: string, colorFondo?: string) => string
}
let logos: LogoModule

before(async () => {
  server = await crearServidorPruebas(['react', 'react/jsx-runtime'])
  logos = await server.ssrLoadModule('/src/utils/puntosLimpiosLogos.ts') as LogoModule
})

after(async () => server?.close())

test('recovers the current SVG when a saved build URL is obsolete', () => {
  const expected = logos.APP_LOGOS_PUNTOS_LIMPIOS.find(({ id }) => id === 'pilas')!.src
  assert.equal(logos.resolvePuntoLimpioLogo('/assets/icono-pilas-old123.svg'), expected)
  assert.equal(logos.resolvePuntoLimpioLogo('/src/assets/icono-pilas.svg'), expected)
  assert.equal(logos.resolvePuntoLimpioLogo(undefined, 'BOTELLERO'), logos.DEFAULT_TIPO_LOGOS.BOTELLERO)
})

test('replaces unknown old image references with the current SVG for each type', () => {
  const oldReferences = [
    '/assets/botella-anterior.png',
    'https://example.com/old-recycle.svg',
    'data:image/png;base64,old-image',
    '/icono-punto-verde.png',
  ]
  for (const previous of oldReferences) {
    for (const id of ['BOTELLERO', 'LATERO', 'PUNTO_LIMPIO']) {
      assert.equal(logos.resolvePuntoLimpioLogo(previous, id), logos.DEFAULT_TIPO_LOGOS[id])
    }
  }
})

test('changes only the SVG background and always preserves the white symbol', () => {
  for (const preset of logos.APP_LOGOS_PUNTOS_LIMPIOS) {
    const colored = logos.puntoLimpioIconSrc(preset.id, '#36cc00')
    const svg = decodeURIComponent(colored.slice(colored.indexOf(',') + 1))
    assert.match(svg, /<circle[^>]+fill="#36cc00"/)
    assert.match(svg, /stroke="#ffffff"/)
    assert.doesNotMatch(svg, /stroke="#36cc00"/)
  }
})

test('preserves the chosen preset when it is already stored as a stable ID or a current inline SVG', () => {
  for (const preset of logos.APP_LOGOS_PUNTOS_LIMPIOS) {
    assert.equal(logos.resolvePuntoLimpioLogo(preset.id, 'BOTELLERO'), preset.src)
    assert.equal(logos.resolvePuntoLimpioLogo(preset.src, 'BOTELLERO'), preset.src)
  }
})
