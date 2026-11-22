import { useEffect, useState } from 'react';
import { trayectosService, type CalleCatalogo } from '../services/trayectosService';

export function useCallesTrayecto() {
  const [consulta, setConsulta] = useState('');
  const [resultado, setResultado] = useState<{ calles: CalleCatalogo[]; error: boolean } | null>(null);

  useEffect(() => {
    const solicitud = new AbortController();
    const id = setTimeout(() => {
      void trayectosService.buscarCalles(consulta.trim(), solicitud.signal).then((calles) => {
        if (!solicitud.signal.aborted) setResultado({ calles, error: false });
      }).catch(() => {
        if (!solicitud.signal.aborted) setResultado({ calles: [], error: true });
      });
    }, consulta ? 180 : 0);
    return () => {
      clearTimeout(id);
      solicitud.abort();
    };
  }, [consulta]);

  return {
    calles: resultado?.calles ?? [], cargando: resultado === null, error: resultado?.error,
    buscar: (texto: string) => {
      if (texto === consulta) return;
      setResultado(null);
      setConsulta(texto);
    },
  };
}
