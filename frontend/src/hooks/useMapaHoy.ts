import { useEffect, useState } from 'react';
import { consultarMapaHoy, type MapaHoy } from '../services/hoyService';

type Resultado = { direccionId: string; mapa: MapaHoy | null; error: boolean };

export function useMapaHoy(direccionId?: string) {
  const [resultado, guardar] = useState<Resultado>();

  useEffect(() => {
    if (!direccionId) return;
    let actual: AbortController | undefined;
    let espera: ReturnType<typeof setTimeout> | undefined;

    async function consultar(id: string) {
      if (document.hidden || actual) return;
      const solicitud = new AbortController();
      actual = solicitud;
      try {
        const mapa = await consultarMapaHoy(id, AbortSignal.any([solicitud.signal, AbortSignal.timeout(8000)]));
        if (!solicitud.signal.aborted) guardar({ direccionId: id, mapa, error: false });
      } catch {
        if (!solicitud.signal.aborted) guardar({ direccionId: id, mapa: null, error: true });
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
    void consultar(direccionId);
    return () => {
      cancelar();
      document.removeEventListener('visibilitychange', actualizarVisibilidad);
    };
  }, [direccionId]);

  const vigente = resultado?.direccionId === direccionId ? resultado : undefined;
  return { mapa: vigente?.mapa, error: vigente?.error ?? false, cargando: Boolean(direccionId && !vigente) };
}
