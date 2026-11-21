import { Alert, Button, TextField } from '@mui/material';
import type { FormEvent } from 'react';
import type { NuevoDomicilioForm } from '../schemas/profileSchema';
import { DomicilioMapa } from './DomicilioMapa';

type PerfilNuevoDomicilioProps = {
  domicilio: NuevoDomicilioForm;
  errores: Partial<Record<keyof NuevoDomicilioForm, string[]>>;
  onChange: (domicilio: NuevoDomicilioForm) => void;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
  onCancel: () => void;
  paso: 'datos' | 'mapa';
  onContinuar: (event: FormEvent<HTMLFormElement>) => void;
  onVolver: () => void;
};

export default function PerfilNuevoDomicilio({
  domicilio, errores, onChange, onSubmit, onCancel, paso, onContinuar, onVolver,
}: PerfilNuevoDomicilioProps) {
  return (
    <form className="perfil-edit-form perfil-nuevo-domicilio" onSubmit={paso === 'datos' ? onContinuar : onSubmit} noValidate>
      {paso === 'datos' ? <>
      <TextField
        label="Calle"
        size="small"
        color="success"
        autoFocus
        required
        value={domicilio.calle}
        slotProps={{ htmlInput: { maxLength: 200 } }}
        error={Boolean(errores.calle)}
        helperText={errores.calle?.[0]}
        onChange={(event) => onChange({ ...domicilio, calle: event.target.value })}
      />
      <TextField
        label="Altura"
        size="small"
        color="success"
        required
        value={domicilio.altura}
        slotProps={{ htmlInput: { inputMode: 'numeric', maxLength: 200 } }}
        error={Boolean(errores.altura)}
        helperText={errores.altura?.[0]}
        onChange={(event) => onChange({ ...domicilio, altura: event.target.value })}
      />
      <TextField
        label="Etiqueta (opcional)"
        size="small"
        color="success"
        value={domicilio.etiqueta ?? ''}
        slotProps={{ htmlInput: { maxLength: 100 } }}
        error={Boolean(errores.etiqueta)}
        helperText={errores.etiqueta?.[0]}
        onChange={(event) => onChange({ ...domicilio, etiqueta: event.target.value })}
      />
      </> : <>
        <DomicilioMapa calle={domicilio.calle} altura={domicilio.altura} ubicacion={domicilio.ubicacion}
          onChange={(ubicacion) => onChange({ ...domicilio, ubicacion })} />
        {errores.ubicacion && <Alert severity="error">{errores.ubicacion[0]}</Alert>}
      </>}
      <div className="perfil-edit-acciones">
        {paso === 'mapa' && <Button type="button" className="btn-cancelar-edicion" onClick={onVolver}>Volver</Button>}
        <Button type="submit" className="login-button" disabled={paso === 'mapa' && !domicilio.ubicacion}>
          {paso === 'datos' ? 'Continuar' : 'Confirmar domicilio'}
        </Button>
        {paso === 'datos' && <Button type="button" className="btn-cancelar-edicion" onClick={onCancel}>Cancelar</Button>}
      </div>
    </form>
  );
}
