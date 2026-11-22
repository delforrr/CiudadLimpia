import { useEffect, useState } from 'react';
import { consultarCamionesHoy, consultarTrayectosHoy, type CamionHoy, type TrayectosHoy } from '../services/hoyService';

export function useMapaHoy(direccionId?: string) {
  const [trayectos, guardarTrayectos] = useState<{ direccionId: string; mapa: TrayectosHoy | null }>();
  const [posiciones, guardarPosiciones] = useState<{ direccionId: string; camiones: CamionHoy[]; error: boolean }>();

  useEffect(() => {
    if (!direccionId) return;
    const solicitud = new AbortController();
    const espera = setTimeout(() => {
      const signal = AbortSignal.any([solicitud.signal, AbortSignal.timeout(8000)]);
      void consultarTrayectosHoy(direccionId, signal).then(
        (mapa) => { if (!solicitud.signal.aborted) guardarTrayectos({ direccionId, mapa }); },
        () => { if (!solicitud.signal.aborted) guardarTrayectos({ direccionId, mapa: null }); },
      );
    }, 0);
    return () => { clearTimeout(espera); solicitud.abort(); };
  }, [direccionId]);

  useEffect(() => {
    if (!direccionId) return;
    let actual: AbortController | undefined;
    let espera: ReturnType<typeof setTimeout> | undefined;

    async function consultar(id: string) {
      if (document.hidden || actual) return;
      const solicitud = new AbortController();
      actual = solicitud;
      try {
        const camiones = await consultarCamionesHoy(id, AbortSignal.any([solicitud.signal, AbortSignal.timeout(8000)]));
        if (!solicitud.signal.aborted) guardarPosiciones({ direccionId: id, camiones, error: false });
      } catch {
        if (!solicitud.signal.aborted) guardarPosiciones({ direccionId: id, camiones: [], error: true });
      } finally {
        if (!solicitud.signal.aborted) {
          actual = undefined;
          if (!document.hidden) espera = setTimeout(() => { void consultar(id); }, 5000);
        }
      }
    }

    function cancelar() {
      actual?.abort();
      actual = undefined;
      clearTimeout(espera);
    }

    const actualizarVisibilidad = () => {
      cancelar();
      if (!document.hidden) void consultar(direccionId);
    };
    document.addEventListener('visibilitychange', actualizarVisibilidad);
    espera = setTimeout(() => { void consultar(direccionId); }, 0);
    return () => {
      cancelar();
      document.removeEventListener('visibilitychange', actualizarVisibilidad);
    };
  }, [direccionId]);

  const cobertura = trayectos?.direccionId === direccionId ? trayectos : undefined;
  const vigentes = posiciones?.direccionId === direccionId ? posiciones : undefined;
  return {
    mapa: cobertura?.mapa,
    camiones: vigentes?.camiones,
    errorMapa: cobertura?.mapa === null,
    errorPosiciones: vigentes?.error ?? false,
    cargando: Boolean(direccionId && !cobertura),
  };
}
