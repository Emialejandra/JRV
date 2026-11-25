# Backend electoral en Supabase

## Diagnóstico

El repositorio es una app Ionic/Angular y contiene funciones Supabase Edge en Deno; no existe un servidor Node/Express separado. El código existente y la documentación del proyecto usan las tablas `actas`, `asignaciones`, `candidaturas`, `cantones`, `detalle_votos`, `jrv`, `organizaciones`, `parroquias`, `perfiles`, `provincias` y `recintos`, con roles `veedor`, `coordinador_recinto`, `coordinador_provincial`, `administrador` y dignidades `alcaldia` y `prefectura`.

No hay en el repositorio un dump del esquema inicial, definiciones de RLS/triggers ni una salida verificable del catálogo remoto. Por eso, las columnas y relaciones preexistentes que asume el código no se pueden confirmar desde este entorno. La migración fue escrita como complemento, pero **no debe aplicarse al proyecto remoto hasta ejecutar las consultas de solo lectura de [`supabase-diagnostico.sql`](supabase-diagnostico.sql) y comparar sus resultados**. La migración añade columnas/RPCs y políticas restrictivas para bloquear escrituras directas a `actas` y `detalle_votos`; debe revisarse frente a las políticas y triggers que ya existan.

## Cambios añadidos

- `supabase/functions/_shared/`: autenticación, comprobación de rol/pertenencia, validación de cédula y actas, manejo uniforme de respuestas y paginación.
- `actas-api`: listar/detallar actas, registrar/corregir actas y consultar el historial de correcciones.
- `acta-fotografia`: recibe JPEG, PNG o WebP de hasta 10 MB, verifica firmas del archivo, genera una ruta segura y devuelve una URL firmada temporal.
- `sincronizar-actas`: procesa hasta 25 registros; cada resultado identifica éxito, validación, autorización o conflicto.
- `dashboard-electoral`: consolida estados, GPS y votos según la provincia, recinto o pertenencia del actor.
- `recintos-api` y `asignaciones-api`: creación idempotente de recintos/JRV, consulta territorial y reasignación/desactivación atómica de veedores.
- `precargar-datos`: invoca la precarga idempotente de organizaciones, candidaturas y recintos; solo un administrador puede ejecutarla.
- `login-cedula` y `cambiar-password`: usan respuestas uniformes y mantienen claves administrativas exclusivamente en el entorno de Edge Functions. Se eliminó el método cliente de autorregistro.
- `crear-coordinador` ya completa el envío de confirmación después de una asignación exitosa, bloquea un segundo coordinador activo por recinto y devuelve respuestas uniformes. `crear-veedor` fue adaptada a las utilidades compartidas.

La migración `supabase/migrations/20261124174000_backend_additions.sql` añade `dignidad`, `client_id` y `fotografia_path` a `actas`; políticas RLS que bloquean INSERT/UPDATE/DELETE directos de usuarios `anon`/`authenticated` sobre actas y votos; RPCs transaccionales para actas, recintos y asignaciones; un historial de correcciones; índices y un bucket privado de fotografías. Las consultas desde el cliente se enrutan por Edge Functions con verificación de pertenencia. **No se ha aplicado a la base remota.**

## Configuración y despliegue

Configurar como secretos de Edge Functions, nunca en Angular:

- `SUPABASE_URL`
- `SUPABASE_ANON_KEY`
- `SERVICE_ROLE_KEY` o `SUPABASE_SERVICE_ROLE_KEY`
- `APP_URL`
- `RESEND_API_KEY`

La clave de servicio solo se usa en funciones de servidor. Desactivar también el autorregistro en **Supabase Auth > Settings**; las cuentas se crean únicamente por las funciones administrativas autenticadas.

Antes de desplegar:

1. Respaldar la base y revisar la migración en un entorno de prueba. La migración no aplica el seed electoral.
2. Comprobar si existen recintos con más de un coordinador activo. Si existen, la migración emite un warning y no crea el índice único hasta resolver los duplicados; no elimina ni reasigna cuentas.
3. Aplicar la migración con el flujo de despliegue del proyecto y verificar el bucket privado `actas-electorales`.
4. Desplegar las Edge Functions y configurar los secretos. No publicar secretos en archivos `environment` del frontend.
5. Ejecutar `precargar-datos` con IDs y nombres reales de provincia/cantón/parroquia, cinco organizaciones y cinco candidaturas por dignidad. No se inventaron datos electorales.

