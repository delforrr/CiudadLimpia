import { Alert, Button, IconButton, TextField } from '@mui/material';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutlineOutlined';
import type { DomicilioForm } from '../schemas/profileSchema';
import { capitalizarInicial } from '../utils/capitalizarInicial';
import PerfilDomiciliosDesplegable from './PerfilDomiciliosDesplegable';
import './DomiciliosCard.css';

interface DomiciliosCardProps {
  domicilios: DomicilioForm[];
  onChange: (domicilios: DomicilioForm[]) => void;
  onAgregar?: () => void;
  onEliminar?: (domicilio: DomicilioForm) => void;
  readOnly?: boolean;
  expanded?: boolean;
  onExpandedChange?: (expanded: boolean) => void;
  disabled?: boolean;
  errors?: string[];
  title?: string;
  emptyText?: string;
}

export default function DomiciliosCard({
  domicilios,
  onChange,
  onAgregar = () => onChange([...domicilios, { direccion: '', etiqueta: '' }]),
  onEliminar,
  readOnly = false,
  expanded,
  onExpandedChange,
  disabled = false,
  errors,
  title = 'Mis domicilios',
  emptyText = 'No tenés domicilios registrados. Agregá al menos uno para continuar.',
}: DomiciliosCardProps) {
  const hayDomicilioSinGuardar = readOnly && domicilios.some((domicilio) => !domicilio.id);

  const agregar = (
    <Button className={readOnly ? 'domicilio-agregar' : undefined} type="button"
      disabled={disabled || domicilios.length >= 20 || hayDomicilioSinGuardar} onClick={onAgregar}>
      Agregar domicilio
    </Button>
  );

  const contenido = (
    <>
      {errors && <Alert severity="error">{errors.join('. ')}</Alert>}
      {domicilios.length === 0 && <p>{emptyText}</p>}
      {domicilios.map((domicilio, index) => {
        const eliminar = () => {
          if (onEliminar) {
            onEliminar(domicilio);
          } else {
            onChange(domicilios.filter((_, i) => i !== index));
          }
        };
        const etiquetaEliminar = `Eliminar domicilio ${index + 1}`;

        return (
          <div className="domicilio-item" key={domicilio.id ?? `nuevo-${index}`}>
            {readOnly ? (
              <div className="domicilio-resumen">
                <span>{capitalizarInicial(domicilio.direccion)}</span>
                {domicilio.etiqueta && <span className="domicilio-etiqueta">{capitalizarInicial(domicilio.etiqueta)}</span>}
              </div>
            ) : (
              <>
                <TextField label="Dirección" required fullWidth disabled={disabled}
                  type="text" id={`direccion-${index}`} name="direccion"
                  autoComplete="street-address" placeholder="Calle y número · Barrio"
                  value={domicilio.direccion} slotProps={{ htmlInput: { maxLength: 200 } }}
                  onChange={(event) => onChange(domicilios.map((item, i) => i === index ? { ...item, direccion: event.target.value } : item))} />
                <TextField label="Etiqueta (opcional)" fullWidth disabled={disabled}
                  type="text" id={`etiqueta-${index}`} name="etiqueta"
                  placeholder="Ej. Casa, Trabajo, Local" value={domicilio.etiqueta ?? ''}
                  slotProps={{ htmlInput: { maxLength: 100 } }}
                  onChange={(event) => onChange(domicilios.map((item, i) => i === index ? { ...item, etiqueta: event.target.value } : item))} />
              </>
            )}
            {readOnly ? (
              <IconButton type="button" size="small" disabled={disabled} color="success"
                title="Eliminar domicilio" aria-label={etiquetaEliminar} onClick={eliminar}>
                <DeleteOutlineIcon fontSize="small" />
              </IconButton>
            ) : (
              <Button type="button" disabled={disabled} color="error"
                aria-label={etiquetaEliminar} onClick={eliminar}>
                Eliminar domicilio
              </Button>
            )}
          </div>
        );
      })}
    </>
  );

  if (readOnly) {
    return (
      <PerfilDomiciliosDesplegable title={title} expanded={expanded} onExpandedChange={onExpandedChange}>
        {contenido}
        {agregar}
      </PerfilDomiciliosDesplegable>
    );
  }

  return (
    <section className="perfil-domicilios-box" aria-label={title}>
      <div className="perfil-domicilios-header">
        <h3>{title}</h3>
        {agregar}
      </div>
      {contenido}
    </section>
  );
}
