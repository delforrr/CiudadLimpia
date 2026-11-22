import { httpRequest } from './http.ts';

export type SuscripcionPush = { id: string; direccionId: string };

export async function activarAvisosPush(direccionId: string, signal?: AbortSignal): Promise<SuscripcionPush> {
  if (!window.isSecureContext || !('Notification' in window) || !('PushManager' in window) || !('serviceWorker' in navigator)) {
    throw new Error('Este navegador no admite avisos push en esta página.');
  }
  const permiso = await Notification.requestPermission();
  signal?.throwIfAborted();
  if (permiso === 'denied') throw new Error('Habilitá las notificaciones de este sitio en los permisos del navegador.');
  if (permiso !== 'granted') throw new Error('Aceptá el permiso del navegador para recibir avisos.');

  const { clavePublica } = await httpRequest<{ clavePublica: string }>('/api/push/configuracion', { signal });
  const applicationServerKey = Uint8Array.from(atob(clavePublica.replace(/-/g, '+').replace(/_/g, '/')), (caracter) => caracter.charCodeAt(0));
  await navigator.serviceWorker.register('/avisos-sw.js');
  const registro = await navigator.serviceWorker.ready;
  const anterior = await registro.pushManager.getSubscription();
  const claveAnterior = anterior?.options.applicationServerKey;
  if (anterior && claveAnterior && !new Uint8Array(claveAnterior).every((byte, i) => byte === applicationServerKey[i])) {
    await anterior.unsubscribe();
  }
  const navegador = await registro.pushManager.getSubscription() ?? await registro.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey });
  const { keys } = navegador.toJSON();
  if (!keys?.p256dh || !keys.auth) throw new Error('El navegador no entregó las claves de suscripción.');
  signal?.throwIfAborted();
  return httpRequest<SuscripcionPush>('/api/push/suscripciones', {
    method: 'PUT', signal, body: JSON.stringify({ direccionId, endpoint: navegador.endpoint, keys: { p256dh: keys.p256dh, auth: keys.auth } }),
  });
}
