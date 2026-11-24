# Trayectos de recolección domiciliaria

## Problema

El operador municipal necesita registrar por qué calles circula el camión durante la recolección puerta a puerta. La sección Trayectos del panel todavía carece de un editor y de persistencia compartida. GeoRef puede ayudar a ubicar una referencia, pero una calle reconocida puede venir sin altura o sin coordenadas.

## Solución

En el panel de administración, el operador elige una localidad, nombra el trayecto y agrega puntos ordenados con el mapa o los campos de búsqueda. Puede dibujar la conexión manualmente o pedir una sugerencia por calles y corregirla. Guarda una sola línea de circulación junto con los puntos confirmados. Desde el listado puede abrir y editar el trayecto guardado.

## Historias de usuario

1. Como operador, quiero seleccionar la localidad para identificar dónde se realiza el trayecto.
2. Como operador, quiero darle un nombre al trayecto para encontrarlo en el listado.
3. Como operador, quiero marcar un pin en el mapa para agregar una esquina, un giro o un punto de paso.
4. Como operador, quiero buscar una calle y altura para ubicar un punto sin recorrer el mapa.
5. Como operador, quiero revisar el resultado sugerido y ajustar el pin antes de agregarlo.
6. Como operador, quiero conservar una calle sin altura cuando la numeración no esté disponible.
7. Como operador, quiero agregar un pin sin dirección reconocida para cubrir lugares donde GeoRef carece de datos.
8. Como operador, quiero reutilizar una dirección pública existente para mantener una referencia común.
9. Como operador, quiero ver los puntos numerados para comprobar el orden del recorrido.
10. Como operador, quiero mover, quitar y reordenar puntos para corregir el trazado.
11. Como operador, quiero dibujar el recorrido manualmente para representar las calles por las que pasa el camión.
12. Como operador, quiero solicitar una conexión por calles para agilizar la carga.
13. Como operador, quiero agregar puntos intermedios o ajustar la línea propuesta para que siga el recorrido real.
14. Como operador, quiero continuar con la edición manual si falla la conexión automática.
15. Como operador, quiero ver toda la circulación como una sola línea para revisar el trayecto de principio a fin.
16. Como operador, quiero confirmar y guardar la línea que revisé para poder consultarla después.
17. Como operador, quiero abrir un trayecto guardado y ver el mismo trazado aunque GeoRef o el motor de rutas estén caídos.
18. Como operador, quiero conservar el formulario si falla el guardado para poder reintentar.
19. Como operador, quiero poder ordenar los puntos con botones para completar la edición usando el teclado.
20. Como administrador, quiero limitar estas operaciones al panel para que solo el personal autorizado edite trayectos.

## Decisiones de implementación

