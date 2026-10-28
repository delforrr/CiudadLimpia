import { z } from 'zod'
import { profileSchema } from './profileSchema.ts'

export const adminUserSchema = profileSchema.extend({
  role: z.enum(['USER', 'ADMIN']),
})
