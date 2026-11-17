import { useEffect, useState } from 'react'
import { loadPuntos, loadTipos } from '../utils/puntosLimpiosStorage'
import { PUNTOS_DATA } from '../utils/puntosLimpiosMapa'
import { puntoLimpioIconSrc } from '../utils/puntosLimpiosLogos'

function cargarMapa() {
  const tipos = loadTipos().map((tipo) => ({
    ...tipo,
    icono: puntoLimpioIconSrc(tipo.logo, tipo.colorFondo),
  }))
  const puntos = loadPuntos(tipos).flatMap((punto) => {
    if (punto.estado !== 'ACTIVO') return []
    const tipo = tipos.find((item) => item.id === punto.tipoId)
    const anterior = PUNTOS_DATA.find((item) => item.nombre === punto.nombre && item.direccion === punto.direccion)
    const lat = punto.lat ?? anterior?.lat
    const lng = punto.lng ?? anterior?.lng
    if (!tipo || lat === undefined || lng === undefined) return []
    return [{ ...punto, lat, lng, tipo }]
  })
  return { puntos, tipos }
}

export function useMapaPuntosLimpios() {
  const [datos, setDatos] = useState(cargarMapa)
  useEffect(() => {
    const actualizar = () => setDatos(cargarMapa())
    window.addEventListener('storage', actualizar)
    window.addEventListener('focus', actualizar)
    return () => {
      window.removeEventListener('storage', actualizar)
      window.removeEventListener('focus', actualizar)
    }
  }, [])
  return datos
}
