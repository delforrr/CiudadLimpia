import { useEffect, useEffectEvent, useRef, useState } from 'react';
import type { LayerGroup, Map as LeafletMap } from 'leaflet';
import type { Coordenadas, LineaTrayecto } from '../services/trayectosService';
import 'leaflet/dist/leaflet.css';

type Props = {
  puntos: Coordenadas[];
  linea: LineaTrayecto;
  sugerida?: LineaTrayecto;
  pin?: (Coordenadas & { centrar: boolean }) | null;
  onMarcar?: (posicion: Coordenadas) => void;
};

type Mapa = { L: typeof import('leaflet'); mapa: LeafletMap; capa: LayerGroup };
const centro: [number, number] = [-35.973, -62.734];
const posiciones = (linea: LineaTrayecto): [number, number][] =>
  linea.coordinates.map(([long, lat]) => [lat, long]);

export function TrayectoMapa({ puntos, linea, sugerida, pin, onMarcar }: Props) {
  const contenedor = useRef<HTMLDivElement>(null);
  const [instancia, setInstancia] = useState<Mapa | null>(null);
  const [error, setError] = useState(false);
  const interactivo = Boolean(onMarcar);
  const marcar = useEffectEvent((lat: number, long: number) => onMarcar?.({ lat, long }));
  const encuadrar = useEffectEvent((mapa: LeafletMap) => {
    if (linea.coordinates.length >= 2) {
      mapa.fitBounds(posiciones(linea), { padding: [30, 30], maxZoom: 17, animate: false });
    }
  });

  useEffect(() => {
    const nodo = contenedor.current;
    if (!nodo) return;
    let desmontado = false;
    let mapa: LeafletMap | undefined;
    let observador: ResizeObserver | undefined;

    void import('leaflet').then((modulo) => {
      if (desmontado) return;
      const L = modulo.default ?? modulo;
      const mapaCreado = L.map(nodo, { center: centro, zoom: 14, zoomAnimation: false });
      mapa = mapaCreado;
      L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
        maxZoom: 19, attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
      }).addTo(mapaCreado);
      mapaCreado.on('click', ({ latlng }) => {
        const { lat, lng } = mapaCreado.wrapLatLng(latlng);
        marcar(lat, lng);
      });
      const capa = L.layerGroup().addTo(mapaCreado);
      encuadrar(mapaCreado);
      observador = new ResizeObserver(() => mapaCreado.invalidateSize({ pan: false }));
      observador.observe(nodo);
      setInstancia({ L, mapa: mapaCreado, capa });
    }).catch(() => {
      if (!desmontado) setError(true);
    });

    return () => {
      desmontado = true;
      observador?.disconnect();
      mapa?.remove();
    };
  }, []);

  useEffect(() => {
    if (!instancia) return;
    const { L, capa } = instancia;
    capa.clearLayers();
    if (linea.coordinates.length >= 2) L.polyline(posiciones(linea), { color: '#166044', weight: 5, interactive: false }).addTo(capa);
    if (sugerida) L.polyline(posiciones(sugerida), { color: '#185da8', weight: 5, dashArray: '8 7', interactive: false }).addTo(capa);
    puntos.forEach(({ lat, long }, indice) => {
      const numero = String(indice + 1);
      L.marker([lat, long], {
        icon: L.divIcon({ className: 'trayecto-marcador', html: numero, iconSize: [30, 30] }),
        title: `Punto ${numero}`, keyboard: false,
      }).addTo(capa);
    });
    if (pin) {
      L.marker([pin.lat, pin.long], {
        icon: L.divIcon({ className: 'trayecto-marcador trayecto-marcador-pendiente', html: '+', iconSize: [32, 32] }),
        title: 'Pin por confirmar', draggable: interactivo,
      }).on('dragend', ({ target }) => {
        const { lat, lng } = instancia.mapa.wrapLatLng((target as import('leaflet').Marker).getLatLng());
        marcar(lat, lng);
      }).addTo(capa);
    }
  }, [instancia, puntos, linea, sugerida, pin, interactivo]);

  useEffect(() => {
    if (instancia && pin?.centrar) {
      instancia.mapa.setView([pin.lat, pin.long], Math.max(16, instancia.mapa.getZoom()), { animate: false });
    }
  }, [instancia, pin]);

  return (
    <>
      {error && <p role="alert">No se pudo abrir el mapa. Recargá la página para reintentar.</p>}
      <div ref={contenedor} className="trayecto-mapa" role="region" aria-label="Mapa del trayecto" />
    </>
  );
}
