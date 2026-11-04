import { useState } from 'react'
import { DEFAULT_TIPO_LOGOS, puntoLimpioIconSrc } from '../utils/puntosLimpiosLogos'
import { loadTipos } from '../utils/puntosLimpiosStorage'

export function usePuntosLimpiosMapIcons() {
  const [icons] = useState(() => {
    const tipos = loadTipos()
    const logo = (id: string) => {
      const tipo = tipos.find((tipo) => tipo.id === id)
      return puntoLimpioIconSrc(tipo?.logo ?? DEFAULT_TIPO_LOGOS[id], tipo?.colorFondo)
    }

    return {
      'punto-limpio': logo('PUNTO_LIMPIO'),
      botellero: logo('BOTELLERO'),
      'botellero-latero': logo('LATERO'),
    }
  })

  return icons
}
