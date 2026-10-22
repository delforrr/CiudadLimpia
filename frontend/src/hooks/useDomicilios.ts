import { useCallback, useEffect, useState } from 'react'

export interface Domicilio {
  id: string
  direccion: string
  etiqueta?: string
  esPrincipal: boolean
}

export function useDomicilios(userId: string | undefined) {
  const [domicilios, setDomicilios] = useState<Domicilio[]>(() => {
    if (!userId) return []
    try {
      const stored = localStorage.getItem(`ciudad_limpia_domicilios_${userId}`)
      if (stored) {
        return JSON.parse(stored) as Domicilio[]
      }
      const oldSingle = localStorage.getItem(`ciudad_limpia_dir_${userId}`)
      if (oldSingle && oldSingle !== 'Av. Las Palmas 450 · Barrio Los Olivos') {
        const initial: Domicilio[] = [
          {
            id: 'dom_1',
            direccion: oldSingle,
            etiqueta: 'Principal',
            esPrincipal: true,
          },
        ]
        localStorage.setItem(
          `ciudad_limpia_domicilios_${userId}`,
          JSON.stringify(initial),
        )
        return initial
      }
      if (oldSingle === 'Av. Las Palmas 450 · Barrio Los Olivos') {
        localStorage.removeItem(`ciudad_limpia_dir_${userId}`)
      }
    } catch {
      // In case of storage/parsing error
    }
    return []
  })

  // Synchronize localStorage whenever domicilios change
  useEffect(() => {
    if (!userId) return
    try {
      localStorage.setItem(
        `ciudad_limpia_domicilios_${userId}`,
        JSON.stringify(domicilios),
      )
      const principal = domicilios.find((d) => d.esPrincipal) || domicilios[0]
      if (principal) {
        localStorage.setItem(`ciudad_limpia_dir_${userId}`, principal.direccion)
      } else {
        localStorage.removeItem(`ciudad_limpia_dir_${userId}`)
      }
    } catch {
      // Ignore localStorage errors
    }
  }, [userId, domicilios])

  const agregarDomicilio = useCallback(
    (direccion: string, etiqueta?: string, esPrincipal = false): boolean => {
      const trimmedDir = direccion.trim()
      if (!trimmedDir) return false

      setDomicilios((prev) => {
        const makePrincipal = esPrincipal || prev.length === 0
        const updatedPrev = makePrincipal
          ? prev.map((d) => ({ ...d, esPrincipal: false }))
          : prev

        const nuevo: Domicilio = {
          id: `dom_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
          direccion: trimmedDir,
          etiqueta: etiqueta?.trim() || undefined,
          esPrincipal: makePrincipal,
        }
        return [...updatedPrev, nuevo]
      })
      return true
    },
    [],
  )

  const eliminarDomicilio = useCallback((id: string) => {
    setDomicilios((prev) => {
      const target = prev.find((d) => d.id === id)
      const filtered = prev.filter((d) => d.id !== id)
      if (target?.esPrincipal && filtered.length > 0) {
        filtered[0] = { ...filtered[0], esPrincipal: true }
      }
      return filtered
    })
  }, [])

  const hacerPrincipal = useCallback((id: string) => {
    setDomicilios((prev) =>
      prev.map((d) => ({
        ...d,
        esPrincipal: d.id === id,
      })),
    )
  }, [])

  const domicilioPrincipal =
    domicilios.find((d) => d.esPrincipal) || domicilios[0] || null

  return {
    domicilios,
    domicilioPrincipal,
    agregarDomicilio,
    eliminarDomicilio,
    hacerPrincipal,
  }
}
