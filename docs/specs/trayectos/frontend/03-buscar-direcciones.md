# F03. Agregar puntos desde la búsqueda de direcciones

**Depende de** [F01](01-cargar-y-ver.md) y [B03](../backend/03-geocodificar-puntos.md).

Integrar la búsqueda por calle y altura y la sugerencia inversa al confirmar un pin en el editor compartido.

- [ ] El operador puede elegir una ubicación sugerida, ajustar el pin y confirmar qué referencia quiere asociar.
- [ ] Una sugerencia sin altura se muestra como tal y puede guardarse.
- [ ] Si falta una sugerencia o falla GeoRef, el pin y el resto del formulario se conservan y se puede seguir manualmente.
- [ ] Una respuesta tardía no reemplaza un pin posterior. La interfaz incluye la atribución de GeoRef.
