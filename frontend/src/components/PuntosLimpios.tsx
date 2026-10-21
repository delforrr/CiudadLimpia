import React, { useState, useEffect, useRef } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import fotoPunto1 from '../assets/punto-limpio-1.jpg';
import fotoPunto2 from '../assets/punto-limpio-2.jpg';
import fotoPunto3 from '../assets/punto-limpio-3.jpg';
import iconoBotella from '../assets/icono-botella.png';
import iconoLata from '../assets/icono-lata.png';
import iconoPuntoVerde from '../assets/icono-punto-verde.png';
import figuraPuntosLimpios from '../assets/figura-puntos-limpios.png';
import './PuntosLimpios.css';

export type TipoPunto = 'punto-limpio' | 'botellero' | 'botellero-latero';

export interface PuntoLimpio {
  id: string;
  nombre: string;
  tipo: TipoPunto;
  direccion: string;
  lat: number;
  lng: number;
  materiales: string[];
}

export type TipoFiltro = 'todos' | TipoPunto;

const CATEGORIAS_INFO: Record<
  TipoPunto,
  { label: string; singularLabel: string; icon: string; pinClass: string; headerClass: string }
> = {
  'punto-limpio': {
    label: 'Puntos Limpios',
    singularLabel: 'Punto Limpio',
    icon: iconoPuntoVerde,
    pinClass: 'pin-punto-limpio',
    headerClass: 'header--punto-limpio',
  },
  'botellero': {
    label: 'Botelleros',
    singularLabel: 'Botelleros',
    icon: iconoBotella,
    pinClass: 'pin-botellero',
    headerClass: 'header--botellero',
  },
  'botellero-latero': {
    label: 'Botelleros y lateros',
    singularLabel: 'Botelleros y Lateros',
    icon: iconoLata,
    pinClass: 'pin-botellero-latero',
    headerClass: 'header--botellero-latero',
  },
};

