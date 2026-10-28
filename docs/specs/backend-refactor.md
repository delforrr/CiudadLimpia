## Problem Statement
El backend duplica creación y listado de cuentas, mezcla infraestructura y autenticación y repite contratos de validación y configuración de pruebas. Esto hace que cambios pequeños requieran editar varios lugares y permite que documentación, aplicación y pruebas diverjan.

## Solution
Reunir autenticación y usuarios en AccountsModule, compartir Prisma desde PrismaModule y migrar por slices a contratos Zod documentados nativamente por Nest 12 y Swagger 12. Actualizar el frontend junto con los cambios públicos. Conservar seguridad, datos y operaciones atómicas.

## User Stories
1. Como persona usuaria, quiero registrarme y recibir mi sesión para utilizar la aplicación.
2. Como persona usuaria, quiero que se normalice mi email para iniciar sesión de forma consistente.
3. Como persona usuaria, quiero confirmar la contraseña en el formulario sin enviar una copia al servidor.
4. Como persona usuaria, quiero que las contraseñas con espacios se conserven exactamente.
5. Como persona usuaria, quiero que se respeten los límites UTF-8 de bcrypt.
6. Como persona usuaria, quiero recuperar mi sesión sin recibir tokens ni hashes en JSON.
7. Como persona usuaria, quiero recordar mi sesión durante siete días cuando lo solicito.
8. Como persona usuaria, quiero cerrar mi sesión eliminando su cookie.
9. Como titular, quiero editar únicamente mi cuenta y perfil.
10. Como titular, quiero conservar mis domicilios cuando no los envío.
11. Como titular, quiero reemplazar mis domicilios de forma atómica.
12. Como titular, quiero etiquetas opcionales o nulas para mis domicilios.
13. Como administrador, quiero crear cuentas con el rol indicado en el cuerpo JSON.
14. Como administrador, quiero listar cuentas desde una única ruta.
15. Como administrador, quiero consultar, modificar y eliminar cuentas manteniendo sus permisos.
16. Como operador, quiero que se utilice el rol actual de la base para autorizar.
17. Como operador, quiero que registro y login compartan su límite de intentos y Retry-After.
18. Como cliente API, quiero errores claros ante campos desconocidos, roles inválidos y datos nulos.
19. Como mantenedor, quiero una sola implementación de creación de cuentas.
20. Como mantenedor, quiero una sola instancia Prisma independiente de autenticación.
21. Como mantenedor, quiero pruebas HTTP con la misma configuración de validación que producción.
22. Como integrador, quiero documentación OpenAPI consistente con los contratos ejecutados.
23. Como mantenedor, quiero conservar el trabajo local de puntos limpios fuera de los commits del refactor.
24. Como operador, quiero conservar el esquema, las migraciones históricas y los datos existentes.

## Implementation Decisions
- Rama de integración codex/backend-refactor basada en feature/PuntosLimpios, commit 212f5ae. Los cuatro cambios locales de puntos limpios permanecen en el checkout original.
- AccountsModule registra ambos controladores, AuthService, UserService, estrategia JWT y guards. PrismaModule proporciona y exporta la única instancia del cliente. Configuración de entorno cargada una vez desde la raíz.
- No agregar repositorios, capas genéricas, nuevas pantallas ni dependencias de autenticación.
- Usar AuthGuard('jwt') de Passport directamente y conservar JwtStrategy con consulta del rol actual.
- AuthService delega creación en UserService con Role.USER explícito. Conservar bcrypt 12, comparación de contraseña para emails desconocidos y selección pública explícita.
- Separar política HTTP común de guard de intentos aplicado solo a registro y login; contador compartido por IP, diez solicitudes por quince minutos, por proceso.
- POST /auth/register recibe email, password y cliente con name, lastName, domicilios. Rechaza role, rememberMe y repeatedPassword.
- POST /users recibe email, password, role y cliente. Solo ADMIN; rol obligatorio USER o ADMIN en JSON, sin soporte del antiguo query.
- Eliminar GET /auth/all, usar GET /users. Conservar las otras rutas, códigos y estructura pública de respuestas.
- Confirmación de contraseña exclusivamente en el formulario. Actualizar el contrato y consumidor frontend en el mismo slice.
- Migrar DTOs de entrada y documentación de respuesta a esquemas Zod 4.6.7 con tipos inferidos; StandardSchemaValidationPipe y esquemas nativos Swagger. No usar nestjs-zod ni plugin CLI.
- Objetos estrictos anidados, email normalizado con criterio Zod del frontend, límites de texto conservando conteo Unicode y contraseña sin trim de mínimo ocho caracteres y máximo 72 bytes UTF-8.
- Omitir campos de PATCH conserva valores; null se rechaza salvo etiqueta. Cliente enviado requiere nombre y apellido, omitir domicilios los conserva; enviar lista reemplaza atómicamente con nuevos IDs. Mantener obligación de completar domicilios.
- Conservar cookies HttpOnly/SameSite Strict, Secure en producción, expiración una hora o siete días, prioridad Bearer sobre cookie y HS256.
- Eliminar AppService y verifyOptions sin consumidor. Usar errores conocidos Prisma reales para 409/404; otros errores se propagan.
- No cambiar esquema ni migraciones. No introducir serialización adicional que sustituya la selección pública.
- Retirar dependencias directas class-validator/class-transformer al terminar la transición. Conservar dotenv para Prisma CLI.
- Cambios públicos deliberados sin alias de compatibilidad; despliegue coordinado frontend/backend.

## Testing Decisions
- Interfaz principal: HTTP Nest con validación, bcrypt y JWT reales, sustituyendo únicamente persistencia. Mantener pruebas de formulario/servicio frontend y documento OpenAPI ya existentes.
- Un buen test observa permisos, respuestas, cookies o errores; no exige helpers privados ni estructura exacta de consultas salvo garantía de persistencia que no pueda observarse con el mock.
- Red/green por slice. Preservar pruebas de tokens ausentes, alterados, vencidos, usuarios eliminados, rol actual, permisos propios/admin, contenido JSON y cross-site.
- Probar registro nuevo, eliminación de ruta duplicada, alta con rol en JSON, rechazo de formatos antiguos y tipos desconocidos.
- Probar Unicode astral, UTF-8, null/ausencia, arrays vacíos/excesivos, normalización y edición de domicilios.
- Probar contador conjunto, ventana y Retry-After; cookies en producción/desarrollo.
- Compartir configuración de aplicación entre bootstrap y pruebas. Reducir simulación artesanal de Prisma con fixtures/mocks por operación.
- Backend: build, unitarias, HTTP, lint sin correcciones, audit cero. Frontend: pruebas, build y lint.
- No afirmar atomicidad real a partir de mocks: escrituras anidadas mantienen garantías Prisma, sin ejecutar migraciones sobre la base local.

## Out of Scope
Integración HTTP/frontend de puntos limpios, cambios de esquema/migraciones/datos, refresh tokens, revocación, recuperación de contraseñas, limitador distribuido, nuevas pantallas, nuevo runner de tests y paquetes compartidos entre frontend y backend.

## Further Notes
Spec sintetizado del plan acordado, sin issue original. Base comparada contra develop. Implementación mediante commits atómicos por slices y revisión final de Standards/Spec. Preservar los cambios locales originales y no incorporarlos en los commits.

