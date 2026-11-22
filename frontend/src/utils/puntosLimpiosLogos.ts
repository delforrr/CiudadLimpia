import iconoPuntoLimpio from '../assets/icono-punto-limpio.svg?raw'
import iconoBotellero from '../assets/icono-botellero.svg?raw'
import iconoLatero from '../assets/icono-latero.svg?raw'
import iconoCarton from '../assets/icono-carton.svg?raw'
import iconoElectronicos from '../assets/icono-electronicos.svg?raw'
import iconoPilas from '../assets/icono-pilas.svg?raw'
import iconoAceite from '../assets/icono-aceite.svg?raw'
import iconoOrganicos from '../assets/icono-organicos.svg?raw'
import iconoTextiles from '../assets/icono-textiles.svg?raw'
import iconoTapitas from '../assets/icono-tapitas.svg?raw'
import iconoMedicamentos from '../assets/icono-medicamentos.svg?raw'

export interface PredefinedLogo {
  id: string
  label: string
  src: string
  svg: string
}

export const PUNTOS_LIMPIOS_COLORS = [
  { label: 'Verde oscuro', value: '#1e6000' },
  { label: 'Verde claro', value: '#36cc00' },
  { label: 'Azul', value: '#0369a1' },
  { label: 'Azul oscuro', value: '#075985' },
  { label: 'Turquesa', value: '#0f766e' },
  { label: 'Verde oliva', value: '#3f6212' },
  { label: 'Naranja', value: '#b45309' },
  { label: 'Marrón', value: '#92400e' },
  { label: 'Ocre', value: '#a16207' },
  { label: 'Violeta', value: '#6d28d9' },
  { label: 'Rojo', value: '#be123c' },
  { label: 'Magenta', value: '#a21caf' },
]

function svgSource(svg: string) {
  return `data:image/svg+xml,${encodeURIComponent(svg)}`
}

export const APP_LOGOS_PUNTOS_LIMPIOS: PredefinedLogo[] = [
  {
    id: 'punto-limpio',
    label: 'Punto Limpio',
    src: iconoPuntoLimpio,
  },
  {
    id: 'botellero',
    label: 'Botellero',
    src: iconoBotellero,
  },
  {
    id: 'latero',
    label: 'Latero',
    src: iconoLatero,
  },
  {
    id: 'carton',
    label: 'Papel y Cartón',
    src: iconoCarton,
  },
  {
    id: 'electronicos',
    label: 'Electrónicos (RAEE)',
    src: iconoElectronicos,
  },
  {
    id: 'pilas',
    label: 'Pilas y Baterías',
    src: iconoPilas,
  },
  {
    id: 'aceite',
    label: 'Aceite Vegetal (AVU)',
    src: iconoAceite,
  },
  {
    id: 'organicos',
    label: 'Orgánicos y Compost',
    src: iconoOrganicos,
  },
  {
    id: 'textiles',
    label: 'Textiles y Ropa',
    src: iconoTextiles,
  },
  {
    id: 'tapitas',
    label: 'Tapitas Plásticas',
    src: iconoTapitas,
  },
  {
    id: 'medicamentos',
    label: 'Medicamentos',
    src: iconoMedicamentos,
  },
].map((preset) => ({ ...preset, svg: preset.src, src: svgSource(preset.src) }))

export const DEFAULT_TIPO_LOGOS: Record<string, string> = {
  PUNTO_LIMPIO: APP_LOGOS_PUNTOS_LIMPIOS[0].src,
  BOTELLERO: APP_LOGOS_PUNTOS_LIMPIOS[1].src,
  LATERO: APP_LOGOS_PUNTOS_LIMPIOS[2].src,
}

function normalizeLogoName(value: string) {
  return value.normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .toLowerCase().replace(/[^a-z0-9]/g, '')
}

export function resolvePuntoLimpioLogo(
  logo?: string,
  tipoId?: string,
  nombre?: string,
  materiales: string[] = [],
) {
  // Las URLs generadas por Vite cambian entre compilaciones.
  const filename = logo?.split(/[?#]/)[0].split('/').pop()
  const preset = APP_LOGOS_PUNTOS_LIMPIOS.find(
    ({ id, src }) =>
      logo === id || logo === src ||
      filename === `icono-${id}.svg` ||
      (filename?.startsWith(`icono-${id}-`) && filename.endsWith('.svg')),
  )
  if (preset) return preset.src

  // También migrar PNG, URLs externas y nombres de archivos antiguos.
  // Una referencia desconocida nunca debe volver a mostrar la imagen anterior.
  const names = [nombre ?? '', ...materiales].map(normalizeLogoName)
  const namePreset = APP_LOGOS_PUNTOS_LIMPIOS.find(
    (item) => names.includes(normalizeLogoName(item.id)) || names.includes(normalizeLogoName(item.label)),
  )
  return DEFAULT_TIPO_LOGOS[tipoId ?? ''] ?? namePreset?.src
    ?? APP_LOGOS_PUNTOS_LIMPIOS[0].src
}

export function puntoLimpioLogoId(logo?: string) {
  return APP_LOGOS_PUNTOS_LIMPIOS.find((item) => item.src === logo || item.id === logo)?.id
    ?? logo
}

export function puntoLimpioLogoColor(logo?: string) {
  const preset = APP_LOGOS_PUNTOS_LIMPIOS.find((item) => item.src === logo || item.id === logo)
    ?? APP_LOGOS_PUNTOS_LIMPIOS[0]
  return /<circle\b[^>]*\bfill="(#[0-9a-f]{6})"/i.exec(preset.svg)?.[1] ?? '#1e6000'
}

export function normalizeIconColor(color: unknown, fallback: string) {
  return typeof color === 'string' && /^#[0-9a-f]{6}$/i.test(color)
    ? color.toLowerCase()
    : fallback
}

export function puntoLimpioIconSrc(logo?: string, colorFondo?: string) {
  const preset = APP_LOGOS_PUNTOS_LIMPIOS.find((item) => item.src === logo || item.id === logo)
    ?? APP_LOGOS_PUNTOS_LIMPIOS[0]
  const background = normalizeIconColor(colorFondo, puntoLimpioLogoColor(preset.id))
  return svgSource(preset.svg
    .replace(/(<circle\b[^>]*\bfill=)"[^"]*"/, `$1"${background}"`))
}
