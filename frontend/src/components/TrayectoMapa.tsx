import { useEffect, useEffectEvent, useRef, useState } from 'react';
import type { LatLngTuple, LayerGroup, Map as LeafletMap } from 'leaflet';
import type { Coordenadas, LineaTrayecto } from '../services/trayectosService';
import 'leaflet/dist/leaflet.css';

type Props = {
  puntos: Coordenadas[];
  linea: LineaTrayecto;
  sugerida?: LineaTrayecto;
  pin?: Coordenadas | null;
  indicePin?: number;
  centrarEn?: Coordenadas | null;
  onMarcar?: (posicion: Coordenadas) => void;
  onDescartarPin?: () => void;
  onEditarPunto?: (indice: number) => void;
};

type Mapa = { L: typeof import('leaflet'); mapa: LeafletMap; capa: LayerGroup };
const centro: [number, number] = [-35.973, -62.734];
const limitesTrenqueLauquen: [LatLngTuple, LatLngTuple] = [[-36.04, -62.82], [-35.90, -62.64]];
const zoomMinimo = 12;
const zoomMaximo = 18;
const posiciones = (linea: LineaTrayecto): [number, number][] =>
  linea.coordinates.map(([long, lat]) => [lat, long]);

export function TrayectoMapa({ puntos, linea, sugerida, pin, indicePin, centrarEn, onMarcar, onDescartarPin, onEditarPunto }: Props) {
  const contenedor = useRef<HTMLDivElement>(null);
  const vistaAnterior = useRef<{ centro: LatLngTuple; zoom: number } | null>(null);
  const [instancia, setInstancia] = useState<Mapa | null>(null);
  const [error, setError] = useState(false);
  const interactivo = Boolean(onMarcar);
  const descartable = Boolean(onDescartarPin);
  const puedeEditarPunto = Boolean(onEditarPunto);
  const ajustandoPin = Boolean(pin);
  const marcar = useEffectEvent((lat: number, long: number) => onMarcar?.({ lat, long }));
  const descartarPin = useEffectEvent(() => onDescartarPin?.());
  const editarPunto = useEffectEvent((indice: number) => onEditarPunto?.(indice));
  const posicionPin = useEffectEvent(() => pin);
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
      if (pin && indice === indicePin) return;
      const numero = String(indice + 1);
      const marcador = L.marker([lat, long], {
        icon: L.divIcon({ className: 'trayecto-marcador', html: numero, iconSize: [30, 30] }),
        title: puedeEditarPunto ? `Mover punto ${numero}` : `Punto ${numero}`,
        keyboard: puedeEditarPunto,
      });
      if (puedeEditarPunto) marcador.on('click', () => editarPunto(indice));
      marcador.addTo(capa);
    });
    if (pin) {
      L.marker([pin.lat, pin.long], {
        icon: L.divIcon({ className: 'trayecto-marcador trayecto-marcador-pendiente',
          html: indicePin === undefined ? '+' : String(indicePin + 1), iconSize: [32, 32] }),
        title: descartable ? 'Pin por confirmar. Tocá para deshacer.' : 'Pin por confirmar',
        draggable: interactivo,
      }).on('dragstart', () => instancia.mapa.stop()).on('dragend', ({ target }) => {
        const { lat, lng } = instancia.mapa.wrapLatLng((target as import('leaflet').Marker).getLatLng());
        marcar(lat, lng);
      }).on('click', descartarPin).addTo(capa);
    }
  }, [instancia, puntos, linea, sugerida, pin, indicePin, interactivo, descartable, puedeEditarPunto]);

  useEffect(() => {
    if (!instancia) return;
    const { mapa } = instancia;
    const animar = !window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    if (ajustandoPin) {
      if (vistaAnterior.current) return;
      const punto = posicionPin();
      if (!punto) return;
      mapa.invalidateSize({ pan: false });
      const { lat, lng } = mapa.getCenter();
      const zoom = mapa.getZoom();
      vistaAnterior.current = { centro: [lat, lng], zoom };
      mapa.flyTo([punto.lat, punto.long], zoomMaximo, { animate: animar, duration: 0.45 });
      return;
    }

    const anterior = vistaAnterior.current;
    if (anterior) {
      vistaAnterior.current = null;
      mapa.invalidateSize({ pan: false });
      mapa.flyTo(anterior.centro, anterior.zoom, { animate: animar, duration: 0.45 });
    } else if (centrarEn) {
      mapa.setView([centrarEn.lat, centrarEn.long], Math.max(16, mapa.getZoom()), { animate: false });
    }
  }, [instancia, ajustandoPin, centrarEn]);

  return (
    <>
      {error && <p role="alert">No se pudo abrir el mapa. Recargá la página para reintentar.</p>}
      <div ref={contenedor} className="trayecto-mapa" role="region" aria-label="Mapa del trayecto" />
    </>
  );
}
