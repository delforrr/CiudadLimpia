const calleVigenteSelect = { select: { calleVigenteId: true } } as const;
export const frenteCoberturaSelect = {
  calleId: true,
  lat: true,
  long: true,
  calle: calleVigenteSelect,
} as const;
export const tramosRecorridoArgs = {
  orderBy: { desde: 'asc' },
  select: {
    calleId: true,
    desde: true,
    hasta: true,
    lado: true,
    calle: calleVigenteSelect,
  },
} as const;
