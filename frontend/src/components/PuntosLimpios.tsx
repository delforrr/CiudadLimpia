import { teselasOpenStreetMap, atribucionOpenStreetMap } from '../utils/cartografia';
import React, { useState, useEffect, useRef } from 'react';
import { Alert, Badge, Button, Collapse, IconButton } from '@mui/material';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import FilterListIcon from '@mui/icons-material/FilterList';
import type { LayerGroup, Map as MapaLeaflet } from 'leaflet';
import { useLeaflet } from '../hooks/useLeaflet';
import 'leaflet/dist/leaflet.css';
import fotoPunto1 from '../assets/punto-limpio-1.jpg';
import fotoPunto2 from '../assets/punto-limpio-2.jpg';
import fotoPunto3 from '../assets/punto-limpio-3.jpg';
import figuraPuntosLimpios from '../assets/figura-puntos-limpios.png';
import { useMapaPuntosLimpios } from '../hooks/useMapaPuntosLimpios';
import './PuntosLimpios.css';

const FOTOS_CARRUSEL = [
  { id: '1', src: fotoPunto1, alt: 'Punto Limpio - Módulo de separación y botellero' },
  { id: '2', src: fotoPunto2, alt: 'Punto Limpio - Supermercado con contenedores de reciclaje' },
  { id: '3', src: fotoPunto3, alt: 'Punto Limpio - Barrio Parque calle Schweitzer' },
];

