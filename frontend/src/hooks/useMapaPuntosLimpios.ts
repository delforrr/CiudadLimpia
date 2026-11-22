import { useEffect, useState } from 'react'
import { cargarCatalogoPuntosLimpios } from '../services/puntosLimpiosService'
import { loadPuntos, loadTipos, savePuntos, saveTipos } from '../utils/puntosLimpiosStorage'
import { puntoLimpioIconSrc } from '../utils/puntosLimpiosLogos'

function cargarMapa() {
  const tipos = loadTipos().map((tipo) => ({
    ...tipo,
    icono: puntoLimpioIconSrc(tipo.logo, tipo.colorFondo),
  }))
  const puntos = loadPuntos(tipos).flatMap((punto) => {
    if (punto.estado !== 'ACTIVO') return []
    const tipo = tipos.find((item) => item.id === punto.tipoId)
    const { lat, lng } = punto
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

    let activo = true
    cargarCatalogoPuntosLimpios()
      .then(({ tipos, puntos }) => {
        if (!activo || puntos.length === 0) return
        saveTipos(tipos)
        savePuntos(puntos)
        actualizar()
      })
      .catch(() => {})

    return () => {
      activo = false
      window.removeEventListener('storage', actualizar)
      window.removeEventListener('focus', actualizar)
    }
  }, [])
  return datos
}
