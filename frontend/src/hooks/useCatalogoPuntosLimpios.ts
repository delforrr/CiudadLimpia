import { useEffect, useState } from 'react'
import { cargarCatalogoPuntosLimpios } from '../services/puntosLimpiosService'

type Catalogo = Awaited<ReturnType<typeof cargarCatalogoPuntosLimpios>>

export function useCatalogoPuntosLimpios(administracion: boolean) {
  const [catalogo, setCatalogo] = useState<Catalogo>({ tipos: [], puntos: [] })
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    const solicitud = new AbortController()
    void cargarCatalogoPuntosLimpios(administracion, solicitud.signal).then(
      (datos) => {
        if (!solicitud.signal.aborted) setCatalogo(datos)
      },
      (error: unknown) => {
        if (!solicitud.signal.aborted) {
          setError(error instanceof Error ? error.message : 'No se pudo cargar el catálogo.')
        }
      },
    ).finally(() => {
      if (!solicitud.signal.aborted) setLoading(false)
    })
    return () => solicitud.abort()
  }, [administracion])

  return { ...catalogo, setCatalogo, loading, error }
}
