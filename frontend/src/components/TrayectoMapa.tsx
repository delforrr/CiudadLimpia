import { useEffect, useEffectEvent, useRef, useState } from 'react';
import { IconButton } from '@mui/material';
import HomeOutlinedIcon from '@mui/icons-material/HomeOutlined';
import type { LatLngTuple, LayerGroup, Map as LeafletMap, Marker } from 'leaflet';
import type { Coordenadas, LineaTrayecto } from '../services/trayectosService';
import 'leaflet/dist/leaflet.css';
import './DomicilioMapa.css';
import camionRecolector from '../assets/icono-camion-hoy.png';

type CamionMapa = { servicioId: string; nombre: string; posicion: Coordenadas };

type Props = {
  puntos: Coordenadas[];
  linea?: LineaTrayecto;
  lineas?: readonly LineaTrayecto[];
  sugerida?: LineaTrayecto;
  pin?: Coordenadas | null;
  indicePin?: number;
  centrarEn?: Coordenadas | null;
  onMarcar?: (posicion: Coordenadas) => void;
  onDescartarPin?: () => void;
  onEditarPunto?: (indice: number) => void;
  zoomInicial?: number;
  zoomFijo?: boolean;
  camiones?: readonly CamionMapa[];
  domicilio?: Coordenadas;
  mostrarBotonCentrarDomicilio?: boolean;
  onMoverDomicilio?: (posicion: Coordenadas) => void;
  onDescartarDomicilio?: () => void;
};

type Mapa = { L: typeof import('leaflet'); mapa: LeafletMap; capa: LayerGroup };
const centro: [number, number] = [-35.973, -62.734];
const limitesTrenqueLauquen: [LatLngTuple, LatLngTuple] = [[-36.04, -62.82], [-35.90, -62.64]];
const zoomMinimo = 12;
const zoomMaximo = 18;
const sinCamiones: readonly CamionMapa[] = [];
const posiciones = (linea: LineaTrayecto): [number, number][] =>
  linea.coordinates.map(([long, lat]) => [lat, long]);

