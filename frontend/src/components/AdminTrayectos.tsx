import { useState } from 'react';
import { Alert, Button, Paper, ToggleButton, ToggleButtonGroup } from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import ArrowForwardIcon from '@mui/icons-material/ArrowForward';
import EditOutlinedIcon from '@mui/icons-material/EditOutlined';
import PlaceOutlinedIcon from '@mui/icons-material/PlaceOutlined';
import RouteOutlinedIcon from '@mui/icons-material/RouteOutlined';
import type { useAdminTrayectos } from '../hooks/useAdminTrayectos';
import type { Trayecto } from '../services/trayectosService';
import { abrirBorrador } from '../utils/trayectoEditor';
import { PuntosTrayecto, TrayectoEditor } from './TrayectoEditor';
import { TrayectoMapa } from './TrayectoMapa';
import { useAdminZonas } from '../hooks/useAdminZonas';
import { AdminZonas } from './AdminZonas';
import './AdminTrayectos.css';

export function AdminTrayectos({ admin }: { admin: ReturnType<typeof useAdminTrayectos> }) {
  const zonas = useAdminZonas();
  const [apartado, setApartado] = useState<'trayectos' | 'zonas'>('trayectos');
  const listado = admin.vista.tipo === 'lista';

  return <div className="trayectos-modulo">
    {listado && <ToggleButtonGroup className="trayectos-secciones" exclusive color="success" size="small"
      value={apartado} aria-label="Ver trayectos o zonas"
      onChange={(_, valor: typeof apartado | null) => { if (valor) setApartado(valor); }}>
      <ToggleButton value="trayectos"><RouteOutlinedIcon fontSize="small" />Trayectos</ToggleButton>
      <ToggleButton value="zonas"><PlaceOutlinedIcon fontSize="small" />Zonas</ToggleButton>
    </ToggleButtonGroup>}
    {listado && apartado === 'zonas' ? <AdminZonas admin={zonas} trayectos={admin.trayectos} /> : <>
      {zonas.error && <Alert severity="error">{zonas.error}</Alert>}
      {listado && zonas.zonas.length === 0 && !zonas.bloqueado && <Alert severity="info"
        action={<Button color="inherit" onClick={() => setApartado('zonas')}>Ir a Zonas</Button>}>
        Creá una zona antes de agregar un trayecto.
      </Alert>}
      <TrayectosContenido admin={admin} zonas={zonas} />
    </>}
  </div>;
}

function TrayectosContenido({ admin, zonas }: {
  admin: ReturnType<typeof useAdminTrayectos>;
  zonas: ReturnType<typeof useAdminZonas>;
}) {
  const { vista, localidades, localidadFija, trayectos, cargando, error, aviso } = admin;
  const nombreLocalidad = (id: string) => localidades.find((localidad) => localidad.id === id)?.nombre ?? id;
  const nombreZona = (id: string) => zonas.zonas.find((zona) => zona.id === zonas.asignaciones[id])?.nombre ?? 'Sin zona asignada';

  if (vista.tipo === 'editor') {
    return <TrayectoEditor inicial={{ ...vista.borrador, zonaId: vista.borrador.id ? zonas.asignaciones[vista.borrador.id] : undefined }}
      zonas={zonas.zonas} onCancelar={admin.volver} onGuardado={(trayecto, zonaId) => {
        zonas.asignar(trayecto.id, zonaId);
        admin.guardado(trayecto);
      }} />;
  }

  if (vista.tipo === 'detalle') {
    const { trayecto } = vista;
    return (
      <DetalleTrayecto key={trayecto.id} trayecto={trayecto} localidad={nombreLocalidad(trayecto.localidadId)}
        zona={nombreZona(trayecto.id)}
        cargando={cargando} error={error} aviso={aviso} volver={admin.volver}
        editar={() => void admin.abrir(trayecto.id, true)} />
    );
  }

  return (
    <Paper component="section" variant="outlined" className="trayectos-panel" aria-label="Trayectos guardados">
      <div className="trayectos-cabecera">
        <div className="trayectos-identidad">
          <span className="trayectos-icono"><RouteOutlinedIcon /></span>
          <div>
            <h3>Trayectos guardados</h3>
            {!cargando && !error && trayectos.length > 0 && <p>{trayectos.length === 1 ? '1 recorrido' : `${trayectos.length} recorridos`}</p>}
          </div>
        </div>
        <Button variant="contained" color="success" startIcon={<AddIcon />} disabled={cargando || !localidadFija || zonas.zonas.length === 0 || zonas.bloqueado}
          onClick={admin.nuevo}>Nuevo trayecto</Button>
      </div>
      {error && <Alert severity="error" action={<Button color="inherit" onClick={() => void admin.cargar()}>Reintentar</Button>}>{error}</Alert>}
      {!cargando && !error && trayectos.length === 0 && (
        <div className="trayectos-vacio">
          <span className="trayectos-icono"><PlaceOutlinedIcon /></span>
          <h4>Todavía no hay trayectos</h4>
          {localidadFija && <p>Creá un recorrido y marcá sus puntos de paso en el mapa.</p>}
        </div>
      )}
      {!cargando && !error && !localidadFija && <Alert severity="warning">Trenque Lauquen no está disponible en el catálogo de localidades.</Alert>}
      {trayectos.length > 0 && <ul className="trayectos-registros" role="list">
        {trayectos.map((trayecto) => (
          <li key={trayecto.id}>
            <div className="trayectos-identidad">
              <span className="trayectos-icono"><RouteOutlinedIcon fontSize="small" /></span>
              <div>
                <h4>{trayecto.nombre}</h4>
                <p className="trayectos-localidad"><PlaceOutlinedIcon />{nombreZona(trayecto.id)}</p>
              </div>
            </div>
            <div className="trayectos-tarjeta-pie">
              <span className="trayectos-recuento">{trayecto.puntos.length === 1 ? '1 punto' : `${trayecto.puntos.length} puntos`}</span>
              <div className="trayectos-acciones">
                <Button size="small" color="success" endIcon={<ArrowForwardIcon />} disabled={cargando}
                  onClick={() => void admin.abrir(trayecto.id, false)} aria-label={`Ver detalle de ${trayecto.nombre}`}>Ver detalle</Button>
                <Button size="small" color="success" variant="outlined" disabled={cargando}
                  onClick={() => void admin.abrir(trayecto.id, true)} aria-label={`Editar ${trayecto.nombre}`}>Editar</Button>
              </div>
            </div>
          </li>
        ))}
      </ul>}
    </Paper>
  );
}

