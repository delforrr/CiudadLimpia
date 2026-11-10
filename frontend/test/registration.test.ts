import assert from 'node:assert/strict'
import { after, before, test } from 'node:test'
import { createElement, type ComponentType } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { MemoryRouter } from 'react-router-dom'
import { createServer, type ViteDevServer } from 'vite'
import { registerSchema } from '../src/schemas/registerSchema.ts'
import type { User } from '../src/services/authService.ts'
import type { DomicilioForm } from '../src/schemas/profileSchema.ts'

let server: ViteDevServer
let PerfilPage: ComponentType<{ initialRegister?: boolean }>
let HoyDomicilio: ComponentType<{ user: User }>
let DomiciliosCard: ComponentType<{
  domicilios: DomicilioForm[]; onChange: () => void; readOnly?: boolean; expanded?: boolean
}>
let AuthContext: typeof import('../src/context/auth-context.ts').AuthContext

before(async () => {
  server = await createServer({
    configFile: false,
    server: { middlewareMode: true },
    appType: 'custom',
    ssr: { external: ['react', 'react/jsx-runtime', 'react-router-dom', '@mui/material', '@mui/icons-material'] },
  })
  ;({ PerfilPage } = await server.ssrLoadModule('/src/pages/PerfilPage.tsx'))
  ;({ default: HoyDomicilio } = await server.ssrLoadModule('/src/components/HoyDomicilio.tsx'))
  ;({ default: DomiciliosCard } = await server.ssrLoadModule('/src/components/DomiciliosCard.tsx'))
  ;({ AuthContext } = await server.ssrLoadModule('/src/context/auth-context.ts'))
})
after(async () => server?.close())

function render(initialRegister = false, user: User | null = null, path = initialRegister ? '/registro' : '/perfil') {
  const session = { user, checking: false, isAuthenticated: user !== null,
    loggingOut: false, logoutError: '', onAuthenticated: () => {}, logout: async () => {} }
  return renderToStaticMarkup(createElement(AuthContext.Provider, { value: session },
    createElement(MemoryRouter, { initialEntries: [path] },
      createElement(PerfilPage, { initialRegister }))))
}

test('shows one current address in Hoy and opens the new address form directly from its link', () => {
  const user: User = { id: 'user-1', email: 'ana@example.com', role: 'USER',
    cliente: { id: 'cliente-1', name: 'Ana', lastName: 'Pérez',
      domicilios: [{ id: 'domicilio-1', direccion: 'san Martín 123' },
        { id: 'domicilio-2', direccion: 'Belgrano 456' }] } }
  const hoy = renderToStaticMarkup(createElement(MemoryRouter, { initialEntries: ['/hoy'] },
    createElement(HoyDomicilio, { user })))
  assert.match(hoy, /aria-haspopup="menu"/)
  assert.doesNotMatch(hoy, /Agregar domicilio/)
  assert.match(hoy, /San Martín 123/)
  assert.doesNotMatch(hoy, /Belgrano 456/)

  const perfil = render(false, user, '/perfil?nuevoDomicilio=1')
  assert.match(perfil, /<h2>Nuevo domicilio<\/h2>/)
  assert.match(perfil, /Agregar domicilio/)
  assert.doesNotMatch(perfil, /Guardar cambios/)
})

test('opens registration with all fields required by the current API', () => {
  const html = render(true)
  for (const label of ['Crear cuenta', 'Nombre', 'Apellido', 'Correo electrónico', 'Contraseña', 'Repetir contraseña']) {
    assert.ok(html.includes(label), label)
  }
  assert.match(html, /autoComplete="new-password"/)
  assert.doesNotMatch(html, /Recordarme|Ingresá tu nombre|Las contraseñas no coinciden|Mis domicilios|Dirección|Agregar domicilio/)
})

test('opens login separately without registration fields', () => {
  const html = render()
  assert.match(html, /Iniciar Sesión/)
  assert.match(html, /Recordarme/)
  assert.doesNotMatch(html, /Repetir contraseña|Mis domicilios|Etiqueta/)
})

test('keeps a single address hidden until its dropdown is opened', () => {
  const user: User = { id: 'user-1', email: 'ana@example.com', role: 'USER',
    cliente: { id: 'cliente-1', name: 'ángela María', lastName: 'pérez',
      domicilios: [{ id: 'domicilio-1', direccion: 'San Martín 123', etiqueta: 'Casa' }] } }
  const html = render(false, user)
  assert.match(html, /Ángela María Pérez/)
  assert.match(html, /ana@example\.com/)
  assert.match(html, /Mis domicilios/)
  assert.match(html, /aria-expanded="false"/)
  assert.doesNotMatch(html, /San Martín 123|Casa|Agregar domicilio/)
})

