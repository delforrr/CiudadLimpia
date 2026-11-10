# B03. Integrar el contrato de búsqueda con Trayectos

**Depende de** [B01](01-crear-y-consultar.md).

Verificar que el editor pueda consultar el proxy de GeoRef y guardar los puntos resultantes mediante el contrato de Trayectos.

- [ ] La búsqueda directa por calle y altura y la inversa por pin son accesibles para ADMIN desde el mismo origen que el panel.
- [ ] La respuesta distingue una ubicación aproximada, una sugerencia sin altura, ausencia de resultados y fallo del proveedor.
- [ ] Un pin confirmado se puede guardar con una referencia pública completa, parcial o con solo coordenadas, incluso cuando falla GeoRef.
- [ ] Se reutilizan los endpoints y las pruebas HTTP existentes. Solo se ajustan el enrutamiento o el contrato si la integración lo necesita.
