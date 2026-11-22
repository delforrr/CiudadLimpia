import { useEffect, useRef, useState, type FormEvent } from 'react';
import { z } from 'zod';
import { nuevoDomicilioSchema, type DomicilioForm, type NuevoDomicilioForm } from '../schemas/profileSchema';
import { coordenadasDomicilioSchema } from '../services/domicilioUbicacionService';
import { direccionesService } from '../services/direccionesService';
import type { Coordenadas } from '../services/trayectosService';

type Nuevo = {
  tipo: 'nuevo';
  datos: NuevoDomicilioForm;
  paso: 'datos' | 'mapa';
  errores: Partial<Record<keyof NuevoDomicilioForm, string[]>>;
  anterior?: DomicilioForm;
};

type Correccion = {
  tipo: 'correccion';
  domicilio: DomicilioForm & { id: string };
  actual?: Awaited<ReturnType<typeof direccionesService.consultar>>;
  ubicacion?: Coordenadas;
  cargando: boolean;
  guardando: boolean;
  error?: string;
};

const mensaje = (error: unknown, alternativa: string) => error instanceof Error ? error.message : alternativa;

export function useAdminDomicilio(onConfirmarNuevo: (domicilio: DomicilioForm, anterior?: DomicilioForm) => void) {
  const [editor, setEditor] = useState<Nuevo | Correccion | null>(null);
  const [aviso, setAviso] = useState('');
  const consulta = useRef<AbortController | null>(null);

  useEffect(() => () => consulta.current?.abort(), []);

  const abrirNuevo = (anterior?: DomicilioForm) => {
    setAviso('');
    setEditor({
      tipo: 'nuevo',
      datos: {
        calle: anterior?.frente?.calle ?? '',
        altura: anterior?.frente ? String(anterior.frente.altura) : '',
        etiqueta: anterior?.etiqueta,
        ubicacion: anterior?.ubicacion,
      },
      errores: {},
      paso: anterior ? 'mapa' : 'datos',
      anterior,
    });
  };

  const abrirCorreccion = async (domicilio: DomicilioForm) => {
    if (!domicilio.id) {
      abrirNuevo(domicilio);
      return;
    }
    consulta.current?.abort();
    const solicitud = new AbortController();
    consulta.current = solicitud;
    const borrador: Correccion = {
      tipo: 'correccion', domicilio: { ...domicilio, id: domicilio.id }, cargando: true, guardando: false,
    };
    setAviso('');
    setEditor(borrador);
    try {
      const actual = await direccionesService.consultar(domicilio.id, solicitud.signal);
      if (!solicitud.signal.aborted) setEditor({ ...borrador, actual, ubicacion: actual, cargando: false });
    } catch (error) {
      if (!solicitud.signal.aborted) setEditor({
        ...borrador, cargando: false, error: mensaje(error, 'No se pudo consultar la dirección.'),
      });
    }
  };

  const cerrar = () => {
    if (editor?.tipo === 'correccion' && editor.guardando) return;
    consulta.current?.abort();
    setEditor(null);
  };

  const actualizarNuevo = (datos: NuevoDomicilioForm) => {
    if (editor?.tipo !== 'nuevo') return;
    const cambioFrente = datos.calle !== editor.datos.calle || datos.altura !== editor.datos.altura;
    setEditor({ ...editor, datos: cambioFrente ? { ...datos, ubicacion: undefined } : datos, errores: {} });
  };

  const continuarNuevo = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (editor?.tipo !== 'nuevo') return;
    const validacion = nuevoDomicilioSchema.safeParse(editor.datos);
    if (!validacion.success) {
      setEditor({ ...editor, errores: z.flattenError(validacion.error).fieldErrors });
      return;
    }
    if (editor.paso === 'datos') {
      setEditor({ ...editor, paso: 'mapa', errores: {} });
      return;
    }
    const ubicacion = coordenadasDomicilioSchema.safeParse(editor.datos.ubicacion);
    if (!ubicacion.success) {
      setEditor({ ...editor, errores: { ubicacion: ['Ubicá el frente en el mapa antes de confirmar.'] } });
      return;
    }
    onConfirmarNuevo({ ...validacion.data, ubicacion: ubicacion.data }, editor.anterior);
    cerrar();
  };

  const actualizarUbicacion = (ubicacion?: Coordenadas) => {
    if (editor?.tipo === 'correccion') setEditor({ ...editor, ubicacion, error: undefined });
  };

  const cambioUbicacion = editor?.tipo === 'correccion' && editor.actual && editor.ubicacion &&
    (editor.actual.lat !== editor.ubicacion.lat || editor.actual.long !== editor.ubicacion.long);

  const guardarUbicacion = async () => {
    if (editor?.tipo !== 'correccion' || editor.guardando || !cambioUbicacion) return;
    const ubicacion = coordenadasDomicilioSchema.safeParse(editor.ubicacion);
    if (!ubicacion.success) {
      setEditor({ ...editor, error: 'Elegí una ubicación dentro de Trenque Lauquen.' });
      return;
    }
    setEditor({ ...editor, guardando: true, error: undefined });
    try {
      await direccionesService.corregirUbicacion(editor.domicilio.id, ubicacion.data);
      setEditor(null);
      setAviso('Ubicación del domicilio actualizada.');
    } catch (error) {
      setEditor({ ...editor, guardando: false, error: mensaje(error, 'No se pudo guardar la ubicación.') });
    }
  };

  return {
    editor, aviso, limpiarAviso: () => setAviso(''),
    abrirNuevo, abrirCorreccion, cerrar, continuarNuevo, actualizarNuevo,
    volverADatos: () => { if (editor?.tipo === 'nuevo') setEditor({ ...editor, paso: 'datos', errores: {} }); },
    actualizarUbicacion, cambioUbicacion, guardarUbicacion,
  };
}
