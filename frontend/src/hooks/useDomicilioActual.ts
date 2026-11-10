import { useEffect, useState } from 'react';
import type { User } from '../services/authService';

type Domicilio = NonNullable<User['cliente']>['domicilios'][number];
type Preferencia = Pick<Domicilio, 'id'> & Partial<Pick<Domicilio, 'direccion' | 'etiqueta'>>;

function leerPreferencia(clave: string): Preferencia | null {
  if (typeof window === 'undefined') return null;

  try {
    const guardada = window.localStorage.getItem(clave);
    if (guardada) return JSON.parse(guardada);
    const id = window.sessionStorage.getItem(clave);
    return id ? { id } : null;
  } catch {
    return null;
  }
}

export function useDomicilioActual(user: User) {
  const clave = `ciudad-limpia:domicilio-actual:${user.id}`;
  const [preferencia, elegir] = useState<Preferencia | null>(() => leerPreferencia(clave));
  const domicilios = user.cliente?.domicilios ?? [];
  // Al editar el perfil, la API puede devolver nuevos IDs para domicilios existentes.
  const actual = domicilios.find(({ id }) => id === preferencia?.id)
    ?? domicilios.find(({ direccion, etiqueta }) =>
      direccion === preferencia?.direccion && (etiqueta ?? '') === (preferencia?.etiqueta ?? ''))
    ?? domicilios[0];

  useEffect(() => {
    if (!actual) return;
    const { id, direccion, etiqueta } = actual;
    try {
      window.localStorage.setItem(clave, JSON.stringify({ id, direccion, etiqueta }));
    } catch {
      // La selección sigue funcionando en memoria si el navegador bloquea el almacenamiento.
    }
  }, [actual, clave]);

  return {
    actual,
    domicilios: actual ? [actual, ...domicilios.filter(({ id }) => id !== actual.id)] : domicilios,
    elegir,
  };
}
