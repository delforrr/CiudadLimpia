export type NavTab = 'hoy' | 'calendario' | 'puntos-limpios' | 'perfil';

export type WasteScheduleType = 'reciclables' | 'no-reciclables' | 'sin-recoleccion';

export interface DaySchedule {
  dayName: string;
  dayShort: string;
  type: WasteScheduleType;
  title: string;
  time: string;
  color: string;
  categories: {
    name: string;
    color: string;
  }[];
}
