import { useEffect, useEffectEvent, useRef, useState } from 'react';
import type { LatLngTuple, LayerGroup, Map as LeafletMap } from 'leaflet';
import type { Coordenadas, LineaTrayecto } from '../services/trayectosService';
import 'leaflet/dist/leaflet.css';

type Props = {
  puntos: Coordenadas[];
  linea: LineaTrayecto;
  sugerida?: LineaTrayecto;
  pin?: Coordenadas | null;
  centrarEn?: Coordenadas | null;
  onMarcar?: (posicion: Coordenadas) => void;
  onDescartarPin?: () => void;
};

type Mapa = { L: typeof import('leaflet'); mapa: LeafletMap; capa: LayerGroup };
const centro: [number, number] = [-35.973, -62.734];
const limitesTrenqueLauquen: [LatLngTuple, LatLngTuple] = [[-36.04, -62.82], [-35.90, -62.64]];
const zoomMinimo = 12;
const zoomMaximo = 18;
const posiciones = (linea: LineaTrayecto): [number, number][] =>
  linea.coordinates.map(([long, lat]) => [lat, long]);

export function TrayectoMapa({ puntos, linea, sugerida, pin, centrarEn, onMarcar, onDescartarPin }: Props) {
  const contenedor = useRef<HTMLDivElement>(null);
  const [instancia, setInstancia] = useState<Mapa | null>(null);
  const [error, setError] = useState(false);
  const interactivo = Boolean(onMarcar);
  const descartable = Boolean(onDescartarPin);
  const marcar = useEffectEvent((lat: number, long: number) => onMarcar?.({ lat, long }));
  const descartarPin = useEffectEvent(() => onDescartarPin?.());
  const encuadrar = useEffectEvent((mapa: LeafletMap, L: Mapa['L']) => {
    const limites = L.latLngBounds(limitesTrenqueLauquen);
    puntos.forEach(({ lat, long }) => limites.extend([lat, long]));
    // Los recorridos guardados fuera del área inicial también se pueden consultar.
    if (linea.coordinates.length >= 2) {
      const recorrido = L.latLngBounds(posiciones(linea));
      limites.extend(recorrido);
      mapa.setMaxBounds(limites);
      mapa.fitBounds(recorrido, { padding: [24, 24], maxZoom: 17, animate: false });
    } else {
      mapa.setMaxBounds(limites);
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
      const mapaCreado = L.map(nodo, {
        center: centro, zoom: 14, minZoom: zoomMinimo, maxZoom: zoomMaximo,
        maxBoundsViscosity: 1, zoomAnimation: false, scrollWheelZoom: false, bounceAtZoomLimits: false,
      });
      mapa = mapaCreado;
      L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
        maxZoom: 19, attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
      }).addTo(mapaCreado);
      mapaCreado.on('click', ({ latlng }) => {
        const { lat, lng } = mapaCreado.wrapLatLng(latlng);
        marcar(lat, lng);
      });
      const capa = L.layerGroup().addTo(mapaCreado);
      encuadrar(mapaCreado, L);
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
        title: descartable ? 'Pin por confirmar. Tocá para descartar.' : 'Pin por confirmar',
        draggable: interactivo,
      }).on('dragend', ({ target }) => {
        const { lat, lng } = instancia.mapa.wrapLatLng((target as import('leaflet').Marker).getLatLng());
        marcar(lat, lng);
      }).on('click', descartarPin).addTo(capa);
    }
  }, [instancia, puntos, linea, sugerida, pin, interactivo, descartable]);

  useEffect(() => {
    if (instancia && centrarEn) {
      instancia.mapa.setView([centrarEn.lat, centrarEn.long], Math.max(16, instancia.mapa.getZoom()), { animate: false });
    }
  }, [instancia, centrarEn]);

  return (
    <>
      {error && <p role="alert">No se pudo abrir el mapa. Recargá la página para reintentar.</p>}
      <div ref={contenedor} className="trayecto-mapa" role="region" aria-label="Mapa del trayecto" />
    </>
  );
}
