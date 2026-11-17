import { useEffect, useRef } from 'react'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import { PUNTOS_DATA } from '../utils/puntosLimpiosMapa'
import { usePuntosLimpiosMapIcons } from '../hooks/usePuntosLimpiosMapIcons'
import './PuntosLimpios.css'
import './MapaUbicacionPunto.css'

type Ubicacion = { lat: number; lng: number }

export function MapaUbicacionPunto({ ubicacion, onChange, icono }: {
  ubicacion: Ubicacion | null
  onChange: (ubicacion: Ubicacion) => void
  icono?: string
}) {
  const iconos = usePuntosLimpiosMapIcons()
  const contenedor = useRef<HTMLDivElement>(null)
  const mapa = useRef<L.Map | null>(null)
  const marcador = useRef<L.Marker | null>(null)
  const centrado = useRef(false)
  const cambio = useRef(onChange)

  useEffect(() => { cambio.current = onChange }, [onChange])

  useEffect(() => {
    if (!contenedor.current) return
    const instancia = L.map(contenedor.current, { scrollWheelZoom: false }).setView([-35.973, -62.734], 14)
    mapa.current = instancia
    L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 19,
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
    }).addTo(instancia)
    instancia.on('click', (evento) => cambio.current({ lat: evento.latlng.lat, lng: evento.latlng.lng }))
    const observer = new ResizeObserver(() => instancia.invalidateSize({ pan: false }))
    observer.observe(contenedor.current)
    return () => { observer.disconnect(); instancia.remove(); mapa.current = null; marcador.current = null }
  }, [])

  useEffect(() => {
    if (!mapa.current) return
    const capa = L.layerGroup().addTo(mapa.current)
    PUNTOS_DATA.forEach((punto) => {
      const icon = L.divIcon({
        className: 'custom-teardrop-wrapper',
        html: `<div class="teardrop-pin-container"><div class="teardrop-pin-body"><img src="${iconos[punto.tipo]}" alt="" class="teardrop-icon-white" /></div><div class="teardrop-shadow"></div></div>`,
        iconSize: [36, 48], iconAnchor: [18, 46],
      })
      L.marker([punto.lat, punto.lng], { icon, title: punto.nombre })
        .bindTooltip(punto.nombre).addTo(capa)
    })
    return () => { capa.remove() }
  }, [iconos])

  useEffect(() => {
    const instancia = mapa.current
    if (!instancia) return
    marcador.current?.remove()
    marcador.current = null
    if (!ubicacion) { centrado.current = false; return }
    if (!centrado.current) {
      instancia.setView([ubicacion.lat, ubicacion.lng], 17)
      centrado.current = true
    }
    const imagen = icono ?? iconos['punto-limpio']
    const icon = L.divIcon({
      className: 'custom-teardrop-wrapper admin-points-new-pin',
      html: `<div class="teardrop-pin-container"><div class="teardrop-pin-body"><img src="${imagen}" alt="" class="teardrop-icon-white" /></div><div class="teardrop-shadow"></div></div>`,
      iconSize: [36, 48], iconAnchor: [18, 46],
    })
    marcador.current = L.marker([ubicacion.lat, ubicacion.lng], { icon, draggable: true, title: 'Ubicación del nuevo punto limpio' })
      .on('dragend', (evento) => {
        const posicion = (evento.target as L.Marker).getLatLng()
        cambio.current({ lat: posicion.lat, lng: posicion.lng })
      }).addTo(instancia)
  }, [ubicacion, icono, iconos])

  return <div ref={contenedor} className="admin-points-map" role="region" aria-label="Mapa para seleccionar la ubicación" />
}
