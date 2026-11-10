import { Alert, Button, Chip, LinearProgress, Paper } from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
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
        <div className="trayectos-encabezado">
          <div>
            <h3>{trayecto.nombre}</h3>
            <p>{nombreLocalidad(trayecto.localidadId)}</p>
          </div>
          <div className="trayectos-acciones">
            <Button color="success" disabled={cargando} onClick={admin.volver}>Volver al listado</Button>
            <Button variant="outlined" color="success" disabled={cargando}
              onClick={() => void admin.abrir(trayecto.id, true)}>Editar trayecto</Button>
          </div>
        </div>
        {aviso && <Alert severity="success">{aviso}</Alert>}
        {error && <Alert severity="error">{error}</Alert>}
        {cargando && <LinearProgress aria-label="Cargando trayecto" />}
        <div className="trayectos-vistas">
          <TrayectoMapa key={trayecto.id} puntos={trayecto.puntos} linea={trayecto.geometria} />
          <div>
            <h4>Puntos de paso</h4>
            <PuntosTrayecto puntos={abrirBorrador(trayecto).puntos} />
          </div>
        </div>
      </Paper>
    );
  }

  return (
    <Paper component="section" variant="outlined" className="trayectos-panel" aria-label="Trayectos guardados">
      <div className="trayectos-encabezado">
        <h3>Trayectos guardados</h3>
        <Button variant="contained" color="success" startIcon={<AddIcon />} disabled={cargando || !localidades.length}
          onClick={admin.nuevo}>Nuevo trayecto</Button>
      </div>
      {error && <Alert severity="error" action={<Button color="inherit" onClick={() => void admin.cargar()}>Reintentar</Button>}>{error}</Alert>}
      {cargando && <LinearProgress aria-label="Cargando trayectos" />}
      {!cargando && !error && trayectos.length === 0 && <p>Todavía no hay trayectos guardados.</p>}
      {!cargando && !error && localidades.length === 0 && <Alert severity="warning">El catálogo de localidades está vacío.</Alert>}
      <ul className="trayectos-registros">
        {trayectos.map((trayecto) => (
          <li key={trayecto.id}>
            <div>
              <strong>{trayecto.nombre}</strong>
              <p>{nombreLocalidad(trayecto.localidadId)}</p>
            </div>
            <Chip size="small" label={`${trayecto.puntos.length} puntos`} />
            <div className="trayectos-acciones">
              <Button color="success" disabled={cargando} onClick={() => void admin.abrir(trayecto.id, false)}
                aria-label={`Ver detalle de ${trayecto.nombre}`}>Ver detalle</Button>
              <Button color="success" variant="outlined" disabled={cargando}
                onClick={() => void admin.abrir(trayecto.id, true)} aria-label={`Editar ${trayecto.nombre}`}>Editar</Button>
            </div>
          </li>
        ))}
      </ul>
    </Paper>
  );
}
