import { useEffect, useRef, useState } from 'react';
import { activarAvisosPush, admiteAvisosPush, consultarAvisosPush } from '../services/pushService';

type EstadoAvisos = { direccionId: string; activo?: boolean; activando?: boolean; error?: string };

export function useAvisosPush(direccionId?: string) {
  const [resultado, guardar] = useState<EstadoAvisos>();
  const activarActual = useRef<(() => void) | null>(null);

  useEffect(() => {
    if (!direccionId) return;
    const consulta = new AbortController();
    const activacion = new AbortController();
    let activando = false;

    activarActual.current = () => {
      if (activando) return;
      activando = true;
      consulta.abort();
      guardar({ direccionId, activando: true });
      void activarAvisosPush(direccionId, activacion.signal).then(() => {
        if (!activacion.signal.aborted) guardar({ direccionId, activo: true });
      }, (error: unknown) => {
        if (!activacion.signal.aborted) guardar({
          direccionId, error: error instanceof Error ? error.message : 'No se pudieron activar los avisos.',
        });
      }).finally(() => { activando = false; });
    };
    if (admiteAvisosPush() && Notification.permission === 'granted') {
      void consultarAvisosPush(consulta.signal).then((suscripcion) => {
        if (!consulta.signal.aborted) guardar({ direccionId, activo: suscripcion?.direccionId === direccionId });
      }, () => {
        if (!consulta.signal.aborted) guardar({ direccionId, error: 'No se pudo consultar el estado de los avisos.' });
      });
    }
    return () => {
      activarActual.current = null;
      consulta.abort();
      activacion.abort();
    };
  }, [direccionId]);

  return {
    estado: resultado?.direccionId === direccionId ? resultado : undefined,
    activar: () => activarActual.current?.(),
  };
}