export function TrayectoMapa({ puntos, linea, lineas, sugerida, pin, indicePin, centrarEn, onMarcar, onDescartarPin, onEditarPunto, zoomInicial = 14, zoomFijo = false, camiones = sinCamiones, domicilio, mostrarBotonCentrarDomicilio, onMoverDomicilio, onDescartarDomicilio }: Props) {
  const contenedor = useRef<HTMLDivElement>(null);
  const marcadoresCamiones = useRef(new Map<string, Marker>());
  const encuadreEnVivo = useRef(false);
  const vistaAnterior = useRef<{ centro: LatLngTuple; zoom: number } | null>(null);
  const vistaDomicilioAnterior = useRef<{ centro: LatLngTuple; zoom: number } | null>(null);
  const [instancia, setInstancia] = useState<Mapa | null>(null);
  const [error, setError] = useState(false);
  const interactivo = Boolean(onMarcar);
  const descartable = Boolean(onDescartarPin);
  const puedeEditarPunto = Boolean(onEditarPunto);
  const domicilioMovible = Boolean(onMoverDomicilio);
  const domicilioDescartable = Boolean(onDescartarDomicilio);
  const ajustandoDomicilio = domicilioMovible && Boolean(domicilio);
  const descartarDomicilio = useEffectEvent(() => onDescartarDomicilio?.());
  const moverDomicilio = useEffectEvent((posicion: Coordenadas) => onMoverDomicilio?.(posicion));
  const zoomMapa = useEffectEvent(() => zoomInicial);
  const mapaFijo = useEffectEvent(() => zoomFijo);
  const ajustandoPin = Boolean(pin);
  const marcar = useEffectEvent((lat: number, long: number) => onMarcar?.({ lat, long }));
  const descartarPin = useEffectEvent(() => onDescartarPin?.());
  const editarPunto = useEffectEvent((indice: number) => onEditarPunto?.(indice));
  const posicionPin = useEffectEvent(() => pin);
  const encuadrar = useEffectEvent((mapa: LeafletMap, L: Mapa['L']) => {
    const limites = L.latLngBounds(limitesTrenqueLauquen);
    puntos.forEach(({ lat, long }) => limites.extend([lat, long]));
    const recorrido = L.latLngBounds((lineas ?? (linea ? [linea] : [])).flatMap(posiciones));
    if (domicilio && lineas && recorrido.isValid()) recorrido.extend([domicilio.lat, domicilio.long]);
    // Los recorridos guardados fuera del área inicial también se pueden consultar.
    if (recorrido.isValid()) {
      if (lineas) encuadreEnVivo.current = true;
      limites.extend(recorrido);
      mapa.setMaxBounds(limites);
      if (mapaFijo()) mapa.setView(recorrido.getCenter(), zoomMapa(), { animate: false });
      else mapa.fitBounds(recorrido, { padding: [24, 24], maxZoom: 17, animate: false });
    } else {
      if (lineas && domicilio) {
        limites.extend([domicilio.lat, domicilio.long]);
        mapa.setView([domicilio.lat, domicilio.long], zoomMapa(), { animate: false });
      }
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
        center: centro, zoom: zoomMapa(), minZoom: mapaFijo() ? zoomMapa() : zoomMinimo,
        maxZoom: mapaFijo() ? zoomMapa() : zoomMaximo, zoomControl: !mapaFijo(),
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

    const marcadores = marcadoresCamiones.current;
    return () => {
      desmontado = true;
      observador?.disconnect();
      mapa?.remove();
      marcadores.clear();
    };
  }, []);

  useEffect(() => {
    if (instancia && lineas?.length && !encuadreEnVivo.current) encuadrar(instancia.mapa, instancia.L);
  }, [instancia, lineas]);

  useEffect(() => {
    if (!instancia) return;
    const { L, capa } = instancia;
    capa.clearLayers();
    for (const recorrido of lineas ?? (linea ? [linea] : [])) {
      if (recorrido.coordinates.length >= 2) L.polyline(posiciones(recorrido), { color: '#166044', weight: 5, interactive: false }).addTo(capa);
    }
    if (domicilio) {
      const marcadorDomicilio = L.marker([domicilio.lat, domicilio.long], {
        title: 'Tu domicilio',
        draggable: domicilioMovible,
        bubblingMouseEvents: false,
        icon: L.divIcon({
          className: 'hoy-domicilio-marcador',
          html: `<svg width="28" height="34" viewBox="0 0 38 46" aria-hidden="true">
            <path d="M19 44 7 29A17 17 0 1 1 31 29Z" fill="#1e6000" stroke="#1e6000" stroke-width="2" />
            <path d="m8 19 11-9 11 9-2 2-2-2v11h-6v-8h-4v8h-6V19l-1 2Z" fill="white" />
          </svg>`,
          iconSize: [28, 34], iconAnchor: [14, 33], popupAnchor: [0, -30],
        }),
      }).on('dragstart', () => instancia.mapa.stop()).on('dragend', ({ target }) => {
        const posicion = (target as import('leaflet').Marker).getLatLng();
        moverDomicilio({ lat: posicion.lat, long: posicion.lng });
      }).addTo(capa);
      if (domicilioDescartable) marcadorDomicilio.on('click', descartarDomicilio);
      else marcadorDomicilio.bindPopup('Tu domicilio', { autoPan: false, closeButton: false });
    }
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
  }, [instancia, puntos, linea, lineas, sugerida, pin, indicePin, interactivo, descartable, puedeEditarPunto, domicilio, domicilioMovible, domicilioDescartable]);

  useEffect(() => {
    if (!instancia) return;
    const { L, mapa } = instancia;
    const marcadores = marcadoresCamiones.current;
    const vigentes = new Set(camiones.map(({ servicioId }) => servicioId));
    for (const [id, marcador] of marcadores) {
      if (vigentes.has(id)) continue;
      marcador.remove();
      marcadores.delete(id);
    }
    for (const { servicioId, nombre, posicion } of camiones) {
      const coordenadas: LatLngTuple = [posicion.lat, posicion.long];
      const marcador = marcadores.get(servicioId);
      if (marcador) {
        marcador.setLatLng(coordenadas);
        continue;
      }
      marcadores.set(servicioId, L.marker(coordenadas, {
        title: nombre,
        icon: L.divIcon({
          className: 'hoy-camion-marcador',
          html: `<svg width="40" height="40" viewBox="0 0 40 40" aria-hidden="true">
            <circle cx="20" cy="20" r="18" fill="#1e6000" opacity="0.22" />
            <circle cx="20" cy="20" r="14" fill="white" stroke="#1e6000" stroke-width="2.2" />
            <image href="${camionRecolector}" x="10" y="10" width="20" height="20" />
          </svg>`,
          iconSize: [40, 40], iconAnchor: [20, 20],
        }),
      }).addTo(mapa));
    }
  }, [instancia, camiones]);

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
    } else if (!ajustandoDomicilio && vistaDomicilioAnterior.current) {
      const anteriorDomicilio = vistaDomicilioAnterior.current;
      vistaDomicilioAnterior.current = null;
      mapa.invalidateSize({ pan: false });
      mapa.flyTo(anteriorDomicilio.centro, anteriorDomicilio.zoom, { animate: animar, duration: 0.45 });
    } else if (centrarEn) {
      if (domicilioMovible) {
        if (!vistaDomicilioAnterior.current) {
          const { lat, lng } = mapa.getCenter();
          vistaDomicilioAnterior.current = { centro: [lat, lng], zoom: mapa.getZoom() };
        }
        mapa.invalidateSize({ pan: false });
        mapa.flyTo([centrarEn.lat, centrarEn.long], zoomMaximo, { animate: animar, duration: 0.45 });
      } else {
        mapa.setView([centrarEn.lat, centrarEn.long], Math.max(16, mapa.getZoom()), { animate: false });
      }
    }
  }, [instancia, ajustandoPin, centrarEn, domicilioMovible, ajustandoDomicilio]);

  return (
    <>
      {error && <p role="alert">No se pudo abrir el mapa. Recargá la página para reintentar.</p>}
      <div ref={contenedor} className="trayecto-mapa" role="region" aria-label="Mapa del trayecto" />
      {mostrarBotonCentrarDomicilio && instancia && domicilio && (
        <IconButton className="hoy-mapa-centrar" aria-label="Centrar domicilio"
          onClick={() => instancia.mapa.panTo([domicilio.lat, domicilio.long], { animate: false })}>
          <HomeOutlinedIcon />
        </IconButton>
      )}
    </>
  );
}
