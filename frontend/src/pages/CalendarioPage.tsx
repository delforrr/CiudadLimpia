import React from 'react';
import fotoCalendario from '../assets/calendario-recoleccion.jpg';
import videoPoloAmbiental from '../assets/Polo-ambiental-recoleccion-de-residuos.mp4';

export const CalendarioPage: React.FC = () => {
  return (
    <div className="calendario-container">
      <img
        src={fotoCalendario}
        alt="Sistema de Recolección de Residuos - Trenque Lauquen"
        className="calendario-img"
      />
      <video
        src={videoPoloAmbiental}
        className="calendario-video"
        controls
        playsInline
        preload="metadata"
      >
        Tu navegador no soporta la reproducción de video.
      </video>
    </div>
  );
};

export default CalendarioPage;
