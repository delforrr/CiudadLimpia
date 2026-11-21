import { useState } from 'react'
import { validarContrato, type ContratoConductor, type ErroresContrato } from '../utils/contratoConductor'

export function useContratoForm(contrato?: ContratoConductor) {
  const [fechas, setFechas] = useState({ inicio: contrato?.inicio ?? '', fin: contrato?.fin ?? '' })
  const [errores, setErrores] = useState<ErroresContrato>({})
  return {
    ...fechas, errores,
    cambiar: (campo: 'inicio' | 'fin', valor: string) => setFechas((actual) => ({ ...actual, [campo]: valor })),
    reiniciar: (nuevo?: ContratoConductor) => {
      setFechas({ inicio: nuevo?.inicio ?? '', fin: nuevo?.fin ?? '' })
      setErrores({})
    },
    validar: (): ContratoConductor | null => {
      const problemas = validarContrato(fechas.inicio, fechas.fin)
      setErrores(problemas)
      return Object.keys(problemas).length ? null : { inicio: fechas.inicio, fin: fechas.fin || undefined }
    },
  }
}
