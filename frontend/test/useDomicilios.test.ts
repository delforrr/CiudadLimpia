import assert from 'node:assert/strict'
import { after, before, beforeEach, test } from 'node:test'
import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { createServer, type ViteDevServer } from 'vite'

let server: ViteDevServer
let useDomicilios: typeof import('../src/hooks/useDomicilios.ts').useDomicilios

before(async () => {
  server = await createServer({
    configFile: false,
    server: { middlewareMode: true },
    appType: 'custom',
    ssr: { external: ['react', 'react/jsx-runtime'] },
  })
  ;({ useDomicilios } = await server.ssrLoadModule('/src/hooks/useDomicilios.ts'))
})

after(async () => server?.close())

// Mock simple in-memory localStorage for Node test runner
const memoryStore: Record<string, string> = {}
const mockLocalStorage = {
  getItem: (key: string) => memoryStore[key] ?? null,
  setItem: (key: string, val: string) => { memoryStore[key] = String(val) },
  removeItem: (key: string) => { delete memoryStore[key] },
  clear: () => { Object.keys(memoryStore).forEach((k) => delete memoryStore[k]) },
}

beforeEach(() => {
  mockLocalStorage.clear()
  Object.defineProperty(globalThis, 'localStorage', {
    value: mockLocalStorage,
    configurable: true,
    writable: true,
  })
})

test('starts with 0 addresses and no fake defaults for a new user', () => {
  let hookResult: ReturnType<typeof useDomicilios> | undefined

  function Consumer() {
    hookResult = useDomicilios('user_123')
    return null
  }

  renderToStaticMarkup(createElement(Consumer))

  assert.ok(hookResult)
  assert.equal(hookResult.domicilios.length, 0)
  assert.equal(hookResult.domicilioPrincipal, null)
})

test('ignores and cleans up legacy fake hardcoded address', () => {
  mockLocalStorage.setItem('ciudad_limpia_dir_user_legacy', 'Av. Las Palmas 450 · Barrio Los Olivos')

  let hookResult: ReturnType<typeof useDomicilios> | undefined

  function Consumer() {
    hookResult = useDomicilios('user_legacy')
    return null
  }

  renderToStaticMarkup(createElement(Consumer))

  assert.ok(hookResult)
  assert.equal(hookResult.domicilios.length, 0)
  assert.equal(hookResult.domicilioPrincipal, null)
  assert.equal(mockLocalStorage.getItem('ciudad_limpia_dir_user_legacy'), null)
})

test('loads existing valid domicilios from localStorage', () => {
  const existing = [
    { id: '1', direccion: 'Villegas 100', etiqueta: 'Casa', esPrincipal: true },
    { id: '2', direccion: 'Rivadavia 200', etiqueta: 'Trabajo', esPrincipal: false },
  ]
  mockLocalStorage.setItem('ciudad_limpia_domicilios_user_456', JSON.stringify(existing))

  let hookResult: ReturnType<typeof useDomicilios> | undefined

  function Consumer() {
    hookResult = useDomicilios('user_456')
    return null
  }

  renderToStaticMarkup(createElement(Consumer))

  assert.ok(hookResult)
  assert.equal(hookResult.domicilios.length, 2)
  assert.equal(hookResult.domicilioPrincipal?.direccion, 'Villegas 100')
})
