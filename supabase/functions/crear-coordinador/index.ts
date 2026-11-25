import { createClient } from 'npm:@supabase/supabase-js@2';

const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers':
        'authorization, x-client-info, apikey, content-type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS'
};

const responder = (body: Record<string, unknown>, status = 200) => {
    const isError = status >= 400;
    const payload = isError
        ? {
            success: false,
            error: {
                code: status === 409
                    ? 'COORDINATOR_CONFLICT'
                    : status === 403
                        ? 'FORBIDDEN'
                        : status === 401
                            ? 'UNAUTHENTICATED'
                            : status === 400
                                ? 'INVALID_REQUEST'
                                : 'REQUEST_FAILED',
                message: String(body.error ?? 'No se pudo completar la operación.')
            }
        }
        : {
            success: true,
            data: body
        };

    return new Response(JSON.stringify(payload), {
        status,
        headers: {
            ...corsHeaders,
            'Content-Type': 'application/json'
        }
    });
};

class DuplicateCoordinatorError extends Error { }

function escapeHtml(value: string): string {
    return value.replace(/[&<>"']/g, (character) => {
        const entities: Record<string, string> = {
            '&': '&amp;',
            '<': '&lt;',
            '>': '&gt;',
            '"': '&quot;',
            "'": '&#39;'
        };
        return entities[character];
    });
}

// ==========================================================
// VALIDACIÓN DE CÉDULA ECUATORIANA
// ==========================================================

function validarCedula(cedula: string): boolean {

    if (!/^\d{10}$/.test(cedula)) {
        return false;
    }

    const provincia =
        Number(cedula.substring(0, 2));

    const tercerDigito =
        Number(cedula[2]);

    if (
        !(
            (provincia >= 1 && provincia <= 24) ||
            provincia === 30
        ) ||
        tercerDigito > 5
    ) {
        return false;
    }

    let suma = 0;

    for (let i = 0; i < 9; i++) {

        let valor =
            Number(cedula[i]);

        if (i % 2 === 0) {

            valor *= 2;

            if (valor > 9) {
                valor -= 9;
            }
        }

        suma += valor;
    }

    const digitoVerificador =
        (10 - (suma % 10)) % 10;

    return (
        digitoVerificador ===
        Number(cedula[9])
    );
}

// ==========================================================
// FUNCIÓN PRINCIPAL
// ==========================================================

