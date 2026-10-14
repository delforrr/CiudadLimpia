import React, { useState, useEffect } from 'react';
import camionRecolector from '../assets/camion-recolector.png';
import residuosReciclables from '../assets/residuos-reciclables.png';
import residuosNoReciclables from '../assets/residuos-no-reciclables.png';
import truckIconImg from '../assets/icono-camion-hoy.png';
import './HoyCards.css';

export const HoyCards: React.FC = () => {
  const [recordatorioActivo, setRecordatorioActivo] = useState(true);
  const [mostrarTrayecto, setMostrarTrayecto] = useState(false);
  const [fotoActiva, setFotoActiva] = useState(0);

  const fotosBanner = [
    {
      id: 'reciclables',
      src: residuosReciclables,
      alt: 'Lunes y jueves: Reciclables',
    },
    {
      id: 'no-reciclables',
      src: residuosNoReciclables,
      alt: 'Martes, miércoles, viernes y domingo: No Reciclables',
    },
  ];

  useEffect(() => {
    const timer = setInterval(() => {
      setFotoActiva((prev) => (prev + 1) % fotosBanner.length);
    }, 7000);

    return () => clearInterval(timer);
  }, [fotosBanner.length]);

  return (
    <div className="hoy-container">
      {/* 1. Tarjeta Blanca (Arriba) */}
      <section className="tarjeta-blanca-wrapper">
        {/* Encabezado con saludo y dirección */}
        <div className="saludo-header">
          <h2 className="saludo-titulo">Hola, Martín</h2>

          <div className="direccion-header">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor" className="icono-pin">
              <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z" />
            </svg>
            <span>Av. Las Palmas 450 · Barrio Los Olivos</span>
          </div>
        </div>

        {/* Tarjeta de estado de recolección */}
        <div className="tarjeta-blanca-card">
          <div className="tarjeta-blanca-cuerpo">
            <div className="estado-fila-principal">
              <div className="estado-textos">
                <span className="estado-pregunta">¿YA PASÓ POR TU PUERTA?</span>
                <h3 className="estado-alerta">NO HA PASADO</h3>
                <p className="estado-descripcion">El recolector está en camino hacia tu cuadra</p>
              </div>

              <div className="camion-badge">
                <img
                  src={camionRecolector}
                  alt="Camión recolector"
                  className="tarjeta-camion-img"
                />
              </div>
            </div>



            {/* Botón Ver Trayecto */}
            <div className="trayecto-boton-fila">
              <button
                type="button"
                className={`btn-ver-trayecto ${mostrarTrayecto ? 'activo' : ''}`}
                onClick={() => setMostrarTrayecto(!mostrarTrayecto)}
              >
                <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                  <polygon points="1 6 1 22 8 18 16 22 23 18 23 2 16 6 8 2 1 6" />
                  <line x1="8" y1="2" x2="8" y2="18" />
                  <line x1="16" y1="6" x2="16" y2="22" />
                </svg>
                <span>{mostrarTrayecto ? 'Ocultar trayecto' : 'Ver trayecto'}</span>
                <svg
                  width="14"
                  height="14"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  style={{ transform: mostrarTrayecto ? 'rotate(180deg)' : 'rotate(0deg)', transition: 'transform 0.2s' }}
                >
                  <polyline points="6 9 12 15 18 9" />
                </svg>
              </button>
            </div>

            {/* Mapa interactivo con línea verde oscura y el camión de Hoy */}
            {mostrarTrayecto && (
              <div className="mapa-trayecto-card">
                <div className="mapa-header-fila">
                  <span className="mapa-header-tag">
                    <span className="dot-mapa-vivo"></span>
                    Seguimiento en vivo
                  </span>
                  <span className="mapa-header-distancia">A 4 cuadras</span>
                </div>

                <div className="mapa-svg-wrapper">
                  <svg viewBox="0 0 400 240" className="mapa-svg" xmlns="http://www.w3.org/2000/svg">
                    <rect width="400" height="240" fill="#eaf2e8" rx="10" />

                    {/* Manzanas de la ciudad */}
                    <g fill="#dfead9">
                      <rect x="15" y="15" width="45" height="25" rx="3" />
                      <rect x="75" y="15" width="75" height="25" rx="3" />
                      <rect x="165" y="15" width="85" height="25" rx="3" />
                      <rect x="265" y="15" width="65" height="25" rx="3" />

                      <rect x="15" y="55" width="45" height="55" rx="3" />
                      <rect x="75" y="55" width="75" height="55" rx="3" />
                      <rect x="165" y="55" width="85" height="55" rx="3" />
                      <rect x="265" y="55" width="65" height="55" rx="3" />

                      <rect x="15" y="125" width="45" height="55" rx="3" />
                      <rect x="75" y="125" width="75" height="55" rx="3" />
                      <rect x="165" y="125" width="85" height="55" rx="3" />
                      <rect x="265" y="125" width="65" height="55" rx="3" />

                      <rect x="15" y="195" width="45" height="35" rx="3" />
                      <rect x="75" y="195" width="75" height="35" rx="3" />
                      <rect x="165" y="195" width="85" height="35" rx="3" />
                      <rect x="265" y="195" width="65" height="35" rx="3" />
                    </g>

                    {/* Calles principales (fondo blanco) */}
                    <g stroke="#ffffff" strokeWidth="12" strokeLinecap="round" strokeLinejoin="round">
                      <line x1="5" y1="45" x2="395" y2="45" />
                      <line x1="5" y1="115" x2="395" y2="115" />
                      <line x1="5" y1="185" x2="395" y2="185" />
                      <line x1="65" y1="5" x2="65" y2="235" />
                      <line x1="155" y1="5" x2="155" y2="235" />
                      <line x1="255" y1="5" x2="255" y2="235" />
                      <line x1="335" y1="5" x2="335" y2="235" />
                    </g>

                    {/* Nombres de calles de Trenque Lauquen */}
                    <text x="70" y="41" fontSize="8" fill="#607b5a" fontWeight="700">Av. Las Palmas</text>
                    <text x="70" y="111" fontSize="8" fill="#607b5a" fontWeight="700">Scalese</text>
                    <text x="70" y="181" fontSize="8" fill="#607b5a" fontWeight="700">Pellegrini</text>
                    <text x="260" y="41" fontSize="8" fill="#607b5a" fontWeight="700">Barrio Los Olivos</text>

                    {/* Línea verde oscura del trayecto */}
                    <path
                      d="M 35 185 L 155 185 L 155 115 L 255 115 L 255 45 L 325 45"
                      stroke="#1E6000"
                      strokeWidth="5.5"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      fill="none"
                    />

                    {/* Marcador de destino: Tu domicilio */}
                    <g transform="translate(325, 45)">
                      <circle cx="0" cy="0" r="14" fill="#dc2626" opacity="0.2" />
                      <circle cx="0" cy="0" r="6.5" fill="#dc2626" />
                      <circle cx="0" cy="0" r="2.5" fill="#ffffff" />
                      <rect x="-36" y="-23" width="72" height="15" rx="4" fill="#ffffff" stroke="#dc2626" strokeWidth="1" />
                      <text x="0" y="-12.5" textAnchor="middle" fontSize="8" fill="#991b1b" fontWeight="800">Tu domicilio</text>
                    </g>

                    {/* Marcador del camión sobre la línea verde oscura con el ícono de Hoy */}
                    <g transform="translate(195, 115)">
                      <circle cx="0" cy="0" r="18" fill="#1E6000" opacity="0.22" className="pulse-radar" />
                      <circle cx="0" cy="0" r="14" fill="#ffffff" stroke="#1E6000" strokeWidth="2.2" />
                      <image
                        href={truckIconImg}
                        x="-10"
                        y="-10"
                        width="20"
                        height="20"
                      />
                      <rect x="-44" y="17" width="88" height="15" rx="4" fill="#1E6000" />
                      <text x="0" y="28" textAnchor="middle" fontSize="7.8" fill="#ffffff" fontWeight="700">Recolector en vivo</text>
                    </g>
                  </svg>
                </div>
              </div>
            )}

            {/* Se retiraron los botones de '¿Pasó recién?' y 'Compartir' según lo solicitado */}
          </div>
        </div>
      </section>

      {/* 2. Tarjeta Verde (Abajo) */}
      <section className="tarjeta-verde-card">
        {/* Marca de agua del tacho de basura en el fondo */}
        <div className="marca-agua-tacho" aria-hidden="true">
          <svg viewBox="0 0 24 24" fill="currentColor">
            <path d="M19 4h-3.5l-1-1h-5l-1 1H5v2h14M6 19c0 1.1.9 2 2 2h8c1.1 0 2-.9 2-2V7H6v12z" />
          </svg>
        </div>

        {/* Fila superior de badges */}
        <div className="verde-fila-superior">
          <div className="badge-hoy-toca">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
              <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
              <line x1="16" y1="2" x2="16" y2="6" />
              <line x1="8" y1="2" x2="8" y2="6" />
              <line x1="3" y1="10" x2="21" y2="10" />
            </svg>
            <span>HOY TOCA</span>
          </div>

          <div className="badge-hora-19">
            19:00 h
          </div>
        </div>

        {/* Título y descripción */}
        <h3 className="verde-titulo">NO RECICLABLES</h3>
        <p className="verde-descripcion">
          Orgánicos, restos de comida, yerba y desecho sanitario común.
        </p>

        {/* Caja de recordatorio con switch */}
        <div className="recordatorio-fila">
          <div className="recordatorio-info">
            <div className="campana-icono">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#bef264" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
                <path d="M13.73 21a2 2 0 0 1-3.46 0" />
              </svg>
            </div>
            <div>
              <span className="recordatorio-titulo">Recordatorio de salida</span>
              <span className="recordatorio-subtitulo">Avisar a las 18:45 h</span>
            </div>
          </div>

          <button
            type="button"
            className={`switch-verde ${recordatorioActivo ? 'activo' : ''}`}
            onClick={() => setRecordatorioActivo(!recordatorioActivo)}
            aria-label="Alternar recordatorio de salida"
          >
            <span className="switch-perilla"></span>
          </button>
        </div>
      </section>

      {/* 3. Carrusel con las 2 fotos abajo del todo (rotación automática cada 7 segundos) */}
      <section className="carrusel-fotos-wrapper" aria-label="Información de recolección">
        <div className="carrusel-fotos-card">
          <div className="carrusel-slide-container">
            {fotosBanner.map((foto, index) => (
              <img
                key={foto.id}
                src={foto.src}
                alt={foto.alt}
                className={`carrusel-foto-img ${index === fotoActiva ? 'visible' : ''}`}
              />
            ))}
          </div>

          {/* Indicadores de diapositiva */}
          <div className="carrusel-indicadores">
            {fotosBanner.map((_, index) => (
              <button
                key={index}
                type="button"
                className={`carrusel-dot ${index === fotoActiva ? 'activo' : ''}`}
                onClick={() => setFotoActiva(index)}
                aria-label={`Ver diapositiva ${index + 1}`}
              />
            ))}
          </div>
        </div>
      </section>
    </div>
  );
};