La migración depende del esquema Supabase existente (incluidos `storage.buckets`, `storage.objects` y los roles `anon`, `authenticated` y `service_role`). No debe ejecutarse hasta confirmar esos objetos en el proyecto de destino.

## Contratos de las funciones nuevas

Las funciones nuevas aceptan `POST` y usan `{ success: true, data }` o `{ success: false, error: { code, message } }`.

| Función | Acción / entrada | Acceso |
| --- | --- | --- |
| `actas-api` | `listar` con `jrv_id`; `detalle`/`historial` con `acta_id`; `guardar`/`corregir` con `data` | Rol y pertenencia verificados en servidor |
| `acta-fotografia` | multipart `jrv_id`, `dignidad`, `file` | Veedor asignado o coordinador del recinto |
| `sincronizar-actas` | `registros[]` con `client_id` estable; para correcciones, `acta_id` y `expected_updated_at` | Veedor y coordinador de recinto; autorización individual por registro |
| `dashboard-electoral` | opcional `provincia_id` o `recinto_id` | Administrador, coordinador provincial o de recinto dentro de su ámbito |
| `recintos-api` | `listar` o `crear` con `parroquia_id`, `nombre`, `cantidad_jrv` y campos opcionales | Administrador o coordinador provincial de la provincia |
| `asignaciones-api` | `listar`, `asignar_veedor` o `desactivar_veedor` | Veedor consulta lo propio; coordinador opera dentro de su recinto |
| `precargar-datos` | provincia/cantón, cinco organizaciones, diez candidaturas y recintos | Administrador autenticado |

Para un acta, `votos` debe incluir exactamente cinco `candidatura_id` distintos y activos de cinco organizaciones distintas, todos de la dignidad indicada. El backend verifica que votos válidos + blancos + nulos sea igual al total de sufragantes. `client_id` permite reintentos idempotentes; `expected_updated_at` impide sobrescribir una edición concurrente.

## Pruebas y verificación de seguridad

### Pruebas automatizadas ejecutables

- `npx vitest run supabase/functions/_shared/validation.test.ts`: valida cédula ecuatoriana, UUID idempotente, candidaturas duplicadas y cuadre de votos.
- `npm run build`
- `npm run typecheck:e2e`

No se pudo ejecutar `deno check` ni validar/aplicar el SQL en PostgreSQL desde este entorno: no están disponibles Deno ni `psql`, y no se accedió a la base remota.

### Aislamiento veedor/JRV

1. Crear dos veedores activos, asignar uno a JRV A y el otro a JRV B.
2. Con el token del veedor A, solicitar `actas-api` con `action: "listar"` y `jrv_id` de B; debe responder HTTP 403 (`JRV_FORBIDDEN`) sin devolver actas.
3. Con ese mismo token, intentar `acta-fotografia` para B y sincronizar un registro cuya `jrv_id` sea B; la subida debe responder 403 y el registro de sincronización debe quedar como fallido por autorización.
4. Repetir el aislamiento para detalle de un acta de B. El endpoint comprueba primero pertenencia a la JRV antes de responder.
5. Con un coordinador de recinto A, intentar crear/listar un recinto o corregir un acta del recinto B; debe responder 403. La RPC valida también el ámbito, por lo que llamar directamente a la función no elimina ese control.
6. Usar dos clientes que corrijan el mismo `acta_id`: el segundo debe recibir HTTP 409 (`ACTA_CONFLICT`) al enviar un `expected_updated_at` anterior.
7. Con un JWT `authenticated`, intentar INSERT/UPDATE/DELETE directo por PostgREST en `actas` y `detalle_votos`; debe fallar por RLS. Confirmar que guardar/corregir mediante `actas-api` sí opera por la RPC después de validar rol y pertenencia.

## Límites conocidos

- La comprobación de tipo de imagen verifica formato y firma, no nitidez/borrosidad. El esquema confirmado no tiene un campo de calidad ni el entorno dispone de un decodificador/analizador de imagen; no se presenta esa comprobación como implementada.
- La metadata disponible confirma `latitud` y `longitud`, pero no precisión GPS. La precisión no se persiste porque el esquema no la contempla.
- El seed no contiene nombres reales ni candidaturas: debe ejecutarse con datos oficiales proporcionados por el equipo.
- Las funciones/triggers RLS y políticas de Storage preexistentes deben inspeccionarse en Supabase antes de desplegar. La nueva ruta de Storage usa un bucket separado, privado y accesible por el backend.
