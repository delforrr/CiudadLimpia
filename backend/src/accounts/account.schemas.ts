import { z } from 'zod';
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
  .pipe(z.email());
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
export const domicilioSchema = z.strictObject({
  direccion: textSchema(200),
  etiqueta: z
    .string()
    .trim()
    .refine(
      (value) => Array.from(value).length <= 100,
      'La etiqueta no puede superar 100 caracteres',
    )
    .meta({ maxLength: 100 })
    .nullish(),
});
export const clienteSchema = z.strictObject({
  name: textSchema(100),
  lastName: textSchema(100),
  domicilios: z.array(domicilioSchema).min(1).max(20),
});
export const updateClienteSchema = clienteSchema.partial({ domicilios: true });
export const publicUserSchema = z.strictObject({
  id: z.uuid(),
  email: z.email(),
  role: roleSchema,
  cliente: z
    .strictObject({
      id: z.uuid(),
      name: z.string(),
      lastName: z.string(),
      domicilios: z.array(
        z.strictObject({
          id: z.uuid(),
          direccion: z.string(),
          etiqueta: z.string().max(100).nullable(),
        }),
      ),
    })
    .nullable(),
});
export type PublicUser = z.infer<typeof publicUserSchema>;
