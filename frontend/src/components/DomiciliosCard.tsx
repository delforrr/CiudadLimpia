import { Alert, Button, TextField } from '@mui/material';
import type { Domicilio } from '../services/authService';
import './DomiciliosCard.css';

interface DomiciliosCardProps {
  domicilios: Domicilio[];
  onChange: (domicilios: Domicilio[]) => void;
  disabled?: boolean;
  errors?: string[];
}

export default function DomiciliosCard({ domicilios, onChange, disabled = false, errors }: DomiciliosCardProps) {
  return (
    <section className="perfil-domicilios-box" aria-label="Mis domicilios">
      <div className="perfil-domicilios-header">
        <h3>Mis domicilios</h3>
        <Button type="button" disabled={disabled || domicilios.length >= 20}
          onClick={() => onChange([...domicilios, { direccion: '', etiqueta: '' }])}>
          Agregar domicilio
        </Button>
      </div>
      {errors && <Alert severity="error">{errors.join('. ')}</Alert>}
      {domicilios.length === 0 && <p>No tenés domicilios registrados. Agregá al menos uno para continuar.</p>}
      {domicilios.map((domicilio, index) => (
        <div className="domicilio-item" key={index}>
          <TextField label="Dirección" required fullWidth disabled={disabled}
            autoComplete="street-address" placeholder="Calle y número · Barrio"
            value={domicilio.direccion} slotProps={{ htmlInput: { maxLength: 200 } }}
            onChange={(event) => onChange(domicilios.map((item, i) => i === index ? { ...item, direccion: event.target.value } : item))} />
          <TextField label="Etiqueta (opcional)" fullWidth disabled={disabled}
            placeholder="Ej. Casa, Trabajo, Local" value={domicilio.etiqueta ?? ''}
            slotProps={{ htmlInput: { maxLength: 100 } }}
            onChange={(event) => onChange(domicilios.map((item, i) => i === index ? { ...item, etiqueta: event.target.value } : item))} />
          <Button type="button" disabled={disabled} color="error"
            aria-label={`Eliminar domicilio ${index + 1}`}
            onClick={() => onChange(domicilios.filter((_, i) => i !== index))}>
            Eliminar domicilio
          </Button>
        </div>
      ))}
    </section>
  );
}