export const PuntosLimpios: React.FC = () => {
  const { leaflet: L, errorMapa } = useLeaflet();
  const { puntos, tipos, error, loading } = useMapaPuntosLimpios();
  const [fotoActiva, setFotoActiva] = useState(0);
  const [filtroActivo, setFiltroActivo] = useState<string>('todos');
  const [mapReady, setMapReady] = useState(false);
  const [mapaAbierto, setMapaAbierto] = useState(false);
  const [filtrosAbiertos, setFiltrosAbiertos] = useState(false);

  const mapContainerRef = useRef<HTMLDivElement | null>(null);
  const tarjetaMapaRef = useRef<HTMLElement | null>(null);
  const mapRef = useRef<MapaLeaflet | null>(null);
  const markersLayerRef = useRef<LayerGroup | null>(null);

  // Conteo de ubicaciones por categoría

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
    if (!container || !L) return;

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

    L.tileLayer(teselasOpenStreetMap, {
      attribution: atribucionOpenStreetMap,
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
  }, [L]);

  // Actualización de marcadores y popups según el filtro activo
  useEffect(() => {
    const map = mapRef.current;
    const markersLayer = markersLayerRef.current;
    if (!L || !map || !markersLayer || !mapReady) return;

    const puntosAMostrar = filtroActivo === 'todos'
      ? puntos
      : puntos.filter((punto) => punto.tipo.id === filtroActivo);

    markersLayer.clearLayers();

    puntosAMostrar.forEach((punto) => {
      const icon = L.divIcon({
        className: 'custom-teardrop-wrapper',
        html: `<div class="teardrop-pin-container"><div class="teardrop-pin-body"><img src="${punto.tipo.icono}" alt="" class="teardrop-icon-white" /></div><div class="teardrop-shadow"></div></div>`,
        iconSize: [36, 48], iconAnchor: [18, 46], popupAnchor: [0, -44],
      });
      const contenido = document.createElement('div');
      contenido.className = 'modern-popup-card';
      const encabezado = document.createElement('div');
      encabezado.className = 'modern-popup-header-clean';
      const iconoTipo = document.createElement('img');
      iconoTipo.className = 'popup-categoria-logo';
      iconoTipo.src = punto.tipo.icono;
      iconoTipo.alt = '';
      const nombreTipo = document.createElement('span');
      nombreTipo.className = 'popup-categoria-texto';
      nombreTipo.textContent = punto.tipo.nombre;
      encabezado.append(iconoTipo, nombreTipo);
      const cuerpo = document.createElement('div');
      cuerpo.className = 'modern-popup-body';
      const titulo = document.createElement('h4');
      titulo.className = 'modern-popup-title';
      titulo.textContent = punto.nombre;
      const direccion = document.createElement('p');
      direccion.className = 'modern-popup-direccion';
      direccion.textContent = punto.direccion;
      const materiales = document.createElement('p');
      materiales.textContent = `Recibe: ${punto.tipo.materiales.join(', ')}`;
      cuerpo.append(titulo, direccion, materiales);
      contenido.append(encabezado, cuerpo);
      const marcador = L.marker([punto.lat, punto.lng], { icon, title: punto.nombre });
      marcador.on('click', () => {
        if (marcador.isPopupOpen()) {
          map.flyTo([-35.973, -62.734], 13, { duration: 0.6 });
        }
      });
      marcador.bindPopup(contenido, { className: 'modern-leaflet-popup', maxWidth: 260, maxHeight: 180, autoPanPadding: [12, 12] })
        .addTo(markersLayer);
    });
    // Ajuste de cámara según el filtro
    if (filtroActivo !== 'todos' && puntosAMostrar.length > 0) {
      const bounds = L.latLngBounds(puntosAMostrar.map((p) => [p.lat, p.lng]));
      map.flyToBounds(bounds, { padding: [45, 45], maxZoom: 15, duration: 0.6 });
    } else if (filtroActivo === 'todos') {
      map.flyTo([-35.973, -62.734], 13, { duration: 0.6 });
    }
  }, [L, mapReady, filtroActivo, puntos]);

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
      <section ref={tarjetaMapaRef} className="mapa-tarjeta-card">
        <div className="mapa-tarjeta-header">
          <div className="mapa-tarjeta-titulo-grupo">
            <span className="mapa-tarjeta-tag">
              TRENQUE LAUQUEN
            </span>
            <h3 className="mapa-tarjeta-titulo">Puntos Limpios</h3>
          </div>
          <Button color="success" size="small" aria-expanded={mapaAbierto}
            aria-controls="mapa-puntos-desplegable" onClick={() => setMapaAbierto((abierto) => !abierto)}
            endIcon={<ExpandMoreIcon className={mapaAbierto ? 'mapa-flecha-abierta' : 'mapa-flecha'} />}>
            {mapaAbierto ? 'Ocultar mapa' : 'Ver mapa'}
          </Button>

        </div>

        <Collapse in={mapaAbierto} id="mapa-puntos-desplegable" onEntered={() => {
          mapRef.current?.invalidateSize();
          tarjetaMapaRef.current?.scrollIntoView({
            behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'instant' : 'smooth',
            block: 'start',
          });
        }} onExited={() => {
          window.scrollTo({
            top: 0,
            behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'instant' : 'smooth',
          });
        }}>
        <div className="mapa-tarjeta-body">
          {error && <Alert severity="error">{error}</Alert>}
          {errorMapa && <Alert severity="error">No se pudo cargar el mapa.</Alert>}
          {loading && <p role="status">Cargando puntos limpios…</p>}
          <div
            ref={mapContainerRef}
            className="leaflet-card-canvas"
          />
        <div className="mapa-filtros">
          <IconButton color="success" size="small" aria-label="Filtros del mapa" aria-expanded={filtrosAbiertos}
            aria-controls="filtros-puntos-desplegable" onClick={() => setFiltrosAbiertos((abiertos) => !abiertos)}
            className="mapa-filtros-boton">
            <Badge color="error" variant="dot" invisible={filtroActivo === 'todos'}>
              <FilterListIcon />
            </Badge>
          </IconButton>
        <Collapse in={filtrosAbiertos} id="filtros-puntos-desplegable">
        <div className="mapa-tarjeta-leyenda">
          {filtroActivo !== 'todos' && (
            <button
              type="button"
              className="mapa-btn-ver-todos"
              onClick={() => {
                setFiltroActivo('todos');
                setFiltrosAbiertos(false);
              }}
              title="Quitar filtro y ver todos"
            >
              ✕ Mostrar todos
            </button>
          )}
          {tipos.map((tipo) => (
            <button key={tipo.id} type="button"
              className={`leyenda-filtro-btn ${filtroActivo !== 'todos' && filtroActivo !== tipo.id ? 'inactivo' : ''}`}
              aria-pressed={filtroActivo === tipo.id}
              onClick={() => {
                setFiltroActivo((actual) => actual === tipo.id ? 'todos' : tipo.id);
                setFiltrosAbiertos(false);
              }}>
              <div className="leyenda-pin-badge">
                <img src={tipo.icono} alt="" className="leyenda-icon-white" />
              </div>
              <span className="leyenda-btn-texto">
                {tipo.nombre} <span className="leyenda-btn-badge">({puntos.filter((punto) => punto.tipo.id === tipo.id).length})</span>
              </span>
            </button>
          ))}
        </div>
        </Collapse>
        </div>
        </div>
        </Collapse>
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
