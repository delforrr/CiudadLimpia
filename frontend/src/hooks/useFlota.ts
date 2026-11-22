import { useEffect, useState } from 'react'
import {
  cargarFlota, contratosPendientes, flotaService,
  type CamionDatos, type ConductorDatos, type ContratoApi,
} from '../services/flotaService'
import type { ContratoConductor } from '../utils/contratoConductor'

type Flota = Awaited<ReturnType<typeof cargarFlota>>
const flotaVacia: Flota = { camiones: [], conductores: [], contratos: [] }

function reemplazar<T extends { id: string }>(registros: T[], actualizado: T) {
  return registros.some(({ id }) => id === actualizado.id)
    ? registros.map((registro) => registro.id === actualizado.id ? actualizado : registro)
    : [...registros, actualizado]
}

export function useFlota() {
  const [flota, setFlota] = useState(flotaVacia)
  const [cargando, setCargando] = useState(true)
  const [error, setError] = useState('')
  const [intento, setIntento] = useState(0)
  const [ahora, setAhora] = useState(Date.now)

  useEffect(() => {
    const reloj = setInterval(() => setAhora(Date.now()), 60_000)
    return () => clearInterval(reloj)
  }, [])

  useEffect(() => {
    const solicitud = new AbortController()
    cargarFlota(solicitud.signal)
      .then((datos) => {
        if (solicitud.signal.aborted) return
        setAhora(Date.now())
        setFlota(datos)
      })
      .catch((fallo: Error) => {
        if (!solicitud.signal.aborted) setError(fallo.message)
      })
      .finally(() => {
        if (!solicitud.signal.aborted) setCargando(false)
      })
    return () => solicitud.abort()
  }, [intento])

  return {
    ...flota,
    contratos: contratosPendientes(flota.contratos, ahora),
    ahora,
    cargando,
    error,
    recargar: () => {
      setError('')
      setCargando(true)
      setIntento((actual) => actual + 1)
    },
    guardarCamion: async (datos: CamionDatos, id?: string) => {
      const camion = await flotaService.guardarCamion(datos, id)
      setFlota((actual) => ({ ...actual, camiones: reemplazar(actual.camiones, camion) }))
    },
    guardarConductor: async (datos: ConductorDatos, id?: string) => {
      const conductor = await flotaService.guardarConductor(datos, id)
      setFlota((actual) => ({ ...actual, conductores: reemplazar(actual.conductores, conductor) }))
    },
    darDeBajaCamion: async (id: string) => {
      await flotaService.darDeBajaCamion(id)
      setFlota((actual) => ({
        ...actual,
        camiones: actual.camiones.map((camion) => camion.id === id ? { ...camion, estado: 'INACTIVO' } : camion),
      }))
    },
    darDeBajaConductor: async (id: string) => {
      await flotaService.darDeBajaConductor(id)
      setFlota((actual) => ({
        ...actual,
        conductores: actual.conductores.map((conductor) => conductor.id === id ? { ...conductor, activo: false } : conductor),
      }))
    },
    asignar: async (idCamion: string, idConductor: string, fechas: ContratoConductor) => {
      const contrato = await flotaService.asignar(idCamion, idConductor, fechas)
      setAhora(Date.now())
      setFlota((actual) => ({ ...actual, contratos: [...actual.contratos, contrato] }))
    },
    finalizar: async (contrato: ContratoApi) => {
      const actualizado = await flotaService.finalizar(contrato)
      setAhora(Date.now())
      setFlota((actual) => ({
        ...actual,
        contratos: actual.contratos.map((registro) =>
          registro.idCamion === actualizado.idCamion &&
          registro.idConductor === actualizado.idConductor &&
          registro.fechaInicio === actualizado.fechaInicio ? actualizado : registro),
      }))
    },
  }
}
