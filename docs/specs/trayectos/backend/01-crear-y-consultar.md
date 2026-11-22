# B01. Persistir y consultar trayectos

**Depende de** ninguno.

Crear el catálogo inicial de localidades y la API administrativa para guardar, listar y consultar trayectos manuales.

- [x] Una migración aditiva incorpora la persistencia del trayecto sin modificar domicilios existentes.
- [x] El catálogo inicial incluye Trenque Lauquen con su ID de GeoRef y se puede consultar sin red externa.
- [x] El alta valida nombre, localidad, orden de puntos, coordenadas y geometría. El listado y el detalle devuelven lo necesario para reabrir la línea.
- [x] El alta reutiliza o crea una Dirección pública por punto, permite altura ausente y rechaza referencias privadas. Los pines distintos de una misma calle sin altura se conservan por separado.
- [x] El alta es atómica. Las pruebas HTTP cubren permisos, entrada inválida y lectura posterior. Swagger describe el contrato.