test('shows a collapsed dropdown when there are multiple addresses', () => {
  const user: User = { id: 'user-1', email: 'ana@example.com', role: 'USER',
    cliente: { id: 'cliente-1', name: 'Ana', lastName: 'Pérez',
      domicilios: [{ id: 'domicilio-1', direccion: 'San Martín 123', etiqueta: 'Casa' },
        { id: 'domicilio-2', direccion: 'Belgrano 456', etiqueta: 'Trabajo' }] } }
  const html = render(false, user)
  assert.match(html, /Mis domicilios/)
  assert.match(html, /aria-expanded="false"/)
  assert.doesNotMatch(html, /San Martín 123|Belgrano 456|Agregar domicilio/)
})

test('shows the edit action instead of an add button when there are no addresses', () => {
  const user: User = { id: 'user-1', email: 'ana@example.com', role: 'USER',
    cliente: { id: 'cliente-1', name: 'Ana', lastName: 'Pérez', domicilios: [] } }
  const html = render(false, user)
  assert.match(html, /Mis domicilios/)
  assert.match(html, /Completar mis datos/)
  assert.doesNotMatch(html, /Agregar domicilio/)
  assert.match(html, /aria-expanded="false"/)
})

test('hides addresses and the add button when the editor dropdown is closed', () => {
  const html = renderToStaticMarkup(createElement(DomiciliosCard, {
    domicilios: [{ id: 'domicilio-1', direccion: 'San Martín 123' }],
    onChange: () => {},
    readOnly: true,
    expanded: false,
  }))
  assert.match(html, /Mis domicilios/)
  assert.match(html, /aria-expanded="false"/)
  assert.doesNotMatch(html, /San Martín 123|Agregar domicilio/)
})

test('displays saved and new profile addresses above the add button when expanded', () => {
  const saved = { id: 'domicilio-1', direccion: 'san Martín 123', etiqueta: 'casa' }
  const html = renderToStaticMarkup(createElement(DomiciliosCard, {
    domicilios: [saved, { direccion: 'Belgrano 456', etiqueta: 'Trabajo' }],
    onChange: () => {},
    readOnly: true,
    expanded: true,
  }))
  assert.match(html, /aria-expanded="true"/)
  assert.match(html, /San Martín 123/)
  assert.match(html, /Casa/)
  assert.doesNotMatch(html, /id="(?:direccion|etiqueta)-\d+"/)
  assert.match(html, /Belgrano 456/)
  assert.match(html, /aria-label="Eliminar domicilio 1"/)
  assert.match(html, /Belgrano 456[\s\S]*Agregar domicilio/)
})

test('blocks adding another profile address until the current one is saved or discarded', () => {
  const saved = { id: 'domicilio-1', direccion: 'San Martín 123' }

  for (const draft of [undefined, { direccion: '' }, { direccion: 'Belgrano 456' }]) {
    const html = renderToStaticMarkup(createElement(DomiciliosCard, {
      domicilios: draft ? [saved, draft] : [saved],
      onChange: () => {},
      readOnly: true,
      expanded: true,
    }))
    const addButton = html.match(/<button\b[^>]*>Agregar domicilio/)
    assert.ok(addButton)
    assert.equal(/\sdisabled=""/.test(addButton[0]), Boolean(draft))
  }
})

test('validates registration fields together and normalizes the backend payload', () => {
  const form = { name: ' Ana ', lastName: ' Pérez ', email: ' ANA@example.com ',
    password: 'Clave!123', repeatedPassword: 'Clave!123', rememberMe: false }
  assert.deepEqual(registerSchema.parse(form), {
    name: 'Ana', lastName: 'Pérez', email: 'ana@example.com',
    password: 'Clave!123', repeatedPassword: 'Clave!123',
  })
  const invalid = registerSchema.safeParse({ ...form, name: ' ', lastName: ' ',
    email: 'inválido', repeatedPassword: 'otra' })
  assert.equal(invalid.success, false)
  if (!invalid.success) {
    assert.deepEqual(invalid.error.issues.map(({ path }) => path[0]).sort(),
      ['email', 'lastName', 'name', 'repeatedPassword'])
  }
})
