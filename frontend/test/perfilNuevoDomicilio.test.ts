import assert from 'node:assert/strict';
import { after, before, test } from 'node:test';
import { createElement, type ComponentType, type FormEvent } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { createServer, type ViteDevServer } from 'vite';
import type { NuevoDomicilioForm } from '../src/schemas/profileSchema.ts';

type Props = { domicilio: NuevoDomicilioForm; errores: Record<string, string[]>; paso: 'datos' | 'mapa';
  onChange: (value: NuevoDomicilioForm) => void; onSubmit: (event: FormEvent<HTMLFormElement>) => void;
  onContinuar: (event: FormEvent<HTMLFormElement>) => void; onVolver: () => void; onCancel: () => void };
let server: ViteDevServer;
let PerfilNuevoDomicilio: ComponentType<Props>;
before(async () => {
  server = await createServer({ configFile: false, server: { middlewareMode: true, hmr: false }, appType: 'custom',
    ssr: { external: ['react', 'react/jsx-runtime'] } });
  ({ default: PerfilNuevoDomicilio } = await server.ssrLoadModule('/src/components/PerfilNuevoDomicilio.tsx'));
});
after(async () => server?.close());
const props: Props = { domicilio: { calle: 'Roca', altura: '860' }, errores: {}, paso: 'datos',
  onChange: () => {}, onSubmit: () => {}, onContinuar: () => {}, onVolver: () => {}, onCancel: () => {} };

test('primero muestra calle y altura sin adelantar el mapa', () => {
  const html = renderToStaticMarkup(createElement(PerfilNuevoDomicilio, props));
  assert.match(html, /Calle/);
  assert.match(html, /role="combobox"/);
  assert.match(html, /Altura/);
  assert.match(html, /Continuar/);
  assert.doesNotMatch(html, /Mapa del trayecto|Confirmar domicilio/);
});

test('la segunda pantalla permite revisar el mapa y volver; no confirma sin ubicación', () => {
  const html = renderToStaticMarkup(createElement(PerfilNuevoDomicilio, { ...props, paso: 'mapa' }));
  assert.doesNotMatch(html, /Roca 860/);
  assert.match(html, /Mapa del trayecto/);
  assert.match(html, /Poné el pin en la entrada de tu casa, del lado de la vereda/);
  assert.match(html, /Volver/);
  assert.match(html, /Confirmar domicilio/);
  const boton = Array.from(html.matchAll(/<button\b([^>]*)>([\s\S]*?)<\/button>/g)).find((partes) => partes[2].includes('Confirmar domicilio'));
  assert.match(boton![1], /disabled/);
  assert.doesNotMatch(html, /label="Calle"/);
});

test('permite confirmar después de elegir la ubicación de la casa', () => {
  const html = renderToStaticMarkup(createElement(PerfilNuevoDomicilio, { ...props, paso: 'mapa',
    domicilio: { ...props.domicilio, ubicacion: { lat: -35.973, long: -62.734 } } }));
  const boton = Array.from(html.matchAll(/<button\b([^>]*)>([\s\S]*?)<\/button>/g)).find((partes) => partes[2].includes('Confirmar domicilio'));
  assert.doesNotMatch(boton![1], /disabled/);
});
