import { useState } from 'react'
import {
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  FormControl,
  FormHelperText,
  InputLabel,
  MenuItem,
  Select,
} from '@mui/material'
import { useContratoForm } from '../hooks/useContratoForm'
import type { ContratoConductor } from '../utils/contratoConductor'
import { ContratoCampos } from './ContratoCampos'
import './ContratoDialog.css'

type CamionOption = { code: string; label: string }

export function AsignarCamionDialog({ conductor, unidadInicial, contratoInicial, camiones, onConfirmar, onCerrar }: {
  conductor: string
  unidadInicial?: string | null
  contratoInicial?: ContratoConductor
  camiones: CamionOption[]
  onConfirmar: (codigo: string | null, contrato?: ContratoConductor) => void
  onCerrar: () => void
}) {
  const [codigo, setCodigo] = useState(unidadInicial ?? '')
  const [errorCamion, setErrorCamion] = useState('')
  const form = useContratoForm(contratoInicial)

  const confirmar = () => {
    if (!codigo) {
      onConfirmar(null)
      return
    }
    const contrato = form.validar()
    if (contrato) onConfirmar(codigo, contrato)
  }

  return <Dialog open fullWidth maxWidth="sm" onClose={onCerrar} aria-labelledby="asignar-camion-dialog-title">
    <DialogTitle id="asignar-camion-dialog-title">Asignar camión a {conductor}</DialogTitle>
    <DialogContent>
      <div className="contrato-campos">
        <FormControl color="success" fullWidth error={Boolean(errorCamion)}>
          <InputLabel id="asignar-camion-select-label">Camión</InputLabel>
          <Select
            labelId="asignar-camion-select-label"
            id="asignar-camion-select"
            label="Camión"
            value={codigo}
            onChange={(event) => {
              const seleccion = event.target.value
              setCodigo(seleccion)
              setErrorCamion('')
              form.reiniciar(seleccion && seleccion === unidadInicial ? contratoInicial : undefined)
            }}
          >
            <MenuItem value="">Sin asignar</MenuItem>
            {camiones.map((camion) => (
              <MenuItem key={camion.code} value={camion.code}>
                {camion.label}
              </MenuItem>
            ))}
          </Select>
          <FormHelperText>{errorCamion || 'Elegí la unidad y las fechas del contrato.'}</FormHelperText>
        </FormControl>

        {codigo && <ContratoCampos
          inicio={form.inicio} fin={form.fin} errores={form.errores}
          onChange={form.cambiar}
        />}
      </div>
    </DialogContent>
    <DialogActions>
      <Button color="inherit" onClick={onCerrar}>Cancelar</Button>
      <Button color="success" variant="contained" onClick={confirmar}>Guardar</Button>
    </DialogActions>
  </Dialog>
}
