import { Alert, Button, Dialog, DialogActions, DialogContent, DialogTitle, TextField } from '@mui/material';
import type { useAdminZonas } from '../hooks/useAdminZonas';

export function ZonaFormulario({ admin }: { admin: ReturnType<typeof useAdminZonas> }) {
  return (<Dialog className="admin-module-dialog" open={Boolean(admin.formulario)} onClose={admin.cerrarFormulario} fullWidth maxWidth="sm" aria-labelledby="zona-form-title">
      <DialogTitle id="zona-form-title">{admin.formulario?.id ? 'Editar zona' : 'Nueva zona'}</DialogTitle>
      <DialogContent dividers>
        <form id="zona-form" className="zonas-formulario" noValidate onSubmit={(event) => { event.preventDefault(); admin.guardar(); }}>
          {admin.errorForm && <Alert severity="error">{admin.errorForm}</Alert>}
          {admin.error && <Alert severity="error">{admin.error}</Alert>}
          <TextField label="Nombre de la zona" required autoFocus fullWidth color="success" value={admin.formulario?.nombre ?? ''}
            slotProps={{ htmlInput: { maxLength: 100 } }} onChange={(event) => admin.cambiarCampo('nombre', event.target.value)} />
          <TextField label="Descripción (opcional)" fullWidth multiline minRows={2} color="success" value={admin.formulario?.descripcion ?? ''}
            slotProps={{ htmlInput: { maxLength: 300 } }} onChange={(event) => admin.cambiarCampo('descripcion', event.target.value)} />
        </form>
      </DialogContent>
      <DialogActions><Button color="inherit" onClick={admin.cerrarFormulario}>Cancelar</Button>
        <Button color="success" variant="contained" type="submit" form="zona-form">Guardar zona</Button></DialogActions>
    </Dialog>);
}
