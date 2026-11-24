import { useEffect, useRef, useState } from 'react';
import { zonasService, type Zona } from '../services/zonasService';

export function useAdminZonas(localidadId?: string) {
  const [zonas, setZonas] = useState<Zona[]>([]);
  const [cargando, setCargando] = useState(true);
  const [intento, setIntento] = useState(0);
  const [error, setError] = useState('');
  const [formulario, setFormulario] = useState<{ id?: string; nombre: string; descripcion: string } | null>(null);
  const [errorForm, setErrorForm] = useState('');
  const [guardando, setGuardando] = useState(false);
  const [detalle, setDetalle] = useState<Zona | null>(null);
  const [pendienteEliminar, setPendienteEliminar] = useState<Zona | null>(null);
  const [eliminando, setEliminando] = useState(false);
  const [errorEliminar, setErrorEliminar] = useState('');
  const alGuardar = useRef<((zona: Zona) => void) | undefined>(undefined);

  useEffect(() => {
    const solicitud = new AbortController();
    void zonasService.listar(solicitud.signal).then(
      (datos) => { if (!solicitud.signal.aborted) setZonas(datos); },
      (error: unknown) => {
        if (!solicitud.signal.aborted) setError(error instanceof Error ? error.message : 'No se pudieron cargar las zonas.');
      },
    ).finally(() => { if (!solicitud.signal.aborted) setCargando(false); });
    return () => solicitud.abort();
  }, [intento]);

  async function guardar() {
    if (!formulario || !localidadId || guardando) return;
    const { id, nombre, descripcion } = formulario;
    setGuardando(true);
    setErrorForm('');
    try {
      const datos = { nombre: nombre.trim(), descripcion: descripcion.trim() };
      const zona = id ? await zonasService.editar(id, datos) : await zonasService.crear({ ...datos, localidadId });
      setZonas((actual) => [...actual.filter((item) => item.id !== zona.id), zona]);
      alGuardar.current?.(zona);
      alGuardar.current = undefined;
      setFormulario(null);
    } catch (error) {
      setErrorForm(error instanceof Error ? error.message : 'No se pudo guardar la zona.');
    } finally {
      setGuardando(false);
    }
  }

  async function eliminar() {
    if (!pendienteEliminar || eliminando) return;
    setEliminando(true);
    setErrorEliminar('');
    try {
      await zonasService.eliminar(pendienteEliminar.id);
      setZonas((actual) => actual.filter(({ id }) => id !== pendienteEliminar.id));
      setPendienteEliminar(null);
    } catch (error) {
      setErrorEliminar(error instanceof Error ? error.message : 'No se pudo eliminar la zona.');
    } finally {
      setEliminando(false);
    }
  }

  return {
    zonas: zonas.filter((zona) => zona.localidadId === localidadId).sort((a, b) => a.nombre.localeCompare(b.nombre, 'es')),
    error, cargando, formulario, errorForm, guardando, detalle, setDetalle, pendienteEliminar, errorEliminar,
    eliminando, guardar, eliminar,
    reintentar: () => { setCargando(true); setError(''); setIntento((actual) => actual + 1); },
    setPendienteEliminar: (zona: Zona | null) => {
      if (eliminando) return;
      setErrorEliminar('');
      setPendienteEliminar(zona);
    },
    bloqueado: cargando || Boolean(error) || !localidadId,
    abrirFormulario: (zona?: Zona, onGuardada?: (zona: Zona) => void) => {
      alGuardar.current = onGuardada;
      setErrorForm('');
      setFormulario(zona ?? { nombre: '', descripcion: '' });
    },
    cerrarFormulario: () => {
      if (guardando) return;
      alGuardar.current = undefined;
      setFormulario(null);
    },
    cambiarCampo: (campo: 'nombre' | 'descripcion', valor: string) =>
      setFormulario((actual) => actual ? { ...actual, [campo]: valor } : actual),
  };
}