- Usar el selector **Localidad**. GeoRef v2 devuelve Trenque Lauquen como localidad censal con ID `06826050`. Incorporar esa entrada al catálogo inicial con el ID y nombre del proveedor, de modo que seleccionar y guardar funcione con el catálogo persistido. La consulta pública de `/barrios` devolvió 404. Por ahora se toma la localidad censal como unidad del selector. [Consulta oficial de la localidad](https://apis.datos.gob.ar/georef/api/v2.0/localidades-censales?id=06826050&campos=id,nombre)
- Cada trayecto tiene nombre, una localidad, una zona obligatoria de esa localidad y puntos ordenados. Cada punto tiene sus coordenadas confirmadas y una relación con una fila de `Direccion` pública. Una misma referencia puede aparecer en más de una posición del trayecto.
- Reutilizar una dirección pública seleccionada o una coincidencia de calle y altura completas. Para un pin sin altura, la coincidencia requiere la misma posición confirmada y la misma referencia de calle cuando exista. La calle por sí sola puede abarcar varias cuadras. Si falta una coincidencia pública, crear la fila de `Direccion` con `clienteId = null` y altura opcional. Se admite una dirección con solo coordenadas cuando no hay calle sugerida. Estas reglas corresponden al alta de referencias para trayectos.
- El punto y la geometría conservan las coordenadas que el operador confirmó, aunque la referencia pública tenga otras coordenadas o se edite después. La API de trayectos acepta referencias públicas y rechaza las asociadas a un cliente.
- Guardar la geometría confirmada como una sola línea y conservar el orden de los puntos de control para editarla. Validar coordenadas finitas, orden y una línea con al menos dos posiciones distintas. Al modificar los puntos, actualizar y revisar la línea antes de guardar.
- Guardar el trayecto, su zona, geometría, puntos y tramos en una transacción. El alta requiere `zonaId`. La edición mantiene la zona si se omite el campo y rechaza `null`. Solo ADMIN puede administrar zonas y trayectos. Una zona con trayectos asignados no se puede borrar.
- Reutilizar el proxy existente de GeoRef. La directa ayuda cuando hay calle y altura. La inversa puede sugerir calle o altura para un pin. Las sugerencias se confirman antes de asociarlas. El pin se conserva si falla el proveedor o la sugerencia llega incompleta.
- La conexión por calles respeta el orden indicado por el operador. Evaluar OSRM con trayectos conocidos en Trenque Lauquen antes de elegir el servicio y perfil. La geometría calculada se presenta para revisión, dado que puede elegir otra calle entre dos puntos. El editor permite ajustar los puntos de paso y dibujar manualmente. [Contrato del servicio Route de OSRM](https://project-osrm.org/docs/v5.24.0/api/#route-service)
- Usar la pestaña Trayectos del panel, controles MUI y mapa Leaflet. En escritorio, lista de puntos junto al mapa. En móvil, alternar lista y mapa conservando la edición. Mantener el estado en el hook del editor y las llamadas HTTP en servicios.
- El listado, el detalle y la edición consultan la API. El guardado exitoso se confirma después de recibir respuesta del servidor.

## Pruebas

- Probar el backend por HTTP siguiendo las pruebas de puntos limpios y geocodificación. Verificar permisos, validación, creación, lectura y actualización de un trayecto. Verificar la escritura atómica con PostgreSQL en una prueba de persistencia.
- Controlar las respuestas de GeoRef y del motor de rutas con datos de prueba reproducibles. Cubrir calle sin altura, pin sin dirección, proveedor no disponible y rechazo de referencias privadas.
- Verificar en el panel el flujo completo de crear, recargar, editar y reabrir un trayecto. Usar las pruebas de servicios y formularios existentes como referencia. Incluir una comprobación del mapa en escritorio y móvil, reordenamiento por teclado y conservación de la edición si falla el guardado.
- Contrastar una sugerencia por calles con un recorrido conocido. La prueba verifica el trazado devuelto y la capacidad de corregirlo en el editor.

## Fuera de alcance del editor

- Mapa público y consulta por domicilio.
- Clasificación de segmentos como recolección o traslado. Toda la circulación queda representada por una línea.
- Barrios o polígonos de cobertura, optimización del orden, seguimiento GPS, cronogramas y asignación de camiones o choferes.
- Validación catastral de direcciones y certificación de restricciones de circulación de camiones.

## Entregas incrementales

| Entrega | Backend | Frontend | Demostración |
| --- | --- | --- | --- |
| 01. Crear y ver | [B01](backend/01-crear-y-consultar.md) | [F01](frontend/01-cargar-y-ver.md) | Marcar puntos, guardar y reabrir la línea. |
| 02. Editar | [B02](backend/02-editar.md) | [F02](frontend/02-editar.md) | Ajustar el recorrido existente y volver a abrirlo. |
| 03. Buscar direcciones | [B03](backend/03-geocodificar-puntos.md) | [F03](frontend/03-buscar-direcciones.md) | Agregar un pin por búsqueda y seguir si faltan datos. |
| 04. Conectar por calles | [B04](backend/04-sugerir-trazado.md) | [F04](frontend/04-revisar-sugerencia.md) | Calcular, corregir, guardar y reabrir la línea confirmada. |

La entrega 01 establece el formato que comparten las otras tres. Los tickets de frontend pueden prepararse con el contrato acordado y se cierran al verificar su integración con la API. Las dependencias de cada archivo indican qué tiene que estar disponible para completar ese ticket.

## Cobertura por domicilio

Para guardar un trayecto, el operador asigna una calle a toda la línea mediante tramos sin huecos ni solapamientos. Cada tramo indica sus vértices de inicio y fin en la geometría final. Si la vía cambia de nombre, se divide en el punto de cambio, aunque el camión siga derecho. Los índices crecen en el sentido del recorrido y admiten alturas descendentes.

### Regla de coincidencia

1. Proyectar el pin dentro de un tramo de la línea a 20 m o menos y verificar que la calle coincida. Los renombres documentados que identifican la misma calle se resuelven con el catálogo local.
2. Comprobar el lado atendido. El tramo puede cubrir ambas veredas, solo la izquierda o solo la derecha, según el sentido del recorrido. Para un solo lado, el pin debe quedar de ese lado de la línea.
3. Conservar la distancia acumulada de cada paso confirmado. Si el camión pasa dos veces por el frente, se usan ambos pasos para calcular el siguiente aviso. Hoy ordena los resultados por distancia al tramo que cubre el frente.

### Resultado para Hoy

El backend verifica que el domicilio seleccionado esté vinculado a la cuenta y devuelve todos los trayectos que cumplen la regla de cobertura.

Hoy muestra en el mapa los camiones de trayectos confirmados para el domicilio seleccionado. Para el push, comparar el avance del camión por la línea con la posición del próximo paso por el frente. Enviar cuando avance hacia el frente y falten más de 0 y hasta 300 metros sobre el trayecto. Cada prestación que cubra el frente puede generar un push.

El proveedor GPS identifica cada prestación mediante un `servicioId` estable. La primera muestra aceptada vincula la prestación al camión y guarda una copia de la geometría y los tramos. El backend conserva la última posición utilizable y la expone durante 30 segundos. Cada navegador suscribe un domicilio propio y recibe un push por prestación. Dos camiones sobre el mismo frente generan dos avisos. El envío real permanece deshabilitado hasta validar las tolerancias locales y configurar VAPID.

### Muestra para validar la regla

Tomar del plano municipal un cruce, una recta larga, una paralela, una cuadra parcial y una avenida con rambla. Cargar los casos como trayectos y domicilios de prueba, con los mismos campos que utiliza el editor. El cruce de Uriburu y Villegas y el tramo de Uriburu entre Roca y San Martín son referencias documentadas. [Plano municipal](https://www.trenquelauquen.gov.ar/mapas/) · [Referencia de Uriburu y Villegas](https://www.trenquelauquen.gov.ar/noticias/el-municipio-trabaja-en-la-repavimentacion-de-la-avenida-villegas-en-interseccion-con-tte-gral-uriburu-donde-se-realizo-una-obra-de-cloacas/)

| Caso | Resultado esperado |
| --- | --- |
| Recta de varias cuadras con dos pines de la misma calle y un frente intermedio | Cubierto aunque el punto de otro trayecto quede más cerca. |
| Calle paralela o cruce perpendicular cerca del frente | Sin cobertura para ese frente. |
| Fin a mitad de cuadra | Cubierto antes del extremo. Sin cobertura después. |
| Ida y vuelta por el mismo tramo o dos porciones con un hueco | La repetición conserva la cobertura. El hueco queda fuera. |
| Líneas manual y sugerida que recorren las mismas porciones | Mismos frentes cubiertos. |
| Frente en esquina con dos trayectos cercanos y una sola coincidencia de calle confirmada | Solo el trayecto de la calle del frente tiene cobertura. |
| Frente en esquina donde las referencias dejan dos interpretaciones plausibles | Datos insuficientes. |
| Diagonal por una manzana o asignación ambigua que podría afectar el frente | Datos insuficientes para ese frente. Porción para revisión del operador. |
| Dos vecinos comparten frente | Misma cobertura para ambos. Cada consulta comprueba el vínculo del domicilio con su cuenta. |
| Dos trayectos cubren el mismo frente | Ambos aparecen como coincidencias. |
