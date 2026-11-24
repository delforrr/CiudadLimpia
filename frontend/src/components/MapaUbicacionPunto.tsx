import { teselasOpenStreetMap, atribucionOpenStreetMap } from '../utils/cartografia';
import { useEffect, useRef } from 'react'
import type { Map as MapaLeaflet, Marker } from 'leaflet'
import { useLeaflet } from '../hooks/useLeaflet'
import { Alert } from '@mui/material'
import 'leaflet/dist/leaflet.css'
import { useMapaPuntosLimpios } from '../hooks/useMapaPuntosLimpios'
import { puntoLimpioIconSrc } from '../utils/puntosLimpiosLogos'
import './PuntosLimpios.css'
import './MapaUbicacionPunto.css'

type Ubicacion = { lat: number; lng: number }

export function MapaUbicacionPunto({ ubicacion, onChange, icono, bloqueado = false }: {
  ubicacion: Ubicacion | null
  onChange: (ubicacion: Ubicacion) => void
  icono?: string
  bloqueado?: boolean
}) {
  const { leaflet: L, errorMapa } = useLeaflet()
  const { puntos } = useMapaPuntosLimpios()
  const contenedor = useRef<HTMLDivElement>(null)
  const mapa = useRef<MapaLeaflet | null>(null)
  const marcador = useRef<Marker | null>(null)
  const centrado = useRef(false)
  const cambio = useRef(onChange)
  const soloLectura = useRef(bloqueado)

  useEffect(() => { cambio.current = onChange }, [onChange])
  useEffect(() => { soloLectura.current = bloqueado }, [bloqueado])

  useEffect(() => {
    if (!L || !contenedor.current) return
    const instancia = L.map(contenedor.current, { scrollWheelZoom: false }).setView([-35.973, -62.734], 14)
    mapa.current = instancia
    L.tileLayer(teselasOpenStreetMap, {
      maxZoom: 19,
      attribution: atribucionOpenStreetMap,
    }).addTo(instancia)
    instancia.on('click', (evento) => {
      if (!soloLectura.current) cambio.current({ lat: evento.latlng.lat, lng: evento.latlng.lng })
    })
    const observer = new ResizeObserver(() => instancia.invalidateSize({ pan: false }))
    observer.observe(contenedor.current)
    return () => { observer.disconnect(); instancia.remove(); mapa.current = null; marcador.current = null }
  }, [L])

  useEffect(() => {
    if (!L || !mapa.current) return
    const capa = L.layerGroup().addTo(mapa.current)
    puntos.forEach((punto) => {
      const icon = L.divIcon({
        className: 'custom-teardrop-wrapper',
        html: `<div class="teardrop-pin-container"><div class="teardrop-pin-body"><img src="${punto.tipo.icono}" alt="" class="teardrop-icon-white" /></div><div class="teardrop-shadow"></div></div>`,
        iconSize: [36, 48], iconAnchor: [18, 46],
      })
      const etiqueta = document.createElement('span')
      etiqueta.textContent = punto.nombre
      L.marker([punto.lat, punto.lng], { icon, title: punto.nombre })
        .bindTooltip(etiqueta).addTo(capa)
    })
    return () => { capa.remove() }
  }, [L, puntos])

  useEffect(() => {
    const instancia = mapa.current
    if (!L || !instancia) return
    marcador.current?.remove()
    marcador.current = null
    if (!ubicacion) { centrado.current = false; return }
    if (!centrado.current) {
      instancia.setView([ubicacion.lat, ubicacion.lng], 17)
      centrado.current = true
    }
    const imagen = icono ?? puntoLimpioIconSrc()
    const icon = L.divIcon({
      className: 'custom-teardrop-wrapper admin-points-new-pin',
      html: `<div class="teardrop-pin-container"><div class="teardrop-pin-body"><img src="${imagen}" alt="" class="teardrop-icon-white" /></div><div class="teardrop-shadow"></div></div>`,
      iconSize: [36, 48], iconAnchor: [18, 46],
    })
    marcador.current = L.marker([ubicacion.lat, ubicacion.lng], { icon, draggable: !bloqueado, title: 'Ubicación del nuevo punto limpio' })
      .on('dragend', (evento) => {
        const posicion = (evento.target as Marker).getLatLng()
        cambio.current({ lat: posicion.lat, lng: posicion.lng })
      }).addTo(instancia)
  }, [L, ubicacion, icono, bloqueado])

  if (errorMapa) return <Alert severity="error">No se pudo cargar el mapa.</Alert>
  return <div ref={contenedor} className="admin-points-map" role="region" aria-label="Mapa para seleccionar la ubicación" />
}
