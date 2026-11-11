import { Alert, Button, LinearProgress, Paper } from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import ArrowForwardIcon from '@mui/icons-material/ArrowForward';
import EditOutlinedIcon from '@mui/icons-material/EditOutlined';
import PlaceOutlinedIcon from '@mui/icons-material/PlaceOutlined';
import RouteOutlinedIcon from '@mui/icons-material/RouteOutlined';
import { useAdminTrayectos } from '../hooks/useAdminTrayectos';
import { abrirBorrador } from '../utils/trayectoEditor';
import { PuntosTrayecto, TrayectoEditor } from './TrayectoEditor';
import { TrayectoMapa } from './TrayectoMapa';
import './AdminTrayectos.css';

export function AdminTrayectos() {
  const admin = useAdminTrayectos();
  const { vista, localidades, trayectos, cargando, error, aviso } = admin;
  const nombreLocalidad = (id: string) => localidades.find((localidad) => localidad.id === id)?.nombre ?? id;

  if (vista.tipo === 'editor') {
    return <TrayectoEditor inicial={vista.borrador} localidades={localidades}
      onCancelar={admin.volver} onGuardado={admin.guardado} />;
  }

  if (vista.tipo === 'detalle') {
    const { trayecto } = vista;
    return (
      <Paper component="section" variant="outlined" className="trayectos-panel" aria-label="Detalle del trayecto">
        <div className="trayectos-cabecera">
          <div className="trayectos-identidad">
            <span className="trayectos-icono"><RouteOutlinedIcon /></span>
            <div>
              <h3>{trayecto.nombre}</h3>
              <p className="trayectos-localidad"><PlaceOutlinedIcon />{nombreLocalidad(trayecto.localidadId)}</p>
            </div>
          </div>
          <div className="trayectos-acciones">
            <Button color="success" startIcon={<ArrowBackIcon />} disabled={cargando}
              onClick={admin.volver}>Volver al listado</Button>
            <Button variant="outlined" color="success" startIcon={<EditOutlinedIcon />} disabled={cargando}
              onClick={() => void admin.abrir(trayecto.id, true)}>Editar trayecto</Button>
          </div>
        </div>
        {aviso && <Alert severity="success">{aviso}</Alert>}
        {error && <Alert severity="error">{error}</Alert>}
        {cargando && <LinearProgress aria-label="Cargando trayecto" />}
        <div className="trayectos-vistas">
          <TrayectoMapa key={trayecto.id} puntos={trayecto.puntos} linea={trayecto.geometria} />
          <div className="trayectos-vista-puntos">
            <h4>Puntos de paso</h4>
            <PuntosTrayecto puntos={abrirBorrador(trayecto).puntos} />
          </div>
        </div>
      </Paper>
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
        <Button variant="contained" color="success" startIcon={<AddIcon />} disabled={cargando || !localidades.length}
          onClick={admin.nuevo}>Nuevo trayecto</Button>
      </div>
      {error && <Alert severity="error" action={<Button color="inherit" onClick={() => void admin.cargar()}>Reintentar</Button>}>{error}</Alert>}
      {cargando && <LinearProgress aria-label="Cargando trayectos" />}
      {!cargando && !error && trayectos.length === 0 && (
        <div className="trayectos-vacio">
          <span className="trayectos-icono"><PlaceOutlinedIcon /></span>
          <h4>Todavía no hay trayectos</h4>
          {localidades.length > 0 && <p>Creá un recorrido y marcá sus puntos de paso en el mapa.</p>}
        </div>
      )}
      {!cargando && !error && localidades.length === 0 && <Alert severity="warning">El catálogo de localidades está vacío.</Alert>}
      {trayectos.length > 0 && <ul className="trayectos-registros" role="list">
        {trayectos.map((trayecto) => (
          <li key={trayecto.id}>
            <div className="trayectos-identidad">
              <span className="trayectos-icono"><RouteOutlinedIcon fontSize="small" /></span>
              <div>
                <h4>{trayecto.nombre}</h4>
                <p className="trayectos-localidad"><PlaceOutlinedIcon />{nombreLocalidad(trayecto.localidadId)}</p>
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
