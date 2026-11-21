import { useEffect, useEffectEvent, useRef, useState } from 'react';
import { domicilioUbicacionService, type SugerenciaDomicilio } from '../services/domicilioUbicacionService';
import type { Coordenadas } from '../services/trayectosService';

export function useUbicacionDomicilio(calle: string, altura: string, inicial: Coordenadas | undefined, onChange: (posicion: Coordenadas | undefined) => void) {
  const [ubicacionInicial] = useState(inicial);
  const [posicion, setPosicion] = useState(inicial);
  const [centrarEn, setCentrarEn] = useState(inicial);
  const [sugerencias, setSugerencias] = useState<SugerenciaDomicilio[]>([]);
  const [buscando, setBuscando] = useState(!inicial);
  const [mensaje, setMensaje] = useState('');
  const solicitud = useRef<AbortController | null>(null);
  const manual = useRef(false);
  const notificar = useEffectEvent(onChange);

  useEffect(() => {
    if (ubicacionInicial) return;
    const controller = new AbortController();
    solicitud.current = controller;
    void domicilioUbicacionService.buscar(calle, altura, controller.signal).then((resultados) => {
      if (controller.signal.aborted || manual.current) return;
      setSugerencias(resultados);
      if (resultados.length) {
        setPosicion(resultados[0]);
        setCentrarEn(resultados[0]);
        notificar(resultados[0]);
      } else setMensaje('No encontramos esa dirección. Tocá el mapa para ubicar tu casa.');
    }).catch(() => {
      if (!controller.signal.aborted) setMensaje('No pudimos buscar la dirección. Podés ubicar tu casa tocando el mapa.');
    }).finally(() => { if (!controller.signal.aborted) setBuscando(false); });
    return () => controller.abort();
    // La pantalla se abre con una dirección validada y se desmonta al volver a los datos.
  }, [calle, altura, ubicacionInicial]);

  const elegir = (punto: Coordenadas, centrar = false) => {
    manual.current = true;
    solicitud.current?.abort();
    setBuscando(false);
    setMensaje('');
    setPosicion(punto);
    if (centrar) setCentrarEn(punto);
    onChange(punto);
  };

  const descartar = () => {
    manual.current = true;
    solicitud.current?.abort();
    setBuscando(false);
    setMensaje('');
    setPosicion(undefined);
    setCentrarEn(undefined);
    onChange(undefined);
  };

  return { posicion, centrarEn, sugerencias, buscando, mensaje, elegir, descartar };
}
