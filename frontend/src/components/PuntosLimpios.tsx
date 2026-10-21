import React, { useState, useEffect, useRef } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import fotoPunto1 from '../assets/punto-limpio-1.jpg';
import fotoPunto2 from '../assets/punto-limpio-2.jpg';
import fotoPunto3 from '../assets/punto-limpio-3.jpg';
import iconoBotella from '../assets/icono-botella.png';
import iconoLata from '../assets/icono-lata.png';
import iconoPuntoVerde from '../assets/icono-punto-verde.png';
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
  estado?: string;
}

const CATEGORIAS_INFO: Record<
  TipoPunto,
  { label: string; icon: string; pinClass: string; headerClass: string }
> = {
  'punto-limpio': {
    label: 'Puntos Limpios',
    icon: iconoPuntoVerde,
    pinClass: 'pin-punto-limpio',
    headerClass: 'header--punto-limpio',
  },
  'botellero': {
    label: 'Botellero',
    icon: iconoBotella,
    pinClass: 'pin-botellero',
    headerClass: 'header--botellero',
  },
  'botellero-latero': {
    label: 'Botellero y latero',
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
    estado: 'Instalación próxima semana',
  },
  {
    id: 'monte-hermoso-tomas-davis',
    nombre: 'Plazoleta Barrio Monte Hermoso -Tomás Davis-',
    tipo: 'punto-limpio',
    direccion: 'Tomás Davis y Saavedra',
    lat: -35.9660,
    lng: -62.7490,
    materiales: ['Plásticos', 'Cartón', 'Vidrio', 'Metales'],
    estado: 'Instalación próxima semana',
  },
  {
    id: 'winter-baldovino',
    nombre: 'Plazoleta de Winter y Baldovino',
    tipo: 'punto-limpio',
    direccion: 'Calle Winter y Baldovino',
    lat: -35.9695,
    lng: -62.7530,
    materiales: ['Plásticos', 'Cartón', 'Vidrio', 'Metales'],
    estado: 'Instalación próxima semana',
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
  const mapContainerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<L.Map | null>(null);

  // Rotación automática de fotos cada 3 segundos
  useEffect(() => {
    const timer = setInterval(() => {
      setFotoActiva((prev) => (prev + 1) % FOTOS_CARRUSEL.length);
    }, 3000);

    return () => clearInterval(timer);
  }, []);

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

    // Centrado en Trenque Lauquen
    const map = L.map(container, {
      center: [-35.973, -62.734],
      zoom: 13,
      zoomControl: true,
    });

    L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '&copy; OpenStreetMap',
      maxZoom: 19,
    }).addTo(map);

    // Generar pin con forma de gota, borde blanco nítido e icono circular central
    const createMarkerIcon = (tipo: TipoPunto) => {
      const config = CATEGORIAS_INFO[tipo];

      return L.divIcon({
        className: 'custom-teardrop-wrapper',
        html: `
          <div class="teardrop-pin-container">
            <div class="teardrop-pin-body pin-bg-${tipo}">
              <div class="teardrop-inner-circle">
                <img src="${config.icon}" alt="${config.label}" class="teardrop-icon-img" />
              </div>
            </div>
            <div class="teardrop-shadow"></div>
          </div>
        `,
        iconSize: [36, 48],
        iconAnchor: [18, 46],
        popupAnchor: [0, -44],
      });
    };

    // Añadir marcadores al mapa
    PUNTOS_DATA.forEach((punto) => {
      const config = CATEGORIAS_INFO[punto.tipo];
      const marker = L.marker([punto.lat, punto.lng], {
        icon: createMarkerIcon(punto.tipo),
        title: punto.nombre,
      });

      // Popup con bordecito blanco y el ícono correspondiente
      const popupHtml = `
        <div class="modern-popup-card">
          <!-- Cabecera del popup -->
          <div class="modern-popup-header ${config.headerClass}">
            <div class="modern-popup-badge">
              <img src="${config.icon}" alt="${config.label}" class="popup-badge-icon" />
              <span>${config.label}</span>
            </div>
            ${
              punto.estado
                ? `<span class="modern-popup-aviso">Próximamente</span>`
                : ''
            }
          </div>

          <!-- Cuerpo del popup con bordecito blanco -->
          <div class="modern-popup-body">
            <h4 class="modern-popup-title">${punto.nombre}</h4>

            <div class="modern-popup-item">
              <svg class="modern-popup-icon" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7z"/>
                <circle cx="12" cy="9" r="2.5"/>
              </svg>
              <span class="modern-popup-direccion">${punto.direccion}</span>
            </div>

            ${
              punto.estado
                ? `
                <div class="modern-popup-estado-banner">
                  <span class="estado-dot"></span>
                  <span>${punto.estado}</span>
                </div>
              `
                : ''
            }

            <div class="modern-popup-materiales">
              <span class="materiales-titulo">Recibe:</span>
              <div class="materiales-pills">
                ${punto.materiales
                  .map((m) => `<span class="mat-pill">✓ ${m}</span>`)
                  .join('')}
              </div>
            </div>

            <a
              href="https://www.google.com/maps/dir/?api=1&destination=${punto.lat},${punto.lng}"
              target="_blank"
              rel="noopener noreferrer"
              class="modern-popup-btn-ruta"
            >
              <span>Cómo llegar</span>
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <line x1="5" y1="12" x2="19" y2="12"/>
                <polyline points="12 5 19 12 12 19"/>
              </svg>
            </a>
          </div>
        </div>
      `;

      marker.bindPopup(popupHtml, {
        className: 'modern-leaflet-popup',
        maxWidth: 270,
        closeButton: true,
      });

      marker.addTo(map);
    });

    mapRef.current = map;

    map.invalidateSize();
    const t1 = setTimeout(() => map.invalidateSize(), 150);
    const t2 = setTimeout(() => map.invalidateSize(), 500);

    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
      map.remove();
      mapRef.current = null;
      if (container) {
        delete (container as unknown as { _leaflet_id?: number })._leaflet_id;
      }
    };
  }, []);

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

      {/* Tarjeta del Mapa */}
      <section className="mapa-tarjeta-card">
        <div className="mapa-tarjeta-header">
          <div className="mapa-tarjeta-titulo-grupo">
            <span className="mapa-tarjeta-tag">
              <span className="dot-mapa-vivo"></span>
              TRENQUE LAUQUEN
            </span>
            <h3 className="mapa-tarjeta-titulo">Puntos Limpios</h3>
          </div>
          <span className="mapa-tarjeta-badge-count">
            {PUNTOS_DATA.length} ubicaciones
          </span>
        </div>

        <div className="mapa-tarjeta-body">
          <div
            ref={mapContainerRef}
            className="leaflet-card-canvas"
            style={{ width: '100%', height: '430px' }}
          />
        </div>

        {/* Leyenda separada en las 3 categorías solicitadas */}
        <div className="mapa-tarjeta-leyenda">
          <div className="leyenda-item">
            <img src={iconoPuntoVerde} alt="Puntos Limpios" className="leyenda-icon-img" />
            <span>Puntos Limpios</span>
          </div>
          <div className="leyenda-item">
            <img src={iconoBotella} alt="Botellero" className="leyenda-icon-img" />
            <span>Botellero</span>
          </div>
          <div className="leyenda-item">
            <img src={iconoLata} alt="Botellero y latero" className="leyenda-icon-img" />
            <span>Botellero y latero</span>
          </div>
        </div>
      </section>
    </div>
  );
};
