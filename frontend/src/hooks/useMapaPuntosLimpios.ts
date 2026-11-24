import { useMemo } from 'react'
import { useCatalogoPuntosLimpios } from './useCatalogoPuntosLimpios'
import { puntoLimpioIconSrc } from '../utils/puntosLimpiosLogos'

export function useMapaPuntosLimpios() {
  const { tipos, puntos, error, loading } = useCatalogoPuntosLimpios(false)
  const datos = useMemo(() => {
    const tiposMapa = tipos.map((tipo) => ({
      ...tipo,
      icono: puntoLimpioIconSrc(tipo.logo, tipo.colorFondo),
    }))
    const porId = new Map(tiposMapa.map((tipo) => [tipo.id, tipo]))
    return {
      tipos: tiposMapa,
      puntos: puntos.flatMap((punto) => {
        const tipo = porId.get(punto.tipoId)
        const { lat, lng } = punto
        if (!tipo || lat === undefined || lng === undefined || punto.estado !== 'ACTIVO') return []
        return [{ ...punto, lat, lng, tipo }]
      }),
    }
  }, [tipos, puntos])
  return { ...datos, error, loading }
}
