export const trayectosLocalesService = {
  quitarAsignaciones(id: string) {
    const clave = 'ciudad-limpia:zonas';
    const datos = localStorage.getItem(clave);
    if (!datos) return;
    const zonas = JSON.parse(datos);
    if (!zonas.asignaciones) return;
    delete zonas.asignaciones[id];
    localStorage.setItem(clave, JSON.stringify(zonas));
  },
};