export function DetalleTrayecto({ trayecto, localidad, zona, cargando = false, aviso, error, volver, editar }: {
  trayecto: Trayecto;
  localidad: string;
  zona?: string;
  cargando?: boolean;
  aviso?: string;
  error?: string;
  volver?: () => void;
  editar?: () => void;
}) {
  const [panel, setPanel] = useState<'mapa' | 'opciones'>('mapa');

  return (
    <Paper component="section" variant="outlined" className="trayectos-panel trayectos-detalle" aria-label="Detalle del trayecto">
      <ToggleButtonGroup className="trayectos-alternar" size="small" exclusive value={panel}
        onChange={(_, valor: typeof panel | null) => { if (valor) setPanel(valor); }} aria-label="Vista del trayecto">
        <ToggleButton value="mapa">Mapa</ToggleButton>
        <ToggleButton value="opciones">Detalles</ToggleButton>
      </ToggleButtonGroup>
      <div className="trayectos-espacio-mapa" data-panel={panel}>
        <div className="trayectos-mapa-editor">
          <TrayectoMapa puntos={trayecto.puntos} linea={trayecto.geometria} />
        </div>
        <aside className="trayectos-opciones" aria-label="Datos y acciones del trayecto" tabIndex={0}>
          <div className="trayectos-cabecera trayectos-cabecera-lateral">
            <div className="trayectos-identidad">
              <span className="trayectos-icono"><RouteOutlinedIcon /></span>
              <div>
                <h3>{trayecto.nombre}</h3>
                <p className="trayectos-localidad"><PlaceOutlinedIcon />{localidad}</p>
                {zona && <p className="trayectos-localidad">Zona: {zona}</p>}
              </div>
            </div>
            {(volver || editar) && <div className="trayectos-acciones">
              {volver && <Button size="small" color="success" startIcon={<ArrowBackIcon />} disabled={cargando}
                onClick={volver}>Volver al listado</Button>}
              {editar && <Button size="small" variant="outlined" color="success" startIcon={<EditOutlinedIcon />} disabled={cargando}
                onClick={editar}>Editar trayecto</Button>}
            </div>}
          </div>
          {aviso && <Alert severity="success">{aviso}</Alert>}
          {error && <Alert severity="error">{error}</Alert>}
          <div className="trayectos-vista-puntos">
            <h4>Puntos de paso</h4>
            <PuntosTrayecto puntos={abrirBorrador(trayecto).puntos} />
          </div>
        </aside>
      </div>
    </Paper>
  );
}
