import { z } from 'zod';
import { normalizarCalle } from '../calle/calle.dto';
import { Role } from '../generated/prisma/enums';

const textSchema = (max: number) =>
  z
    .string()
    .trim()
    .refine((value) => Array.from(value).length >= 1, 'Se requiere un valor')
    .refine(
      (value) => Array.from(value).length <= max,
      `No puede superar ${max} caracteres`,
    )
    .meta({ minLength: 1, maxLength: max });

export const emailSchema = z
  .string()
  .trim()
  .toLowerCase()
  .max(254)
  .pipe(z.email())
  .meta({ format: 'email' });
export const passwordSchema = z
  .string()
  .refine(
    (value) => Array.from(value).length >= 8,
    'La contraseña debe tener al menos 8 caracteres',
  )
  .refine(
    (value) => Buffer.byteLength(value, 'utf8') <= 72,
    'La contraseña no puede superar 72 bytes',
  )
  .meta({
    format: 'password',
    writeOnly: true,
    minLength: 8,
    maxLength: 72,
    description:
      'Mínimo 8 caracteres y máximo 72 bytes UTF-8. Conserva espacios y símbolos.',
  });
export const roleSchema = z.enum(Role);
const frenteSchema = z.strictObject({
  calle: z.string(),
  altura: z.number().int().min(1).max(2147483647),
  lat: z.number().min(-90).max(90),
  long: z.number().min(-180).max(180),
});
const etiquetaSchema = z
  .string()
  .trim()
  .refine(
    (value) => Array.from(value).length <= 100,
    'La etiqueta no puede superar 100 caracteres',
  )
  .meta({ maxLength: 100 })
  .nullish();
export const domicilioSchema = z.union([
  z.strictObject({ direccionId: z.uuid(), etiqueta: etiquetaSchema }),
  z.strictObject({
    direccion: frenteSchema.extend({
      calle: z.string().transform(normalizarCalle).pipe(textSchema(180)),
    }),
    etiqueta: etiquetaSchema,
  }),
]);
export type DomicilioInput = z.infer<typeof domicilioSchema>;

export const clienteSchema = z.strictObject({
  name: textSchema(100),
  lastName: textSchema(100),
  domicilios: z.array(domicilioSchema).min(1).max(20),
});
export const updateClienteSchema = clienteSchema.extend({
  domicilios: z.array(domicilioSchema).max(20).optional(),
});
export const publicUserSchema = z.strictObject({
  id: z.uuid(),
  email: z.email(),
  role: roleSchema,
  domicilioActualId: z.uuid().optional(),
  cliente: z
    .strictObject({
      id: z.uuid(),
      name: z.string(),
      lastName: z.string(),
      domicilios: z.array(
        frenteSchema.extend({
          id: z.uuid(),
          direccion: z.string(),
          etiqueta: z.string().nullable().meta({ maxLength: 100 }),
        }),
      ),
    })
    .nullable(),
});
export type PublicUser = z.infer<typeof publicUserSchema>;
