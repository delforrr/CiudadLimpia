export const publicUserSelect = {
  id: true,
  email: true,
  role: true,
  cliente: {
    select: {
      id: true,
      name: true,
      lastName: true,
      domicilios: {
        select: { id: true, direccion: true, etiqueta: true },
        orderBy: { id: 'asc' as const },
      },
    },
  },
} as const;