const PUNTOS_DATA: PuntoLimpio[] = [
  // 1. PUNTOS LIMPIOS
  {
    id: 'coop-obrera',
    nombre: 'Supermercado Cooperativa Obrera',
    tipo: 'punto-limpio',
    direccion: 'Pasteur n.º 1200',
    lat: -35.9772,
    lng: -62.7328,
    materiales: ['Plásticos', 'Cartón', 'Papel', 'Vidrio', 'Metales'],
  },
  {
    id: 'barrio-esperanza',
    nombre: 'Barrio Esperanza',
    tipo: 'punto-limpio',
    direccion: 'Freyre (entre Carmen Granada y Estrada Este)',
    lat: -35.9620,
    lng: -62.7412,
    materiales: ['Plásticos', 'Cartón', 'Papel', 'Vidrio', 'Metales'],
  },
  {
    id: 'barrio-parque-envion',
    nombre: 'Barrio Parque – Zona Envión',
    tipo: 'punto-limpio',
    direccion: 'Calle Schweitzer',
    lat: -35.9805,
    lng: -62.7470,
    materiales: ['Plásticos', 'Cartón', 'Papel', 'Vidrio', 'Metales'],
  },
  {
    id: 'polo-cientifico',
    nombre: 'Polo Científico Tecnológico',
    tipo: 'punto-limpio',
    direccion: 'Hernández n.º 816',
    lat: -35.9752,
    lng: -62.7441,
    materiales: ['Plásticos', 'Cartón', 'Electrónicos pequeños', 'Pilas'],
  },
  {
    id: '12-de-abril-alvarez',
    nombre: 'Punto Limpio 12 de Abril y Álvarez',
    tipo: 'punto-limpio',
    direccion: 'Calle 12 de Abril y Álvarez',
    lat: -35.9680,
    lng: -62.7390,
    materiales: ['Plásticos', 'Cartón', 'Papel', 'Vidrio', 'Metales'],
  },
  {
    id: 'barrio-don-felipe',
    nombre: 'Barrio Don Felipe',
    tipo: 'punto-limpio',
    direccion: 'Barrio Don Felipe',
    lat: -35.9840,
    lng: -62.7380,
    materiales: ['Plásticos', 'Cartón', 'Papel', 'Vidrio', 'Metales'],
  },
  {
    id: 'monte-hermoso-tomas-davis',
    nombre: 'Plazoleta Barrio Monte Hermoso -Tomás Davis-',
    tipo: 'punto-limpio',
    direccion: 'Tomás Davis y Saavedra',
    lat: -35.9660,
    lng: -62.7490,
    materiales: ['Plásticos', 'Cartón', 'Vidrio', 'Metales'],
  },
  {
    id: 'winter-baldovino',
    nombre: 'Plazoleta de Winter y Baldovino',
    tipo: 'punto-limpio',
    direccion: 'Calle Winter y Baldovino',
    lat: -35.9695,
    lng: -62.7530,
    materiales: ['Plásticos', 'Cartón', 'Vidrio', 'Metales'],
  },
  {
    id: 'plazoleta-almirante-brown',
    nombre: 'Plazoleta Almirante Brown',
    tipo: 'punto-limpio',
    direccion: 'Calle Ugarte',
    lat: -35.9740,
    lng: -62.7260,
    materiales: ['Plásticos', 'Cartón', 'Papel', 'Vidrio', 'Metales'],
  },
  {
    id: 'plazoleta-refugio',
    nombre: 'Plazoleta Refugio',
    tipo: 'punto-limpio',
    direccion: 'Chaumeil Este n.º 500',
    lat: -35.9645,
    lng: -62.7280,
    materiales: ['Plásticos', 'Cartón', 'Papel', 'Vidrio', 'Metales'],
  },
  {
    id: 'plaza-bicentenario',
    nombre: 'Plaza Bicentenario',
    tipo: 'punto-limpio',
    direccion: 'Orellana n.º 1150',
    lat: -35.9812,
    lng: -62.7482,
    materiales: ['Plásticos', 'Cartón', 'Papel', 'Vidrio', 'Metales'],
  },
  {
    id: 'ampliacion-urbana',
    nombre: 'Ampliación Urbana',
    tipo: 'punto-limpio',
    direccion: 'Ampliación Urbana (sector parrillas)',
    lat: -35.9525,
    lng: -62.7135,
    materiales: ['Plásticos', 'Cartón', 'Vidrio', 'Latas'],
  },
  {
    id: 'polo-ambiental',
    nombre: 'Polo Ambiental · Estación de Transferencia',
    tipo: 'punto-limpio',
    direccion: 'Calle Scalese n.º 1500',
    lat: -35.9862,
    lng: -62.7188,
    materiales: ['Todo tipo de reciclables', 'RAEE', 'Pilas', 'Aceite usado', 'Poda'],
  },

  // 2. BOTELLEROS
  {
    id: 'escuela-8',
    nombre: 'Escuela n.º 8',
    tipo: 'botellero',
    direccion: 'Orellana n.º 1100',
    lat: -35.9798,
    lng: -62.7465,
    materiales: ['Botellas de Plástico', 'Botellas de Vidrio'],
  },
  {
    id: 'carnes-del-colegio',
    nombre: 'Supermercado Carnes del Colegio',
    tipo: 'botellero',
    direccion: 'Roca n.º 257',
    lat: -35.9715,
    lng: -62.7348,
    materiales: ['Botellas de Plástico', 'Botellas de Vidrio'],
  },

  // 3. BOTELLEROS Y LATEROS
  {
    id: 'estacion-ferrocarril',
    nombre: 'Predio de la Estación del Ferrocarril',
    tipo: 'botellero-latero',
    direccion: 'Wilde y Villegas',
    lat: -35.9748,
    lng: -62.7302,
    materiales: ['Botellas plásticas', 'Vidrio', 'Latas de aluminio'],
  },
  {
    id: 'parque-villegas',
    nombre: 'Parque Villegas',
    tipo: 'botellero-latero',
    direccion: 'Presidente Uriburu n.º 1050 (sector parrillas)',
    lat: -35.9835,
    lng: -62.7235,
    materiales: ['Botellas plásticas', 'Vidrio', 'Latas de aluminio'],
  },
];

