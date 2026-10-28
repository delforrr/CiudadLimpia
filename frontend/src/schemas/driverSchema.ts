import { z } from 'zod'

export const driverSchema = z.object({
  firstName: z
    .string()
    .trim()
    .min(1, 'Ingresá el nombre')
    .max(100, 'El nombre no puede superar 100 caracteres')
    .regex(
      /^[a-zA-ZáéíóúÁÉÍÓÚñÑüÜ\s'-]+$/,
      'El nombre solo puede contener letras y espacios',
    ),
  lastName: z
    .string()
    .trim()
    .min(1, 'Ingresá el apellido')
    .max(100, 'El apellido no puede superar 100 caracteres')
    .regex(
      /^[a-zA-ZáéíóúÁÉÍÓÚñÑüÜ\s'-]+$/,
      'El apellido solo puede contener letras y espacios',
    ),
  dni: z
    .string()
    .trim()
    .min(7, 'El DNI debe tener al menos 7 caracteres')
    .max(10, 'El DNI no puede superar 10 caracteres')
    .regex(/^[0-9]+$/, 'El DNI solo puede contener números'),
  phone: z
    .string()
    .trim()
    .min(8, 'Ingresá un teléfono válido')
    .max(20, 'El teléfono no puede superar 20 caracteres')
    .regex(/^[0-9+\-\s()]+$/, 'El teléfono tiene un formato inválido'),
  status: z.enum(['ACTIVO', 'INACTIVO']),
  assignedTruck: z
    .string()
    .trim()
    .max(30, 'La unidad no puede superar 30 caracteres')
    .optional()
    .or(z.literal('')),
})
