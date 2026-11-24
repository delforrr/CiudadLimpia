import { useEffect, useRef, useState } from 'react';
import type { User } from '../services/authService';
import { userService } from '../services/userService';
import { useAuthContext } from './useAuthContext';

type Domicilio = NonNullable<User['cliente']>['domicilios'][number];

export function useDomicilioActual(user: User) {
  const { onAuthenticated } = useAuthContext();
  const [error, setError] = useState('');
  const [guardando, setGuardando] = useState(false);
  const solicitud = useRef<AbortController | null>(null);
  const domicilios = user.cliente?.domicilios ?? [];
  const actual = domicilios.find(({ id }) => id === user.domicilioActualId) ?? domicilios[0];

  useEffect(() => () => solicitud.current?.abort(), []);

  async function elegir({ id }: Domicilio) {
    if (guardando || id === actual?.id) return;
    const controller = new AbortController();
    solicitud.current = controller;
    setGuardando(true);
    setError('');
    try {
      await userService.elegirDomicilio(id, controller.signal);
      if (!controller.signal.aborted) onAuthenticated({ ...user, domicilioActualId: id });
    } catch (error) {
      if (!controller.signal.aborted) setError(error instanceof Error ? error.message : 'No se pudo elegir el domicilio.');
    } finally {
      if (!controller.signal.aborted) setGuardando(false);
    }
  }

  return {
    actual, guardando, error, elegir,
    domicilios: actual ? [actual, ...domicilios.filter(({ id }) => id !== actual.id)] : domicilios,
  };
}