const FOTOS_CARRUSEL = [
  { id: '1', src: fotoPunto1, alt: 'Punto Limpio - Módulo de separación y botellero' },
  { id: '2', src: fotoPunto2, alt: 'Punto Limpio - Supermercado con contenedores de reciclaje' },
  { id: '3', src: fotoPunto3, alt: 'Punto Limpio - Barrio Parque calle Schweitzer' },
];

export const PuntosLimpios: React.FC = () => {
  const [fotoActiva, setFotoActiva] = useState(0);
  const [filtroActivo, setFiltroActivo] = useState<TipoFiltro>('todos');
  const [mapReady, setMapReady] = useState(false);

  const mapContainerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<L.Map | null>(null);
  const markersLayerRef = useRef<L.LayerGroup | null>(null);

  // Conteo de ubicaciones por categoría
  const countPuntosLimpios = PUNTOS_DATA.filter((p) => p.tipo === 'punto-limpio').length;
  const countBotelleros = PUNTOS_DATA.filter((p) => p.tipo === 'botellero').length;
  const countBotellerosLateros = PUNTOS_DATA.filter((p) => p.tipo === 'botellero-latero').length;

  const puntosAMostrar =
    filtroActivo === 'todos'
      ? PUNTOS_DATA
      : PUNTOS_DATA.filter((p) => p.tipo === filtroActivo);

  // Rotación automática de fotos cada 3 segundos
  useEffect(() => {
    const timer = setInterval(() => {
      setFotoActiva((prev) => (prev + 1) % FOTOS_CARRUSEL.length);
    }, 3000);

    return () => clearInterval(timer);
  }, []);

  // Inicialización del Mapa
  useEffect(() => {
    const container = mapContainerRef.current;
    if (!container) return;

    if (mapRef.current) {
      mapRef.current.remove();
      mapRef.current = null;
    }

    if ((container as unknown as { _leaflet_id?: number })._leaflet_id) {
      delete (container as unknown as { _leaflet_id?: number })._leaflet_id;
    }

    // Límites para restringir el mapa exclusivamente a Trenque Lauquen
    const TRENQUE_LAUQUEN_BOUNDS = L.latLngBounds(
      [-36.04, -62.82],
      [-35.90, -62.64]
    );

    // Centrado en Trenque Lauquen con máximo de alejamiento (minZoom) y máximo de acercamiento (maxZoom)
    const map = L.map(container, {
      center: [-35.973, -62.734],
      zoom: 13,
      minZoom: 12,
      maxZoom: 17,
      maxBounds: TRENQUE_LAUQUEN_BOUNDS,
      maxBoundsViscosity: 1.0,
      zoomControl: true,
    });

    L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '&copy; OpenStreetMap',
      minZoom: 12,
      maxZoom: 17,
    }).addTo(map);

    const markersLayer = L.layerGroup().addTo(map);
    markersLayerRef.current = markersLayer;
    mapRef.current = map;
    setMapReady(true);

    map.invalidateSize();
    const t1 = setTimeout(() => map.invalidateSize(), 150);
    const t2 = setTimeout(() => map.invalidateSize(), 500);

    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
      setMapReady(false);
      map.remove();
      mapRef.current = null;
      markersLayerRef.current = null;
      if (container) {
        delete (container as unknown as { _leaflet_id?: number })._leaflet_id;
      }
    };
  }, []);

  // Actualización de marcadores y popups según el filtro activo
  useEffect(() => {
    const map = mapRef.current;
    const markersLayer = markersLayerRef.current;
    if (!map || !markersLayer || !mapReady) return;

    markersLayer.clearLayers();

    // Generar pin con forma de gota, borde exterior blanco, relleno de un solo color e icono blanco en el centro
    const createMarkerIcon = (tipo: TipoPunto) => {
      const config = CATEGORIAS_INFO[tipo];

      return L.divIcon({
        className: 'custom-teardrop-wrapper',
        html: `
          <div class="teardrop-pin-container">
            <div class="teardrop-pin-body pin-bg-${tipo}">
              <img src="${config.icon}" alt="${config.singularLabel}" class="teardrop-icon-white" />
            </div>
            <div class="teardrop-shadow"></div>
          </div>
        `,
        iconSize: [36, 48],
        iconAnchor: [18, 46],
        popupAnchor: [0, -44],
      });
    };

    puntosAMostrar.forEach((punto) => {
      const config = CATEGORIAS_INFO[punto.tipo];
      const marker = L.marker([punto.lat, punto.lng], {
        icon: createMarkerIcon(punto.tipo),
        title: punto.nombre,
      });

      // Popup limpio: SIN fondo de píldora ni círculo, logo directo con texto
      const popupHtml = `
        <div class="modern-popup-card">
          <!-- Cabecera limpia sin fondo ni píldora -->
          <div class="modern-popup-header-clean">
            <div class="popup-categoria-item">
              <img src="${config.icon}" alt="${config.singularLabel}" class="popup-categoria-logo logo--${punto.tipo}" />
              <span class="popup-categoria-texto cat-texto--${punto.tipo}">${config.singularLabel}</span>
            </div>
          </div>

          <!-- Cuerpo del popup con nombre, dirección y materiales -->
          <div class="modern-popup-body">
            <h4 class="modern-popup-title">${punto.nombre}</h4>

            <div class="modern-popup-item">
              <svg class="modern-popup-icon" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
                <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7z"/>
                <circle cx="12" cy="9" r="2.5"/>
              </svg>
              <span class="modern-popup-direccion">${punto.direccion}</span>
            </div>

            <div class="modern-popup-materiales">
              <span class="materiales-titulo">Recibe:</span>
              <div class="materiales-pills">
                ${punto.materiales
                  .map((m) => `<span class="mat-pill">✓ ${m}</span>`)
                  .join('')}
              </div>
            </div>
          </div>
        </div>
      `;

      marker.bindPopup(popupHtml, {
        className: 'modern-leaflet-popup',
        maxWidth: 270,
        closeButton: true,
      });

      marker.addTo(markersLayer);
    });

    // Ajuste de cámara según el filtro
    if (filtroActivo !== 'todos' && puntosAMostrar.length > 0) {
      const bounds = L.latLngBounds(puntosAMostrar.map((p) => [p.lat, p.lng]));
      map.flyToBounds(bounds, { padding: [45, 45], maxZoom: 15, duration: 0.6 });
    } else if (filtroActivo === 'todos') {
      map.flyTo([-35.973, -62.734], 13, { duration: 0.6 });
    }
  }, [mapReady, filtroActivo]);

  return (
    <div className="puntos-page-container">
      {/* Carrusel de fotos automático cada 3 segundos */}
      <section className="puntos-banner-card" aria-label="Fotos de puntos limpios de Trenque Lauquen">
        <div className="puntos-banner-slides">
          {FOTOS_CARRUSEL.map((foto, index) => (
            <img
              key={foto.id}
              src={foto.src}
              alt={foto.alt}
              className={`puntos-banner-img ${index === fotoActiva ? 'activa' : ''}`}
            />
          ))}
        </div>
      </section>

      {/* Tarjeta del Mapa con Filtros */}
      <section className="mapa-tarjeta-card">
        <div className="mapa-tarjeta-header">
          <div className="mapa-tarjeta-titulo-grupo">
            <span className="mapa-tarjeta-tag">
              TRENQUE LAUQUEN
            </span>
            <h3 className="mapa-tarjeta-titulo">Puntos Limpios</h3>
          </div>
          {filtroActivo !== 'todos' && (
            <button
              type="button"
              className="mapa-btn-ver-todos"
              onClick={() => setFiltroActivo('todos')}
              title="Quitar filtro y ver todos"
            >
              ✕ Mostrar todos
            </button>
          )}
        </div>

        <div className="mapa-tarjeta-body">
          <div
            ref={mapContainerRef}
            className="leaflet-card-canvas"
          />
        </div>

        {/* Leyenda y Filtros interactivos: Tocar para filtrar */}
        <div className="mapa-tarjeta-leyenda">
          <button
            type="button"
            className={`leyenda-filtro-btn ${
              filtroActivo === 'punto-limpio'
                ? 'activo-punto-limpio'
                : filtroActivo !== 'todos'
                ? 'inactivo'
                : ''
            }`}
            onClick={() =>
              setFiltroActivo((prev) => (prev === 'punto-limpio' ? 'todos' : 'punto-limpio'))
            }
            title="Tocar para filtrar por Puntos Limpios"
          >
            <div className="leyenda-pin-badge pin-bg-punto-limpio">
              <img src={iconoPuntoVerde} alt="Puntos Limpios" className="leyenda-icon-white" />
            </div>
            <span className="leyenda-btn-texto">
              Puntos Limpios <span className="leyenda-btn-badge">({countPuntosLimpios})</span>
            </span>
          </button>

          <button
            type="button"
            className={`leyenda-filtro-btn ${
              filtroActivo === 'botellero'
                ? 'activo-botellero'
                : filtroActivo !== 'todos'
                ? 'inactivo'
                : ''
            }`}
            onClick={() =>
              setFiltroActivo((prev) => (prev === 'botellero' ? 'todos' : 'botellero'))
            }
            title="Tocar para filtrar por Botelleros"
          >
            <div className="leyenda-pin-badge pin-bg-botellero">
              <img src={iconoBotella} alt="Botelleros" className="leyenda-icon-white" />
            </div>
            <span className="leyenda-btn-texto">
              Botelleros <span className="leyenda-btn-badge">({countBotelleros})</span>
            </span>
          </button>

          <button
            type="button"
            className={`leyenda-filtro-btn ${
              filtroActivo === 'botellero-latero'
                ? 'activo-botellero-latero'
                : filtroActivo !== 'todos'
                ? 'inactivo'
                : ''
            }`}
            onClick={() =>
              setFiltroActivo((prev) => (prev === 'botellero-latero' ? 'todos' : 'botellero-latero'))
            }
            title="Tocar para filtrar por Botelleros y lateros"
          >
            <div className="leyenda-pin-badge pin-bg-botellero-latero">
              <img src={iconoLata} alt="Botelleros y lateros" className="leyenda-icon-white" />
            </div>
            <span className="leyenda-btn-texto">
              Botelleros y lateros <span className="leyenda-btn-badge">({countBotellerosLateros})</span>
            </span>
          </button>
        </div>
      </section>

      {/* Sección informativa sobre qué son los Puntos Limpios */}
      <article className="puntos-descripcion-card">
        {/* Imagen de fondo difuminada e invertida que asoma desde el borde derecho */}
        <img
          src={figuraPuntosLimpios}
          alt=""
          className="puntos-descripcion-bg-img"
          aria-hidden="true"
        />

        <div className="puntos-descripcion-content">
          <h3 className="puntos-descripcion-titulo">¿Qué son los Puntos Limpios?</h3>
          <p className="puntos-descripcion-parrafo">
            Los Puntos Limpios son lugares especialmente destinados a la separación y recuperación de residuos sólidos urbanos reciclables, permitiendo su posterior aprovechamiento y contribuyendo a la reducción de residuos.
          </p>
          <p className="puntos-descripcion-parrafo">
            En estos espacios los vecinos pueden depositar papel y cartón, vidrio, plástico, envases de Tetra Brik y metales, colaborando activamente con el reciclado y la economía circular.
          </p>
          <p className="puntos-descripcion-parrafo">
            Los nuevos módulos cuentan con techos construidos con material recuperado de Tetra Brik, fabricados en el Polo Ambiental por el equipo de herrería de la planta, y a los que se les suma un latero.
          </p>
        </div>
      </article>
    </div>
  );
};
