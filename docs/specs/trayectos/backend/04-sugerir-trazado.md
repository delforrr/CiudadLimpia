# B04. Calcular una conexión por calles

**Depende de** [B01](01-crear-y-consultar.md), por el formato de puntos y línea que consume el editor.

Exponer una sugerencia de recorrido vial para una secuencia de puntos.

- [ ] Se verifica un caso conocido de Trenque Lauquen con el motor y perfil elegidos.
- [ ] La API acepta puntos válidos de un administrador, respeta su orden y devuelve la línea sugerida para el editor.
- [ ] Un fallo o ausencia de ruta produce una respuesta que permite seguir por la vía manual.
- [ ] Calcular una sugerencia deja intacto el trayecto guardado. Las pruebas HTTP simulan éxito, ruta inexistente y fallo del motor. Swagger describe la operación.
