/* global self */

self.addEventListener('push', (evento) => {
  let aviso;
  try {
    aviso = evento.data?.json();
  } catch {
    return;
  }
  if (typeof aviso?.id !== 'string' || typeof aviso.titulo !== 'string') return;
  evento.waitUntil(self.registration.showNotification(aviso.titulo, {
    tag: aviso.id,
    icon: '/icono-ciudad-limpia.png',
  }));
});

self.addEventListener('notificationclick', (evento) => {
  evento.notification.close();
  evento.waitUntil((async () => {
    const ventanas = await self.clients.matchAll({ type: 'window', includeUncontrolled: true });
    const hoy = ventanas.find((ventana) => new URL(ventana.url).pathname === '/hoy');
    if (hoy) await hoy.focus();
    else await self.clients.openWindow('/hoy');
  })());
});
