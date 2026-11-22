import assert from 'node:assert/strict';
import { after, afterEach, before, test } from 'node:test';
import { createElement, type ComponentType } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { createServer, type ViteDevServer } from 'vite';
import type { useAdminTrayectos } from '../src/hooks/useAdminTrayectos.ts';
import type { CatalogoZonas } from '../src/services/zonasService.ts';

type Admin = ReturnType<typeof useAdminTrayectos>;
let server: ViteDevServer;
let AdminTrayectos: ComponentType<{ admin: Admin }>;
const storageOriginal = Object.getOwnPropertyDescriptor(globalThis, 'localStorage');

before(async () => {
  server = await createServer({ configFile: false, server: { middlewareMode: true, hmr: false }, appType: 'custom',
    ssr: { external: ['react', 'react/jsx-runtime'] } });
  ({ AdminTrayectos } = await server.ssrLoadModule('/src/components/AdminTrayectos.tsx'));
});
after(async () => server?.close());
afterEach(() => {
  if (storageOriginal) Object.defineProperty(globalThis, 'localStorage', storageOriginal);
  else Reflect.deleteProperty(globalThis, 'localStorage');
});

const localidad = { id: '06826050', nombre: 'Trenque Lauquen' };
const admin: Admin = {
  trayectos: [{ id: 'ruta-1', nombre: 'Recorrido 1', localidadId: localidad.id,
    geometria: { type: 'LineString', coordinates: [[-62.73, -35.97], [-62.74, -35.98]] }, puntos: [] }],
  localidades: [localidad], localidadFija: localidad, vista: { tipo: 'lista' }, cargando: false, error: '', aviso: '',
  abrir: async () => {}, cargar: () => {}, nuevo: () => {}, volver: () => {}, guardado: () => {},
  pendienteEliminar: null, errorEliminar: '', solicitarEliminar: () => {}, cancelarEliminar: () => {}, confirmarEliminar: () => null,
};

function render(catalogo: CatalogoZonas, estado: Admin = admin) {
  Object.defineProperty(globalThis, 'localStorage', { configurable: true,
    value: { getItem: () => JSON.stringify(catalogo) } });
  return renderToStaticMarkup(createElement(AdminTrayectos, { admin: estado }));
}

test('ofrece el cambio entre trayectos y zonas y muestra la zona en las tarjetas', () => {
  const html = render({ zonas: [{ id: 'zona-1', nombre: 'Zona Norte', descripcion: '' }], asignaciones: { 'ruta-1': 'zona-1' } });
  assert.match(html, /aria-label="Ver trayectos o zonas"/);
  assert.match(html, /value="zonas"/);
  assert.match(html, /Recorrido 1/);
  assert.match(html, /aria-label="Eliminar trayecto Recorrido 1"/);
  assert.match(html, /Zona Norte/);
  assert.doesNotMatch(html, /Trenque Lauquen/);
});

test('conserva trayectos antiguos y permite iniciar un trayecto aunque todavía no haya zonas', () => {
  const html = render({ zonas: [], asignaciones: {} });
  assert.match(html, /Sin zona asignada/);
  assert.match(html, /Ir a Zonas/);
  const boton = Array.from(html.matchAll(/<button\b([^>]*)>([\s\S]*?)<\/button>/g))
    .find((partes) => partes[2].includes('Nuevo trayecto'));
  assert.ok(boton);
  assert.doesNotMatch(boton[1], /disabled/);
});

test('el editor ofrece agregar una zona junto al selector sin abandonar los datos del trayecto', () => {
  const html = render({ zonas: [], asignaciones: {} }, {
    ...admin, vista: { tipo: 'editor', borrador: {
      nombre: 'Recorrido en preparación', localidadId: localidad.id, puntos: [], lineaElegida: null,
    } },
  });
  assert.match(html, /Agregar zona/);
  assert.match(html, /Usá Agregar zona para crear la primera/);
  assert.match(html, /value="Recorrido en preparación"/);
});

test('un cambio de nombre de zona se refleja en la tarjeta sin cambiar su asignación', () => {
  const html = render({ zonas: [{ id: 'zona-1', nombre: 'Centro renovado', descripcion: '' }], asignaciones: { 'ruta-1': 'zona-1' } });
  assert.match(html, /Centro renovado/);
});

test('la zona seleccionada puede quitarse con una cruz y oculta Agregar zona', () => {
  const html = render({ zonas: [{ id: 'zona-1', nombre: 'Norte', descripcion: '' }], asignaciones: { 'ruta-1': 'zona-1' } }, {
    ...admin, vista: { tipo: 'editor', borrador: {
      id: 'ruta-1', nombre: 'Recorrido 1', localidadId: localidad.id, puntos: [], lineaElegida: null,
    } },
  });
  assert.match(html, /aria-label="Quitar zona seleccionada"/);
  assert.doesNotMatch(html, />Agregar zona</);
});
