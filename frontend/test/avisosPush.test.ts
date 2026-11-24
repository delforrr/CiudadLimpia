import assert from 'node:assert/strict';
import { test } from 'node:test';
import { consultarAvisosPush } from '../src/services/pushService.ts';

test('consulta el estado del navegador y no guarda nada en almacenamiento local', async (t) => {
  const endpoint = 'https://fcm.googleapis.com/fcm/send/dispositivo';
  const anterior = Object.getOwnPropertyDescriptor(navigator, 'serviceWorker');
  const getRegistration = t.mock.fn(async () => ({
    pushManager: { getSubscription: async () => ({ endpoint }) },
  }));
  Object.defineProperty(navigator, 'serviceWorker', { configurable: true, value: { getRegistration } });
  t.after(() => {
    if (anterior) Object.defineProperty(navigator, 'serviceWorker', anterior);
    else Reflect.deleteProperty(navigator, 'serviceWorker');
  });
  const suscripcion = { id: 'suscripcion', direccionId: 'frente' };
  const fetch = t.mock.method(globalThis, 'fetch', async () => Response.json({ suscripcion }));
  assert.deepEqual(await consultarAvisosPush(new AbortController().signal), suscripcion);
  const [url, opciones] = fetch.mock.calls[0].arguments;
  assert.equal(url, '/api/push/suscripciones/estado');
  assert.deepEqual(JSON.parse(String(opciones?.body)), { endpoint });
});
