import { z } from 'zod';

export const zonaSchema = z.object({
  nombre: z.string().trim().min(1, 'Ingresá el nombre de la zona').max(100, 'El nombre no puede superar 100 caracteres'),
  descripcion: z.string().trim().max(300, 'La descripción no puede superar 300 caracteres'),
});
export type Zona = z.infer<typeof zonaSchema> & { id: string };
export type CatalogoZonas = { zonas: Zona[]; asignaciones: Record<string, string> };
const catalogoSchema = z.object({
  zonas: z.array(zonaSchema.extend({ id: z.string().min(1) })),
  asignaciones: z.record(z.string(), z.string()),
});
const clave = 'ciudad-limpia:zonas';

export function validarZona(datos: z.infer<typeof zonaSchema>, zonas: Zona[], id?: string) {
  const resultado = zonaSchema.safeParse(datos);
  if (!resultado.success) return { error: resultado.error.issues[0].message };
  const normalizar = (nombre: string) => nombre.normalize('NFD').replace(/\p{Diacritic}/gu, '').toLocaleLowerCase('es');
  if (zonas.some((zona) => zona.id !== id && normalizar(zona.nombre) === normalizar(resultado.data.nombre))) {
    return { error: 'Ya existe una zona con ese nombre' };
  }
  return { datos: resultado.data };
}

export function asignarZona(catalogo: CatalogoZonas, trayectoId: string, zonaId: string): CatalogoZonas {
  if (!catalogo.zonas.some(({ id }) => id === zonaId)) throw new Error('Elegí una zona válida.');
  return { ...catalogo, asignaciones: { ...catalogo.asignaciones, [trayectoId]: zonaId } };
}

export function guardarZona(catalogo: CatalogoZonas, datos: z.infer<typeof zonaSchema>, id?: string): CatalogoZonas {
  const resultado = validarZona(datos, catalogo.zonas, id);
  if (!resultado.datos) throw new Error(resultado.error);
  if (id && !catalogo.zonas.some((zona) => zona.id === id)) throw new Error('La zona ya no existe.');
  const zona: Zona = { ...resultado.datos, id: id ?? crypto.randomUUID() };
  return { ...catalogo, zonas: id ? catalogo.zonas.map((actual) => actual.id === id ? zona : actual) : [...catalogo.zonas, zona] };
}

export function eliminarZona(catalogo: CatalogoZonas, zonaId: string): CatalogoZonas {
  if (Object.values(catalogo.asignaciones).includes(zonaId)) throw new Error('Reasigná los trayectos de esta zona antes de eliminarla.');
  return { ...catalogo, zonas: catalogo.zonas.filter(({ id }) => id !== zonaId) };
}

export const zonasService = {
  cargar(): CatalogoZonas {
    const raw = localStorage.getItem(clave);
    if (!raw) return { zonas: [], asignaciones: {} };
    const catalogo = catalogoSchema.parse(JSON.parse(raw));
    if (Object.values(catalogo.asignaciones).some((id) => !catalogo.zonas.some((zona) => zona.id === id))) {
      throw new Error('Hay asignaciones de zonas que no existen.');
    }
    return catalogo;
  },
  guardar(catalogo: CatalogoZonas) {
    localStorage.setItem(clave, JSON.stringify(catalogo));
  },
};
