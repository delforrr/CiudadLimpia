const clave = 'ciudad-limpia:trayectos-eliminados';

export const trayectosLocalesService = {
  eliminados(): string[] {
    const raw = localStorage.getItem(clave);
    if (!raw) return [];
    const ids: unknown = JSON.parse(raw);
    if (!Array.isArray(ids) || !ids.every((id) => typeof id === 'string')) throw new Error('No se pudo leer el listado local de trayectos eliminados.');
    return ids;
  },
  eliminar(id: string) {
    const valores = new Map<string, string>();
    const ids = [...new Set([...this.eliminados(), id])];
    valores.set(clave, JSON.stringify(ids));
    const rawZonas = localStorage.getItem('ciudad-limpia:zonas');
    if (rawZonas) {
      const zonas = JSON.parse(rawZonas);
      if (zonas.asignaciones) delete zonas.asignaciones[id];
      valores.set('ciudad-limpia:zonas', JSON.stringify(zonas));
    }
    const rawCamiones = localStorage.getItem('ciudad-limpia:camiones');
    if (rawCamiones) {
      const camiones = JSON.parse(rawCamiones) as { trayectos?: { id: string }[] }[];
      valores.set('ciudad-limpia:camiones', JSON.stringify(camiones.map((camion) => ({ ...camion,
        trayectos: camion.trayectos?.filter((trayecto) => trayecto.id !== id) ?? [],
      }))));
    }
    const anteriores = new Map([...valores.keys()].map((key) => [key, localStorage.getItem(key)]));
    try {
      valores.forEach((valor, key) => localStorage.setItem(key, valor));
    } catch (error) {
      anteriores.forEach((valor, key) => {
        try {
          if (valor === null) localStorage.removeItem(key);
          else localStorage.setItem(key, valor);
        } catch { /* Se informa el fallo y se conserva el listado visible. */ }
      });
      throw error;
    }
  },
};
