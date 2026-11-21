import { Alert, Button, Dialog, DialogActions, DialogContent, DialogTitle, Paper } from '@mui/material';
import { ZonaFormulario } from './ZonaFormulario';
import AddIcon from '@mui/icons-material/Add';
import PlaceOutlinedIcon from '@mui/icons-material/PlaceOutlined';
import type { useAdminZonas } from '../hooks/useAdminZonas';
import type { Trayecto } from '../services/trayectosService';

export function AdminZonas({ admin, trayectos }: { admin: ReturnType<typeof useAdminZonas>; trayectos: Trayecto[] }) {
  const asignados = (id: string) => trayectos.filter((trayecto) => admin.asignaciones[trayecto.id] === id);
  const cantidad = (id: string) => Object.values(admin.asignaciones).filter((zonaId) => zonaId === id).length;

  return <Paper component="section" variant="outlined" className="trayectos-panel" aria-label="Zonas de recolección">
    <div className="trayectos-cabecera">
      <div className="trayectos-identidad">
        <span className="trayectos-icono"><PlaceOutlinedIcon /></span>
        <div><h3>Zonas de recolección</h3><p>Una zona puede agrupar varios trayectos.</p></div>
      </div>
      <Button variant="contained" color="success" startIcon={<AddIcon />} disabled={admin.bloqueado}
        onClick={() => admin.abrirFormulario()}>Nueva zona</Button>
    </div>
    <p className="trayectos-ayuda">Las zonas y sus asignaciones se guardan en este navegador.</p>
    {admin.error && <Alert severity="error">{admin.error}</Alert>}
    {admin.zonas.length === 0 && <div className="trayectos-vacio">
      <span className="trayectos-icono"><PlaceOutlinedIcon /></span>
      <h4>Todavía no hay zonas</h4><p>Creá una zona para agrupar los recorridos de recolección.</p>
    </div>}
    {admin.zonas.length > 0 && <ul className="trayectos-registros">
      {admin.zonas.map((zona) => <li key={zona.id}>
        <div className="trayectos-identidad">
          <span className="trayectos-icono"><PlaceOutlinedIcon /></span>
          <div><h4>{zona.nombre}</h4>{zona.descripcion && <p>{zona.descripcion}</p>}</div>
        </div>
        <div className="trayectos-tarjeta-pie">
          <span className="trayectos-recuento">{cantidad(zona.id)} {cantidad(zona.id) === 1 ? 'trayecto' : 'trayectos'}</span>
          <div className="trayectos-acciones">
            <Button color="success" size="small" onClick={() => admin.setDetalle(zona)} aria-label={`Ver detalle de ${zona.nombre}`}>Ver detalle</Button>
            <Button color="success" size="small" variant="outlined" onClick={() => admin.abrirFormulario(zona)} aria-label={`Editar zona ${zona.nombre}`}>Editar</Button>
            <Button color="error" size="small" onClick={() => admin.setPendienteEliminar(zona)} aria-label={`Eliminar zona ${zona.nombre}`}>Eliminar</Button>
          </div>
        </div>
      </li>)}
    </ul>}
    <ZonaFormulario admin={admin} />
    <Dialog className="admin-module-dialog" open={Boolean(admin.detalle)} onClose={() => admin.setDetalle(null)} fullWidth maxWidth="sm" aria-labelledby="zona-detail-title">
      <DialogTitle id="zona-detail-title">{admin.detalle?.nombre}</DialogTitle>
      <DialogContent dividers>
        <p>{admin.detalle?.descripcion || 'Sin descripción'}</p>
        <h4>Trayectos de la zona</h4>
        {admin.detalle && (asignados(admin.detalle.id).length ? <ul>
          {asignados(admin.detalle.id).map((trayecto) => <li key={trayecto.id}>{trayecto.nombre}</li>)}
        </ul> : <p>No hay trayectos disponibles para mostrar en esta zona.</p>)}
      </DialogContent>
      <DialogActions><Button color="success" onClick={() => admin.setDetalle(null)}>Cerrar</Button></DialogActions>
    </Dialog>
    <Dialog className="admin-module-dialog" open={Boolean(admin.pendienteEliminar)} onClose={() => admin.setPendienteEliminar(null)} fullWidth maxWidth="sm" aria-labelledby="zona-delete-title">
      <DialogTitle id="zona-delete-title">Eliminar zona</DialogTitle>
      <DialogContent>
        <p>¿Querés eliminar la zona {admin.pendienteEliminar?.nombre}?</p>
        {admin.pendienteEliminar && cantidad(admin.pendienteEliminar.id) > 0 && <Alert severity="warning">Reasigná sus trayectos a otra zona antes de eliminarla.</Alert>}
      </DialogContent>
      <DialogActions><Button color="inherit" onClick={() => admin.setPendienteEliminar(null)}>Cancelar</Button>
        <Button color="error" disabled={Boolean(admin.pendienteEliminar && cantidad(admin.pendienteEliminar.id) > 0)} onClick={admin.eliminar}>Eliminar</Button></DialogActions>
    </Dialog>
  </Paper>;
}
