import { useEffect, useRef, useState } from 'react';
import { trayectosService, type Localidad, type Trayecto } from '../services/trayectosService.ts';
import { abrirBorrador, type BorradorTrayecto } from '../utils/trayectoEditor.ts';

type Vista = { tipo: 'lista' } | { tipo: 'detalle'; trayecto: Trayecto } | { tipo: 'editor'; borrador: BorradorTrayecto };

const idTrenqueLauquen = '06826050';

export function useAdminTrayectos() {
  const [trayectos, setTrayectos] = useState<Trayecto[]>([]);
  const [localidades, setLocalidades] = useState<Localidad[]>([]);
  const [vista, setVista] = useState<Vista>({ tipo: 'lista' });
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState('');
  const [aviso, setAviso] = useState('');
  const [intento, setIntento] = useState(0);
  const [pendienteEliminar, setPendienteEliminar] = useState<Trayecto | null>(null);
  const [errorEliminar, setErrorEliminar] = useState('');
  const [eliminando, setEliminando] = useState(false);
  const listadoActivo = useRef<AbortController | null>(null);
  const solicitudActiva = useRef<AbortController | null>(null);
  const localidadFija = localidades.find(({ id }) => id === idTrenqueLauquen);

  useEffect(() => {
    const solicitud = new AbortController();
    listadoActivo.current = solicitud;
    const { signal } = solicitud;
    void Promise.all([trayectosService.listar(signal), trayectosService.localidades(signal)])
      .then(([registros, catalogo]) => {
        if (signal.aborted) return;
        setTrayectos(registros);
        setLocalidades(catalogo);
      })
      .catch((error: unknown) => {
        if (!signal.aborted) setError(error instanceof Error ? error.message : 'No se pudo consultar la API.');
      })
      .finally(() => {
        if (listadoActivo.current === solicitud) listadoActivo.current = null;
        if (!signal.aborted) setCargando(false);
      });
    return () => solicitud.abort();
  }, [intento]);

  useEffect(() => () => solicitudActiva.current?.abort(), []);

  const abrir = async (id: string, editar: boolean) => {
    solicitudActiva.current?.abort();
    const solicitud = new AbortController();
    solicitudActiva.current = solicitud;
    setCargando(true);
    setError('');
    setAviso('');
    try {
      const trayecto = await trayectosService.consultar(id, solicitud.signal);
      if (solicitud.signal.aborted) return;
      setVista(editar
        ? { tipo: 'editor', borrador: abrirBorrador(trayecto) }
        : { tipo: 'detalle', trayecto });
    } catch (error) {
      if (!solicitud.signal.aborted) {
        setError(error instanceof Error ? error.message : 'No se pudo consultar la API.');
      }
    } finally {
      if (!solicitud.signal.aborted) setCargando(false);
    }
  };

  return {
    trayectos, localidades, localidadFija, vista, cargando, error, aviso, abrir,
    pendienteEliminar, errorEliminar, eliminando,
    solicitarEliminar: (trayecto: Trayecto) => { setErrorEliminar(''); setPendienteEliminar(trayecto); },
    cancelarEliminar: () => {
      if (eliminando) return;
      setErrorEliminar('');
      setPendienteEliminar(null);
    },
    confirmarEliminar: async () => {
      if (!pendienteEliminar || eliminando) return null;
      const { id } = pendienteEliminar;
      setEliminando(true);
      setErrorEliminar('');
      try {
        await trayectosService.eliminar(id);
      } catch {
        setErrorEliminar('No se pudo eliminar el trayecto. Intentá nuevamente.');
        return null;
      } finally {
        setEliminando(false);
      }

      if (listadoActivo.current) {
        listadoActivo.current.abort();
        setIntento((previo) => previo + 1);
      }
      setTrayectos((anteriores) => anteriores.filter((trayecto) => trayecto.id !== id));
      setVista({ tipo: 'lista' });
      setPendienteEliminar(null);
      setAviso('Trayecto eliminado.');
      return id;
    },
    cargar: () => {
      setCargando(true);
      setError('');
      setIntento((previo) => previo + 1);
    },
    nuevo: () => setVista({
      tipo: 'editor', borrador: {
        nombre: '', localidadId: localidadFija?.id ?? '', puntos: [], lineaElegida: null,
      },
    }),
    volver: () => {
      setVista({ tipo: 'lista' });
      setError('');
      setAviso('');
    },
    guardado: (trayecto: Trayecto) => {
      setTrayectos((anteriores) => [trayecto, ...anteriores.filter(({ id }) => id !== trayecto.id)]);
      setVista({ tipo: 'detalle', trayecto });
      setAviso('Trayecto guardado.');
    },
  };
}
