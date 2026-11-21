import { useRef, useState } from 'react';
import { asignarZona, eliminarZona, guardarZona, zonasService, type CatalogoZonas, type Zona } from '../services/zonasService';

function cargar() {
  try {
    return { catalogo: zonasService.cargar(), error: '' };
  } catch {
    return { catalogo: { zonas: [], asignaciones: {} } as CatalogoZonas,
      error: 'No se pudieron leer las zonas guardadas. Recargá la página para reintentar.' };
  }
}

export function useAdminZonas() {
  const [inicial] = useState(cargar);
  const [catalogo, setCatalogo] = useState(inicial.catalogo);
  const [error, setError] = useState(inicial.error);
  const [formulario, setFormulario] = useState<{ id?: string; nombre: string; descripcion: string } | null>(null);
  const [errorForm, setErrorForm] = useState('');
  const [detalle, setDetalle] = useState<Zona | null>(null);
  const [pendienteEliminar, setPendienteEliminar] = useState<Zona | null>(null);
  const alGuardar = useRef<((zona: Zona) => void) | undefined>(undefined);

  const persistir = (nuevo: CatalogoZonas) => {
    if (inicial.error) return false;
    try {
      zonasService.guardar(nuevo);
      setCatalogo(nuevo);
      setError('');
      return true;
    } catch {
      setError('No se pudo guardar el cambio. Revisá que el navegador permita almacenamiento local e intentá de nuevo.');
      return false;
    }
  };

  return {
    ...catalogo, error, formulario, errorForm, detalle, setDetalle, pendienteEliminar, setPendienteEliminar,
    bloqueado: Boolean(inicial.error),
    abrirFormulario: (zona?: Zona, onGuardada?: (zona: Zona) => void) => {
      alGuardar.current = onGuardada;
      setErrorForm('');
      setFormulario(zona ?? { nombre: '', descripcion: '' });
    },
    cerrarFormulario: () => {
      alGuardar.current = undefined;
      setFormulario(null);
    },
    cambiarCampo: (campo: 'nombre' | 'descripcion', valor: string) =>
      setFormulario((actual) => actual ? { ...actual, [campo]: valor } : actual),
    guardar: () => {
      if (!formulario) return;
      try {
        const nuevo = guardarZona(catalogo, formulario, formulario.id);
        if (persistir(nuevo)) {
          const guardada = formulario.id ? nuevo.zonas.find((zona) => zona.id === formulario.id) : nuevo.zonas.at(-1);
          if (guardada) alGuardar.current?.(guardada);
          alGuardar.current = undefined;
          setFormulario(null);
        }
      } catch (error) {
        setErrorForm(error instanceof Error ? error.message : 'Revisá los datos.');
      }
    },
    eliminar: () => {
      if (!pendienteEliminar) return;
      try {
        if (persistir(eliminarZona(catalogo, pendienteEliminar.id))) setPendienteEliminar(null);
      } catch (error) {
        setError(error instanceof Error ? error.message : 'No se pudo eliminar la zona.');
        setPendienteEliminar(null);
      }
    },
    asignar: (trayectoId: string, zonaId: string) => persistir(asignarZona(catalogo, trayectoId, zonaId)),
  };
}
