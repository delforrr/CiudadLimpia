# B02. Actualizar un trayecto existente

**Depende de** [B01](01-crear-y-consultar.md).

Permitir que un administrador corrija los datos, puntos y geometría de un trayecto guardado.

- [ ] La actualización conserva el ID del trayecto y reemplaza puntos y línea juntos en una transacción.
- [ ] Aplica las mismas reglas de validación y de referencias públicas del alta.
- [ ] La lectura posterior devuelve el trazado editado y los puntos en el orden indicado.
- [ ] Una actualización inválida deja consultable la versión anterior. Las pruebas HTTP cubren el flujo y Swagger documenta la operación.
