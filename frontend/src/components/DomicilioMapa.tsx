import { Alert, Button } from '@mui/material';
import type { Coordenadas, LineaTrayecto } from '../services/trayectosService';
import { useUbicacionDomicilio } from '../hooks/useUbicacionDomicilio';
import { TrayectoMapa } from './TrayectoMapa';
import './DomicilioMapa.css';

const lineaVacia: LineaTrayecto = { type: 'LineString', coordinates: [] };
const puntosVacios: Coordenadas[] = [];

export function DomicilioMapa({ calle, altura, ubicacion, onChange }: {
  calle: string; altura: string; ubicacion?: Coordenadas; onChange: (posicion: Coordenadas | undefined) => void;
}) {
  const mapa = useUbicacionDomicilio(calle, altura, ubicacion, onChange);
  return <section className="domicilio-ubicacion" aria-label="Confirmar ubicación del domicilio">
    <p>Poné el pin en la entrada de tu casa, del lado de la vereda. Podés arrastrarlo o tocar el mapa antes de confirmar.</p>
    {mapa.buscando && <p role="status">Buscando tu dirección…</p>}
    {mapa.mensaje && <Alert className="domicilio-ubicacion-aviso" severity="info">{mapa.mensaje}</Alert>}
    {mapa.sugerencias.length > 1 && <div className="domicilio-ubicacion-sugerencias" aria-label="Direcciones encontradas">
      {mapa.sugerencias.map((sugerencia, indice) => <Button key={indice} type="button" color="success" size="small"
        onClick={() => mapa.elegir(sugerencia, true)}>{sugerencia.nombre}</Button>)}
    </div>}
    <TrayectoMapa puntos={puntosVacios} linea={lineaVacia} domicilio={mapa.posicion}
      centrarEn={mapa.centrarEn} onMarcar={(punto) => mapa.elegir(punto, true)} onMoverDomicilio={mapa.elegir}
      onDescartarDomicilio={mapa.descartar} />
    <small className="domicilio-ubicacion-fuente">
      <a href="https://www.argentina.gob.ar/georef" target="_blank" rel="noreferrer">Servicio Georef – argentina.gob.ar/georef</a>
      {mapa.sugerencias.length > 0 && ' · Ubicación aproximada, ajustable por el usuario.'}
    </small>
  </section>;
}
