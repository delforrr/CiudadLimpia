import assert from 'node:assert/strict'
import { after, before, test } from 'node:test'
import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { createServer, type ViteDevServer } from 'vite'

let server: ViteDevServer
type LogoModule = {
  APP_LOGOS_PUNTOS_LIMPIOS: { id: string; src: string }[]
  DEFAULT_TIPO_LOGOS: Record<string, string>
  resolvePuntoLimpioLogo: (logo?: string, tipoId?: string, nombre?: string) => string | undefined
  puntoLimpioIconSrc: (logo?: string, colorFondo?: string) => string
}
type StoredTipo = { id: string; nombre: string; materiales: string[]; logo?: string; colorFondo?: string }
let logos: LogoModule
let storage: { loadTipos: () => StoredTipo[]; saveTipos: (tipos: StoredTipo[]) => void }
let useMapIcons: () => Record<string, string>

before(async () => {
  server = await createServer({
    configFile: false,
    server: { middlewareMode: true },
    appType: 'custom',
    ssr: { external: ['react', 'react/jsx-runtime'] },
  })
  logos = await server.ssrLoadModule('/src/utils/puntosLimpiosLogos.ts') as LogoModule
  storage = await server.ssrLoadModule('/src/utils/puntosLimpiosStorage.ts') as typeof storage
  ;({ usePuntosLimpiosMapIcons: useMapIcons } = await server.ssrLoadModule(
    '/src/hooks/usePuntosLimpiosMapIcons.ts',
  ))
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

test('replaces saved inline SVG copies and preserves all four types and their materials', () => {
  const original = Object.getOwnPropertyDescriptor(globalThis, 'localStorage')
  const oldSvg = '<svg xmlns="http://www.w3.org/2000/svg"><path fill="black" d="M1 1h10v10H1z"/></svg>'
  const inline = `data:image/svg+xml,${encodeURIComponent(oldSvg)}`
  const inlineBase64 = `data:image/svg+xml;base64,${Buffer.from(oldSvg).toString('base64')}`
  const previous: StoredTipo[] = [
    { id: 'BOTELLERO', nombre: 'Botellero', materiales: ['Botellas de Plástico', 'Botellas de Vidrio'], logo: inline },
    { id: 'LATERO', nombre: 'Latero', materiales: ['Latas de aluminio'], logo: inlineBase64 },
    { id: 'tipo-pilero', nombre: 'Pilero', materiales: ['Pilas', 'Baterias'], logo: inline },
    { id: 'PUNTO_LIMPIO', nombre: 'Punto Limpio', materiales: ['Plásticos', 'Cartón', 'Papel'], logo: inline },
  ]
  let persisted = JSON.stringify(previous)
  Object.defineProperty(globalThis, 'localStorage', {
    configurable: true,
    value: {
      getItem: () => persisted,
      setItem: (_key: string, value: string) => { persisted = value },
    },
  })

  try {
    const current = storage.loadTipos()
    const data = (tipo: StoredTipo) => ({ id: tipo.id, nombre: tipo.nombre, materiales: tipo.materiales })
    assert.deepEqual(current.map(data), previous.map(data))
    assert.deepEqual(current.map((tipo) => tipo.logo), [
      logos.DEFAULT_TIPO_LOGOS.BOTELLERO,
      logos.DEFAULT_TIPO_LOGOS.LATERO,
      logos.APP_LOGOS_PUNTOS_LIMPIOS.find(({ id }) => id === 'pilas')!.src,
      logos.DEFAULT_TIPO_LOGOS.PUNTO_LIMPIO,
    ])

    storage.saveTipos(current)
    assert.deepEqual(JSON.parse(persisted).map((tipo: StoredTipo) => tipo.logo), [
      'botellero', 'latero', 'pilas', 'punto-limpio',
    ])
    assert.deepEqual(storage.loadTipos(), current)
  } finally {
    if (original) Object.defineProperty(globalThis, 'localStorage', original)
    else Reflect.deleteProperty(globalThis, 'localStorage')
  }
})

test('preserves the chosen preset when it is already stored as a stable ID or a current inline SVG', () => {
  for (const preset of logos.APP_LOGOS_PUNTOS_LIMPIOS) {
    assert.equal(logos.resolvePuntoLimpioLogo(preset.id, 'BOTELLERO'), preset.src)
    assert.equal(logos.resolvePuntoLimpioLogo(preset.src, 'BOTELLERO'), preset.src)
  }
})

test('the map uses the icon saved by the administrator and keeps default icons for other types', () => {
  const original = Object.getOwnPropertyDescriptor(globalThis, 'localStorage')
  const selected = logos.APP_LOGOS_PUNTOS_LIMPIOS.find(({ id }) => id === 'textiles')!.src
  Object.defineProperty(globalThis, 'localStorage', {
    configurable: true,
    value: {
      getItem: () => JSON.stringify([
        { id: 'PUNTO_LIMPIO', nombre: 'Punto Limpio', materiales: ['Ropa'], logo: '/assets/icono-textiles-old123.svg', colorFondo: '#36cc00' },
      ]),
    },
  })

  try {
    assert.equal(storage.loadTipos()[0].logo, selected)
    let result: ReturnType<typeof useMapIcons> | undefined
    function Probe() {
      result = useMapIcons()
      return null
    }
    renderToStaticMarkup(createElement(Probe))
    assert.equal(result?.['punto-limpio'], logos.puntoLimpioIconSrc(selected, '#36cc00'))
    assert.equal(result?.botellero, logos.DEFAULT_TIPO_LOGOS.BOTELLERO)
    assert.equal(result?.['botellero-latero'], logos.DEFAULT_TIPO_LOGOS.LATERO)
  } finally {
    if (original) Object.defineProperty(globalThis, 'localStorage', original)
    else Reflect.deleteProperty(globalThis, 'localStorage')
  }
})

test('persists a custom background with a stable icon ID and restores both', () => {
  const original = Object.getOwnPropertyDescriptor(globalThis, 'localStorage')
  let saved = ''
  Object.defineProperty(globalThis, 'localStorage', {
    configurable: true,
    value: {
      getItem: () => saved,
      setItem: (_key: string, value: string) => { saved = value },
    },
  })
  try {
    storage.saveTipos([{ id: 'BOTELLERO', nombre: 'Botellero', materiales: ['Vidrio'], logo: logos.DEFAULT_TIPO_LOGOS.BOTELLERO, colorFondo: '#36cc00' }])
    assert.equal(JSON.parse(saved)[0].logo, 'botellero')
    assert.equal(storage.loadTipos()[0].colorFondo, '#36cc00')
    assert.equal(storage.loadTipos()[0].logo, logos.DEFAULT_TIPO_LOGOS.BOTELLERO)
  } finally {
    if (original) Object.defineProperty(globalThis, 'localStorage', original)
    else Reflect.deleteProperty(globalThis, 'localStorage')
  }
})
