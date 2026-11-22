import { useEffect, useState } from 'react';
import { activarAvisosPush, type SuscripcionPush } from '../services/pushService';

export function useAvisosPush(usuarioId: string, direccionId?: string, domicilios?: readonly { id: string }[]) {
  const [resultado, guardar] = useState<{ direccionId: string; activo?: boolean; error?: string }>();

  useEffect(() => {
    if (!direccionId || !('Notification' in window) || !('PushManager' in window) || !window.isSecureContext) return;
    const clave = `ciudad-limpia:avisos:${usuarioId}`;
    const solicitud = new AbortController();
    let ocupado = false;
    const gestos = new AbortController();

    function activar(id: string) {
      if (ocupado) return;
      ocupado = true;
      gestos.abort();
      void activarAvisosPush(id, solicitud.signal).then((suscripcion) => {
        if (solicitud.signal.aborted) return;
        try { window.localStorage.setItem(clave, JSON.stringify(suscripcion)); } catch { /* La sesión sigue activa. */ }
        guardar({ direccionId: id, activo: true });
      }, (error: unknown) => {
        if (!solicitud.signal.aborted) guardar({ direccionId: id, error: error instanceof Error ? error.message : 'No se pudieron activar los avisos.' });
      });
    }

    const inicio = setTimeout(() => {
      let anterior: SuscripcionPush | null = null;
      try { anterior = JSON.parse(window.localStorage.getItem(clave) ?? 'null') as SuscripcionPush | null; } catch { /* Preferencia inaccesible. */ }
      if (Notification.permission === 'denied') {
        guardar({ direccionId, error: 'Habilitá las notificaciones de este sitio en los permisos del navegador.' });
        return;
      }
      if (Notification.permission === 'granted' && anterior && domicilios?.some(({ id }) => id === anterior.direccionId)) {
        if (anterior.direccionId === direccionId) activar(direccionId);
        return;
      }
      if (Notification.permission === 'granted' || navigator.userActivation?.isActive) {
        activar(direccionId);
        return;
      }
      const pedirPermiso = () => activar(direccionId);
      document.addEventListener('click', pedirPermiso, { signal: gestos.signal });
      document.addEventListener('keydown', pedirPermiso, { signal: gestos.signal });
    }, 0);

    return () => { solicitud.abort(); gestos.abort(); clearTimeout(inicio); };
  }, [usuarioId, direccionId, domicilios]);

  return resultado?.direccionId === direccionId ? resultado : undefined;
}
