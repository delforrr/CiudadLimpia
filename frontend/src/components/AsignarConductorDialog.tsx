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

export function AsignarConductorDialog({ unidad, conductores, conductorInicial, contratoInicial, onConfirmar, onCerrar }: {
  unidad: string
  conductores: string[]
  conductorInicial?: string
  contratoInicial?: ContratoConductor
  onConfirmar: (nombre: string, contrato: ContratoConductor) => void
  onCerrar: () => void
}) {
  const [nombre, setNombre] = useState(conductorInicial ?? '')
  const [errorConductor, setErrorConductor] = useState('')
  const form = useContratoForm(contratoInicial)

  const confirmar = () => {
    if (!nombre) {
      setErrorConductor('Elegí un conductor')
      return
    }
    const contrato = form.validar()
    if (contrato) onConfirmar(nombre, contrato)
  }

  return <Dialog open fullWidth maxWidth="sm" onClose={onCerrar} aria-labelledby="asignar-conductor-dialog-title">
    <DialogTitle id="asignar-conductor-dialog-title">Asignar conductor a {unidad}</DialogTitle>
    <DialogContent>
      <div className="contrato-campos">
        <FormControl color="success" fullWidth error={Boolean(errorConductor)}>
          <InputLabel id="asignar-conductor-select-label">Conductor</InputLabel>
          <Select
            labelId="asignar-conductor-select-label"
            id="asignar-conductor-select"
            label="Conductor"
            value={nombre}
            onChange={(event) => {
              const seleccion = event.target.value
              setNombre(seleccion)
              setErrorConductor('')
              form.reiniciar(seleccion === conductorInicial ? contratoInicial : undefined)
            }}
          >
            {conductores.map((conductor) => (
              <MenuItem key={conductor} value={conductor}>
                {conductor}
              </MenuItem>
            ))}
          </Select>
          <FormHelperText>{errorConductor || 'Elegí el conductor y las fechas del contrato.'}</FormHelperText>
        </FormControl>

        {nombre && <ContratoCampos
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
