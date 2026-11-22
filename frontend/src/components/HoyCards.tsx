import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { Alert, Button } from '@mui/material';
import { useAuthContext } from '../hooks/useAuthContext';
import { useDomicilioActual } from '../hooks/useDomicilioActual';
import { useMapaHoy } from '../hooks/useMapaHoy';
import { useAvisosPush } from '../hooks/useAvisosPush';
import type { User } from '../services/authService';
import camionRecolector from '../assets/camion-recolector.png';
import residuosReciclables from '../assets/residuos-reciclables.png';
import residuosNoReciclables from '../assets/residuos-no-reciclables.png';
import { TrayectoMapa } from './TrayectoMapa';
import HoyDomicilio from './HoyDomicilio';
import './HoyCards.css';

const fotosBanner = [
  { src: residuosReciclables, alt: 'Lunes y jueves: Reciclables' },
  { src: residuosNoReciclables, alt: 'Martes, miércoles, viernes y domingo: No Reciclables' },
];
const puntosVacios: [] = [];

function SeguimientoHoy({ user }: { user: User }) {
  const domicilio = useDomicilioActual(user);
  const { actual } = domicilio;
  const { mapa, camiones, cargando, errorMapa, errorPosiciones } = useMapaHoy(actual?.id);
  const avisos = useAvisosPush(user.id, actual?.id, user.cliente?.domicilios);
  const lineas = useMemo(() => mapa?.trayectos.map(({ geometria }) => geometria), [mapa]);
  const cantidad = camiones?.length ?? 0;

  return (
    <section className="tarjeta-blanca-wrapper" aria-label="Seguimiento de recolección">
      <div className="saludo-header">
        <h2 className="saludo-titulo">Hola, {user.cliente?.name || user.email}</h2>
        <HoyDomicilio {...domicilio} />
      </div>
      <div className="tarjeta-blanca-card">
        <div className="tarjeta-blanca-cuerpo">
          <div className="estado-fila-principal">
            <div className="estado-textos">
              <h3 className="estado-alerta">Recolección en vivo</h3>
              <p className="estado-descripcion" role="status">
                {!actual ? 'Elegí un domicilio para consultar los recorridos.' :
                  cargando ? 'Buscando el trayecto de tu domicilio…' :
                  errorMapa ? 'No se pudo cargar el trayecto. Recargá la página para reintentar.' :
                  errorPosiciones ? 'La posición de los camiones no está disponible.' :
                  !mapa?.trayectos.length ? 'Sin trayectos confirmados para tu domicilio.' :
                  !camiones ? 'Buscando camiones para tu domicilio…' :
                  cantidad === 0 ? 'Sin camiones activos para tu domicilio.' :
                  cantidad === 1 ? '1 camión en el recorrido de tu domicilio.' :
                  `${cantidad} camiones en los recorridos de tu domicilio.`}
              </p>
            </div>
            <div className="camion-badge" aria-hidden="true">
              <img src={camionRecolector} alt="" className="tarjeta-camion-img" />
            </div>
          </div>
          {avisos?.error && <Alert severity="warning">{avisos.error}</Alert>}
          {avisos?.activo && <p className="estado-descripcion">Avisos activados para este domicilio.</p>}
          {mapa && (
            <div className="mapa-trayecto-card">
              <div className="hoy-mapa">
                <TrayectoMapa key={actual?.id} puntos={puntosVacios} lineas={lineas}
                  camiones={camiones} domicilio={mapa.domicilio} zoomInicial={16} mostrarBotonCentrarDomicilio />
              </div>
            </div>
          )}
        </div>
      </div>
    </section>
  );
}

export function HoyCards() {
  const { user } = useAuthContext();
  const [fotoActiva, setFotoActiva] = useState(0);

  useEffect(() => {
    const timer = setInterval(() => setFotoActiva((prev) => (prev + 1) % fotosBanner.length), 7000);
    return () => clearInterval(timer);
  }, []);

  return (
    <div className="hoy-container">
      {user ? <SeguimientoHoy key={user.id} user={user} /> : (
        <section className="tarjeta-login-invitacion">
          <div className="invitacion-cuerpo">
            <div className="invitacion-textos">
              <h3 className="invitacion-titulo">Recolección en vivo</h3>
              <p className="invitacion-desc">Iniciá sesión para ver los camiones que recorren la calle de tu domicilio.</p>
            </div>
            <Button component={Link} to="/perfil" className="btn-ir-iniciar-sesion">Iniciar sesión</Button>
          </div>
        </section>
      )}
      <section className="carrusel-fotos-wrapper" aria-label="Información de recolección">
        <div className="carrusel-fotos-card">
          <div className="carrusel-slide-container">
            {fotosBanner.map((foto, index) => (
              <img key={foto.src} src={foto.src} alt={foto.alt} aria-hidden={index !== fotoActiva}
                className={`carrusel-foto-img ${index === fotoActiva ? 'visible' : ''}`} />
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}
