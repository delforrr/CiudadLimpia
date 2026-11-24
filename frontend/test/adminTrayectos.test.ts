import assert from 'node:assert/strict';
import { after, before, test } from 'node:test';
import { createElement, type ComponentType } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import type { ViteDevServer } from 'vite'
import { crearServidorPruebas } from './servidorPruebas.ts';
import type { useAdminTrayectos } from '../src/hooks/useAdminTrayectos.ts';

type Admin = ReturnType<typeof useAdminTrayectos>;
let server: ViteDevServer;
let AdminTrayectos: ComponentType<{ admin: Admin }>;

before(async () => {
  server = await crearServidorPruebas(['react', 'react/jsx-runtime']);
  ({ AdminTrayectos } = await server.ssrLoadModule('/src/components/AdminTrayectos.tsx'));
});
after(async () => server?.close());

const localidad = { id: '06826050', nombre: 'Trenque Lauquen' };
const admin: Admin = {
  trayectos: [{ id: 'ruta-1', nombre: 'Recorrido 1', localidadId: localidad.id, zonaId: 'zona-1',
    geometria: { type: 'LineString', coordinates: [[-62.73, -35.97], [-62.74, -35.98]] }, puntos: [] }],
  localidades: [localidad], localidadFija: localidad, vista: { tipo: 'lista' }, cargando: false, error: '', aviso: '',
  abrir: async () => {}, cargar: () => {}, nuevo: () => {}, volver: () => {}, guardado: () => {},
  pendienteEliminar: null, errorEliminar: '', eliminando: false,
  solicitarEliminar: () => {}, cancelarEliminar: () => {}, confirmarEliminar: async () => null,
};

function render(estado: Admin = admin) {
  return renderToStaticMarkup(createElement(AdminTrayectos, { admin: estado }));
}

test('ofrece el cambio entre trayectos y zonas y carga el catálogo del servidor', () => {
  const html = render();
  assert.match(html, /aria-label="Ver trayectos o zonas"/);
  assert.match(html, /value="zonas"/);
  assert.match(html, /Recorrido 1/);
});

test('el editor ofrece agregar una zona junto al selector sin abandonar los datos del trayecto', () => {
  const html = render({
    ...admin, vista: { tipo: 'editor', borrador: {
      nombre: 'Recorrido en preparación', localidadId: localidad.id, puntos: [], lineaElegida: null,
    } },
  });
  assert.match(html, /Agregar zona/);
  assert.match(html, /Usá Agregar zona para crear la primera/);
  assert.match(html, /value="Recorrido en preparación"/);
});
