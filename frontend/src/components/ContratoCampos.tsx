import { TextField } from '@mui/material'
import type { ErroresContrato } from '../utils/contratoConductor'

type Props = {
  inicio: string
  fin: string
  errores: ErroresContrato
  onChange: (campo: 'inicio' | 'fin', valor: string) => void
}

export function ContratoCampos({ inicio, fin, errores, onChange }: Props) {
  return <>
    <TextField label="Fecha de inicio" type="date" fullWidth required color="success"
      value={inicio} onChange={(event) => onChange('inicio', event.target.value)}
      error={Boolean(errores.inicio)} helperText={errores.inicio}
      slotProps={{ inputLabel: { shrink: true } }} />
    <TextField label="Fecha de fin (opcional)" type="date" fullWidth color="success"
      value={fin} onChange={(event) => onChange('fin', event.target.value)}
      error={Boolean(errores.fin)} helperText={errores.fin || 'Dejá vacío si no hay fecha de fin.'}
      slotProps={{ inputLabel: { shrink: true }, htmlInput: { min: inicio || undefined } }} />
  </>
}