Deno.serve(async (req) => {

    // ------------------------------------------------------
    // CORS
    // ------------------------------------------------------

    if (req.method === 'OPTIONS') {

        return new Response('ok', {
            headers: corsHeaders
        });
    }

    if (req.method !== 'POST') {

        return responder({
            error: 'Método no permitido.'
        }, 405);
    }

    let admin:
        ReturnType<typeof createClient> | null = null;

    let usuarioCreadoId:
        string | null = null;

    let etapa =
        'inicialización';

    try {

        // ==================================================
        // VARIABLES DE ENTORNO
        // ==================================================

        const SUPABASE_URL =
            Deno.env.get('SUPABASE_URL');

        const SUPABASE_ANON_KEY =
            Deno.env.get('SUPABASE_ANON_KEY');

        const serviceRoleKey =
            Deno.env.get("SERVICE_ROLE_KEY") ||
            Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

        if (
            !SUPABASE_URL ||
            !SUPABASE_ANON_KEY ||
            !serviceRoleKey
        ) {

            console.error(
                'Faltan variables de entorno requeridas.'
            );

            throw new Error(
                'Falta configurar las variables necesarias del servidor.'
            );
        }

        // ==================================================
        // VALIDAR SESIÓN DEL SOLICITANTE
        // ==================================================

        const authorization =
            req.headers.get('Authorization');

        if (
            !authorization ||
            !authorization.startsWith('Bearer ')
        ) {

            return responder({
                error:
                    'Sesión no proporcionada.'
            }, 401);
        }

        const token =
            authorization.substring(7);

        const authClient =
            createClient(
                SUPABASE_URL,
                SUPABASE_ANON_KEY,
                {
                    auth: {
                        persistSession: false,
                        autoRefreshToken: false
                    }
                }
            );

        const {
            data: authData,
            error: authError
        } =
            await authClient.auth.getUser(token);

        if (
            authError ||
            !authData.user
        ) {

            return responder({
                error:
                    'Sesión inválida o expirada.'
            }, 401);
        }

        const solicitanteId =
            authData.user.id;

        // ==================================================
        // CLIENTE ADMINISTRATIVO
        // ==================================================

        admin =
            createClient(
                SUPABASE_URL,
                serviceRoleKey,
                {
                    auth: {
                        persistSession: false,
                        autoRefreshToken: false
                    }
                }
            );

        // ==================================================
        // COMPROBAR PERFIL DEL SOLICITANTE
        // ==================================================

        const {
            data: solicitante,
            error: errorSolicitante
        } =
            await admin
                .from('perfiles')
                .select(
                    'id, rol, activo'
                )
                .eq(
                    'id',
                    solicitanteId
                )
                .single();

        if (
            errorSolicitante ||
            !solicitante ||
            !solicitante.activo
        ) {

            return responder({
                error:
                    'Usuario sin permisos para esta operación.'
            }, 403);
        }

        const esAdministrador =
            solicitante.rol ===
            'administrador';

        const esProvincial =
            solicitante.rol ===
            'coordinador_provincial';

        if (
            !esAdministrador &&
            !esProvincial
        ) {

            return responder({
                error:
                    'No tienes permisos para crear coordinadores.'
            }, 403);
        }

        // ==================================================
        // DATOS DEL FORMULARIO
        // ==================================================

        const {
            nombres,
            apellidos,
            cedula,
            email,
            telefono,
            recinto_id
        } = await req.json();

        const nombreLimpio =
            typeof nombres === 'string'
                ? nombres.trim()
                : '';

        const apellidoLimpio =
            typeof apellidos === 'string'
                ? apellidos.trim()
                : '';

        const cedulaLimpia =
            typeof cedula === 'string'
                ? cedula.trim()
                : '';

        const emailLimpio =
            typeof email === 'string'
                ? email.trim().toLowerCase()
                : '';

        const telefonoLimpio =
            typeof telefono === 'string'
                ? telefono.trim()
                : '';

        const recintoId =
            Number(recinto_id);

        // ==================================================
        // VALIDACIONES
        // ==================================================

        if (
            !nombreLimpio ||
            !apellidoLimpio ||
            !emailLimpio ||
            !cedulaLimpia ||
            !telefonoLimpio ||
            !Number.isSafeInteger(recintoId) ||
            recintoId <= 0
        ) {

            return responder({
                error:
                    'Completa todos los campos obligatorios.'
            }, 400);
        }

        if (
            !validarCedula(
                cedulaLimpia
            )
        ) {

            return responder({
                error:
                    'La cédula ecuatoriana no es válida.'
            }, 400);
        }

        if (
            !/^[^\s@]+@[^\s@]+\.[^\s@]+$/
                .test(emailLimpio)
        ) {

            return responder({
                error:
                    'El correo electrónico no es válido.'
            }, 400);
        }

        if (
            nombreLimpio.length > 100 ||
            apellidoLimpio.length > 100 ||
            emailLimpio.length > 254 ||
            telefonoLimpio.length > 20 ||
            (telefonoLimpio !== '' &&
                !/^\+?[0-9()\-\s]{7,20}$/.test(telefonoLimpio))
        ) {

            return responder({
                error:
                    'Uno de los campos supera la longitud permitida.'
            }, 400);
        }

        // ==================================================
        // COMPROBAR CÉDULA DUPLICADA
        // ==================================================

        const {
            data: cedulaExistente,
            error: errorCedula
        } =
            await admin
                .from('perfiles')
                .select('id')
                .eq(
                    'cedula',
                    cedulaLimpia
                )
                .maybeSingle();

        if (errorCedula) {
            throw errorCedula;
        }

        if (cedulaExistente) {

            return responder({
                error:
                    'Ya existe un usuario registrado con esa cédula.'
            }, 409);
        }

        // ==================================================
        // COMPROBAR RECINTO
        // ==================================================

        const {
            data: recinto,
            error: errorRecinto
        } =
            await admin
                .from('recintos')
                .select(`
                    id,
                    activo,
                    parroquias!inner (
                        canton_id,
                        cantones!inner (
                            provincia_id
                        )
                    )
                `)
                .eq(
                    'id',
                    recintoId
                )
                .maybeSingle();

        if (errorRecinto) {
            throw errorRecinto;
        }

        if (
            !recinto ||
            !recinto.activo
        ) {

            return responder({
                error:
                    'El recinto no existe o está inactivo.'
            }, 404);
        }

        const parroquia =
            recinto.parroquias as any;

        const canton =
            parroquia?.cantones;

        const provinciaId =
            Number(
                canton?.provincia_id
            );

        if (!provinciaId) {

            throw new Error(
                'No se pudo determinar la provincia del recinto.'
            );
        }

        // ==================================================
        // VALIDAR TERRITORIO DEL COORDINADOR PROVINCIAL
        // ==================================================

        if (esProvincial) {

            const {
                data: asignacionesProvincia,
                error: errorAsignaciones
            } =
                await admin
                    .from('asignaciones')
                    .select('provincia_id')
                    .eq(
                        'perfil_id',
                        solicitanteId
                    )
                    .eq(
                        'tipo_asignacion',
                        'coordinador_provincial'
                    )
                    .eq(
                        'activo',
                        true
                    );

            if (errorAsignaciones) {
                throw errorAsignaciones;
            }

            const tieneAcceso =
                (
                    asignacionesProvincia ??
                    []
                ).some(
                    asignacion =>
                        Number(
                            asignacion.provincia_id
                        ) === provinciaId
                );

            if (!tieneAcceso) {

                return responder({
                    error:
                        'No puedes asignar coordinadores a recintos de otra provincia.'
                }, 403);
            }
        }

        const {
            data: asignacionCoordinadorExistente,
            error: errorCoordinadorExistente
        } =
            await admin
                .from('asignaciones')
                .select('id')
                .eq('recinto_id', recintoId)
                .eq('tipo_asignacion', 'coordinador_recinto')
                .eq('activo', true)
                .limit(1)
                .maybeSingle();

        if (errorCoordinadorExistente) {
            throw errorCoordinadorExistente;
        }

        if (asignacionCoordinadorExistente) {
            return responder({
                error:
                    'El recinto ya tiene un coordinador activo.'
            }, 409);
        }

        // ==================================================
        // CREAR USUARIO EN SUPABASE AUTH
        // ==================================================

        etapa =
            'creación de usuario';

        const passwordInicial =
            'Ecuador2026';

        const {
            data: usuarioCreado,
            error: errorUsuario
        } =
            await admin.auth.admin.createUser({
                email:
                    emailLimpio,

                password:
                    passwordInicial,

                email_confirm:
                    true,

                user_metadata: {
                    nombres:
                        nombreLimpio,

                    apellidos:
                        apellidoLimpio,

                    cedula:
                        cedulaLimpia,

                    telefono:
                        telefonoLimpio
                }
            });

        if (
            errorUsuario ||
            !usuarioCreado.user
        ) {

            throw (
                errorUsuario ??
                new Error(
                    'No se pudo crear la cuenta.'
                )
            );
        }

        usuarioCreadoId =
            usuarioCreado.user.id;

        // ==================================================
        // ACTUALIZAR PERFIL
        // ==================================================

        etapa =
            'actualización de perfil';

        const {
            data: perfilActualizado,
            error: errorPerfil
        } =
            await admin
                .from('perfiles')
                .update({
                    nombres:
                        nombreLimpio,

                    apellidos:
                        apellidoLimpio,

                    cedula:
                        cedulaLimpia,

                    telefono:
                        telefonoLimpio ||
                        null,

                    email:
                        emailLimpio,

                    rol:
                        'coordinador_recinto',

                    activo:
                        true,

                    primer_acceso:
                        true
                })
                .eq(
                    'id',
                    usuarioCreadoId
                )
                .select('id')
                .maybeSingle();

        if (errorPerfil) {
            throw errorPerfil;
        }
        if (!perfilActualizado) {
            throw new Error(
                'La cuenta de autenticación se creó, pero no existe el perfil correspondiente.'
            );
        }

        // ==================================================
        // CREAR ASIGNACIÓN TERRITORIAL
        // ==================================================

        etapa =
            'creación de asignación territorial';

        const { error: asignacionError } = await admin
            .from("asignaciones")
            .insert({
                perfil_id: usuarioCreadoId,
                recinto_id: recintoId,
                tipo_asignacion: "coordinador_recinto",
                fecha_asignacion: new Date().toISOString(),
                activo: true
            });

        if (asignacionError) {
            if (asignacionError.code === '23505') {
                throw new DuplicateCoordinatorError(
                    'El recinto ya tiene un coordinador activo.'
                );
            }
            throw new Error(
                `Error al crear la asignación: ${asignacionError.message}`
            );
        }

        // ==================================================
        // REGISTRO COMPLETADO
        // ==================================================

        const perfilId = usuarioCreadoId;

        usuarioCreadoId = null;

        return responder({
            mensaje: 'Coordinador registrado correctamente.',
            perfil_id: perfilId,
            recinto_id: recintoId,
            primer_acceso: true,
            email_confirmado: true,
            correo_enviado: false
        }, 201);

    } catch (error) {

        // ==================================================
        // REGISTRAR ERROR
        // ==================================================

        console.error('Error al crear coordinador:', {
            etapa,
            detalle: error instanceof Error
                ? error.message
                : String(error),
            error
        });

        // ==================================================
        // LIMPIEZA SI ALGO FALLÓ
        // ==================================================

        if (usuarioCreadoId && admin) {

            const {
                error: errorEliminarAsignaciones
            } = await admin
                .from('asignaciones')
                .delete()
                .eq('perfil_id', usuarioCreadoId);

            if (errorEliminarAsignaciones) {
                console.error(
                    'Error al eliminar asignaciones incompletas:',
                    errorEliminarAsignaciones
                );
            }

            const {
                error: errorEliminarPerfil
            } = await admin
                .from('perfiles')
                .delete()
                .eq('id', usuarioCreadoId);

            if (errorEliminarPerfil) {
                console.error(
                    'Error al eliminar perfil incompleto:',
                    errorEliminarPerfil
                );
            }

            const {
                error: errorEliminarUsuario
            } = await admin.auth.admin
                .deleteUser(usuarioCreadoId);

            if (errorEliminarUsuario) {
                console.error(
                    'Error al eliminar usuario incompleto:',
                    errorEliminarUsuario
                );
            }
        }

        // ==================================================
        // RESPUESTA DEL ERROR
        // ==================================================

        const conflict =
            error instanceof DuplicateCoordinatorError;

        return responder({
            error: conflict
                ? error.message
                : 'No se pudo completar el registro del coordinador.'
        }, conflict ? 409 : 500);
    }
});