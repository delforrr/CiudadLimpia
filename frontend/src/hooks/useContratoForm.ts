import { useState } from 'react'
import { validarContrato, type ContratoConductor, type ErroresContrato } from '../utils/contratoConductor'

export function useContratoForm() {
  const [fechas, setFechas] = useState({ inicio: '', fin: '' })
  const [errores, setErrores] = useState<ErroresContrato>({})
  return {
    ...fechas, errores,
    cambiar: (campo: 'inicio' | 'fin', valor: string) => setFechas((actual) => ({ ...actual, [campo]: valor })),
    validar: (): ContratoConductor | null => {
      const problemas = validarContrato(fechas.inicio, fechas.fin)
      setErrores(problemas)
      return Object.keys(problemas).length ? null : { inicio: fechas.inicio, fin: fechas.fin || undefined }
    },
  }
}
