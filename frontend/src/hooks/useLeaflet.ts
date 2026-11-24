import { useEffect, useState } from 'react';

export function useLeaflet() {
  const [leaflet, setLeaflet] = useState<typeof import('leaflet')>();
  const [errorMapa, setErrorMapa] = useState(false);
  useEffect(() => {
    let activo = true;
    void import('leaflet').then(
      (modulo) => { if (activo) setLeaflet(modulo.default ?? modulo); },
      () => { if (activo) setErrorMapa(true); },
    );
    return () => { activo = false; };
  }, []);
  return { leaflet, errorMapa };
}
