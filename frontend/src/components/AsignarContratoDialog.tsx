import { useState } from 'react'
import {
  Alert, Button, Dialog, DialogActions, DialogContent, DialogTitle,
  FormControl, FormHelperText, InputLabel, MenuItem, Select,
} from '@mui/material'
import { useContratoForm } from '../hooks/useContratoForm'
import type { ContratoConductor } from '../utils/contratoConductor'
import { ContratoCampos } from './ContratoCampos'
import './ContratoDialog.css'

export function AsignarContratoDialog({ titulo, campo, opciones, onConfirmar, onCerrar }: {
  titulo: string
  campo: string
  opciones: { id: string; label: string }[]
  onConfirmar: (id: string, contrato: ContratoConductor) => Promise<void>
  onCerrar: () => void
}) {
  const [id, setId] = useState('')
  const [guardando, setGuardando] = useState(false)
  const [error, setError] = useState('')
  const form = useContratoForm()

  const confirmar = async () => {
    if (!id || guardando) return
    const contrato = form.validar()
    if (!contrato) return
    setGuardando(true)
    setError('')
    try {
      await onConfirmar(id, contrato)
      onCerrar()
    } catch (fallo) {
      setError(fallo instanceof Error ? fallo.message : 'No se pudo registrar el contrato.')
    } finally {
      setGuardando(false)
    }
  }

  return <Dialog open fullWidth maxWidth="sm" onClose={guardando ? undefined : onCerrar}
    aria-labelledby="asignar-contrato-dialog-title">
    <DialogTitle id="asignar-contrato-dialog-title">{titulo}</DialogTitle>
    <DialogContent>
      <div className="contrato-campos">
        {error && <Alert severity="error">{error}</Alert>}
        <FormControl color="success" fullWidth disabled={guardando || opciones.length === 0}>
          <InputLabel id="asignar-contrato-select-label">{campo}</InputLabel>
          <Select labelId="asignar-contrato-select-label" label={campo} value={id}
            onChange={(event) => setId(event.target.value)}>
            {opciones.map((opcion) => (
              <MenuItem key={opcion.id} value={opcion.id}>{opcion.label}</MenuItem>
            ))}
          </Select>
          {opciones.length === 0 && <FormHelperText>No hay opciones activas.</FormHelperText>}
        </FormControl>
        {id && <ContratoCampos inicio={form.inicio} fin={form.fin} errores={form.errores}
          onChange={form.cambiar} disabled={guardando} />}
      </div>
    </DialogContent>
    <DialogActions>
      <Button color="inherit" onClick={onCerrar} disabled={guardando}>Cancelar</Button>
      <Button color="success" variant="contained" onClick={confirmar} disabled={!id || guardando}>
        {guardando ? 'Guardando…' : 'Guardar'}
      </Button>
    </DialogActions>
  </Dialog>
}
