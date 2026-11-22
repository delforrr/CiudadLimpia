import { useState, type FormEvent } from 'react'
import type { CamionApi, CamionDatos, ContratoApi } from '../services/flotaService'
import { useFlota } from './useFlota'

type TruckForm = Omit<CamionDatos, 'anio'> & { anio: number | string }
const formularioInicial = (): TruckForm => ({
  patente: '', marca: '', modelo: '', anio: new Date().getFullYear(), estado: 'ACTIVO',
})

export function useAdminCamiones() {
  const flota = useFlota()
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState<'TODOS' | CamionDatos['estado']>('TODOS')
  const [isFormOpen, setIsFormOpen] = useState(false)
  const [editingTruck, setEditingTruck] = useState<CamionApi | null>(null)
  const [pendienteArchivar, setPendienteArchivar] = useState<CamionApi | null>(null)
  const [form, setForm] = useState(formularioInicial)
  const [formErrors, setFormErrors] = useState<Partial<Record<keyof TruckForm, string>>>({})
  const [formError, setFormError] = useState('')
  const [errorArchivo, setErrorArchivo] = useState('')
  const [contratoError, setContratoError] = useState('')
  const [saving, setSaving] = useState(false)
  const [archivando, setArchivando] = useState(false)
  const [finalizando, setFinalizando] = useState(false)
  const [notice, setNotice] = useState('')

  const abrirFormulario = (truck?: CamionApi) => {
    setEditingTruck(truck ?? null)
    setForm(truck ?? formularioInicial())
    setFormErrors({})
    setFormError('')
    setIsFormOpen(true)
  }
  const handleCloseForm = () => {
    if (!saving) setIsFormOpen(false)
  }
  const handleSave = async (event: FormEvent) => {
    event.preventDefault()
    if (saving) return

    const patente = form.patente.trim().toUpperCase()
    const marca = form.marca.trim()
    const modelo = form.modelo.trim()
    const anio = Number(form.anio)
    const errors: typeof formErrors = {}
    if (!patente || patente.length > 20) errors.patente = 'Ingresá una patente de hasta 20 caracteres.'
    if (!marca || marca.length > 100) errors.marca = 'Ingresá una marca de hasta 100 caracteres.'
    if (!modelo || modelo.length > 100) errors.modelo = 'Ingresá un modelo de hasta 100 caracteres.'
    if (!Number.isInteger(anio) || anio < 1 || anio > 9999) errors.anio = 'Ingresá un año entre 1 y 9999.'
    setFormErrors(errors)
    setFormError('')
    if (Object.keys(errors).length) return

    setSaving(true)
    try {
      await flota.guardarCamion({ patente, marca, modelo, anio, estado: form.estado }, editingTruck?.id)
      setIsFormOpen(false)
      setNotice(editingTruck ? `Se actualizó el camión ${patente}.` : `Se agregó el camión ${patente}.`)
    } catch (fallo) {
      setFormError(fallo instanceof Error ? fallo.message : 'No se pudo guardar el camión.')
    } finally {
      setSaving(false)
    }
  }

  const solicitarArchivo = (truck: CamionApi | null) => {
    if (archivando) return
    setErrorArchivo('')
    setPendienteArchivar(truck)
  }
  const confirmarArchivo = async () => {
    if (!pendienteArchivar || archivando) return
    setArchivando(true)
    setErrorArchivo('')
    try {
      await flota.archivarCamion(pendienteArchivar.id)
      setNotice(`Se archivó el camión ${pendienteArchivar.patente}.`)
      setPendienteArchivar(null)
    } catch (fallo) {
      setErrorArchivo(fallo instanceof Error ? fallo.message : 'No se pudo archivar el camión.')
    } finally {
      setArchivando(false)
    }
  }
  const finalizarContrato = async (contrato: ContratoApi) => {
    if (finalizando) return
    setFinalizando(true)
    setContratoError('')
    try {
      await flota.finalizar(contrato)
      setNotice('Se finalizó el contrato.')
    } catch (fallo) {
      setContratoError(fallo instanceof Error ? fallo.message : 'No se pudo finalizar el contrato.')
    } finally {
      setFinalizando(false)
    }
  }

  const conductoresPorId = new Map(flota.conductores.map((conductor) => [conductor.id, conductor]))
  const asignaciones = (id: string) => flota.contratos.filter(({ idCamion }) => idCamion === id)
    .flatMap((contrato) => {
      const conductor = conductoresPorId.get(contrato.idConductor)
      return conductor ? [{ nombre: `${conductor.nombre} ${conductor.apellido}`, contrato }] : []
    })
  const term = search.toLowerCase().trim()
  const filteredTrucks = flota.camiones.filter((truck) =>
    (statusFilter === 'TODOS' || truck.estado === statusFilter) &&
    [truck.patente, truck.marca, truck.modelo, ...asignaciones(truck.id).map(({ nombre }) => nombre)]
      .some((valor) => valor.toLowerCase().includes(term)),
  )

  return {
    ...flota, asignaciones, filteredTrucks,
    search, setSearch, statusFilter, setStatusFilter,
    isFormOpen, editingTruck, abrirFormulario, handleCloseForm, handleSave,
    form, setForm, formErrors, formError, saving,
    pendienteArchivar, solicitarArchivo, confirmarArchivo, errorArchivo, archivando,
    contratoError, setContratoError, finalizarContrato, finalizando, notice, setNotice,
  }
}
