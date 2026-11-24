
import { createClient } from 'npm:@supabase/supabase-js@2';

const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers':
        'authorization, x-client-info, apikey, content-type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS'
};

const responder = (body: object, status = 200) =>
    new Response(JSON.stringify(body), {
        status,
        headers: {
            ...corsHeaders,
            'Content-Type': 'application/json'
        }
    });

// Validación del dígito verificador de cédula ecuatoriana.
function validarCedula(cedula: string): boolean {

    if (!/^\d{10}$/.test(cedula)) {
        return false;
    }

    const provincia = Number(cedula.substring(0, 2));
    const tercerDigito = Number(cedula[2]);

    if (
        !((provincia >= 1 && provincia <= 24) || provincia === 30) ||
        tercerDigito > 5
    ) {
        return false;
    }

    let suma = 0;

    for (let i = 0; i < 9; i++) {

        let valor = Number(cedula[i]);

        if (i % 2 === 0) {
            valor *= 2;

            if (valor > 9) {
                valor -= 9;
            }
        }

        suma += valor;
    }

    const digitoVerificador = (10 - (suma % 10)) % 10;

    return digitoVerificador === Number(cedula[9]);
}

Deno.serve(async (req) => {

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

    let admin: ReturnType<typeof createClient> | null = null;
    let usuarioCreadoId: string | null = null;
    let etapa = 'inicialización';

    try {

        const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
        const SUPABASE_ANON_KEY = Deno.env.get('SUPABASE_ANON_KEY')!;
        const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SERVICE_ROLE_KEY')!;
        const APP_URL = Deno.env.get('APP_URL')!;

        if (
            !SUPABASE_URL ||
            !SUPABASE_ANON_KEY ||
            !SUPABASE_SERVICE_ROLE_KEY ||
            !APP_URL
        ) {
            throw new Error('Falta configurar las variables de Supabase.');
        }

        // Obtener y validar el token del solicitante.
        const authorization = req.headers.get('Authorization');

        if (!authorization?.startsWith('Bearer ')) {
            return responder({
                error: 'Sesión no proporcionada.'
            }, 401);
        }

        const token = authorization.substring(7);

        const authClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
            auth: {
                persistSession: false,
                autoRefreshToken: false
            }
        });

        const { data: authData, error: authError } =
            await authClient.auth.getUser(token);

        if (authError || !authData.user) {
            return responder({
                error: 'Sesión inválida o expirada.'
            }, 401);
        }

        const solicitanteId = authData.user.id;

        // Cliente administrativo exclusivamente del servidor.
        admin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
            auth: {
                persistSession: false,
                autoRefreshToken: false
            }
        });

        // Comprobar el perfil del solicitante.
        const { data: solicitante, error: errorSolicitante } =
            await admin
                .from('perfiles')
                .select('id, rol, activo')
                .eq('id', solicitanteId)
                .single();

        if (
            errorSolicitante ||
            !solicitante ||
            !solicitante.activo
        ) {
            return responder({
                error: 'Usuario sin permisos para esta operación.'
            }, 403);
        }

        const esAdministrador =
            solicitante.rol === 'administrador';

        const esProvincial =
            solicitante.rol === 'coordinador_provincial';

        if (!esAdministrador && !esProvincial) {
            return responder({
                error: 'No tienes permisos para crear coordinadores.'
            }, 403);
        }

        // Obtener los datos del formulario.
        const {
            nombres,
            apellidos,
            cedula,
            email,
            telefono,
            recinto_id
        } = await req.json();

        const nombreLimpio =
            typeof nombres === 'string' ? nombres.trim() : '';

        const apellidoLimpio =
            typeof apellidos === 'string' ? apellidos.trim() : '';

        const cedulaLimpia =
            typeof cedula === 'string' ? cedula.trim() : '';

        const emailLimpio =
            typeof email === 'string' ? email.trim().toLowerCase() : '';

        const telefonoLimpio =
            typeof telefono === 'string' ? telefono.trim() : '';

        const recintoId = Number(recinto_id);

        if (
            !nombreLimpio ||
            !apellidoLimpio ||
            !emailLimpio ||
            !cedulaLimpia ||
            !Number.isSafeInteger(recintoId) ||
            recintoId <= 0
        ) {
            return responder({
                error: 'Completa todos los campos obligatorios.'
            }, 400);
        }

        if (
            !validarCedula(cedulaLimpia)
        ) {
            return responder({
                error: 'La cédula ecuatoriana no es válida.'
            }, 400);
        }

        if (
            !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(emailLimpio)
        ) {
            return responder({
                error: 'El correo electrónico no es válido.'
            }, 400);
        }

        if (nombreLimpio.length > 100 ||
            apellidoLimpio.length > 100 ||
            emailLimpio.length > 254 ||
            telefonoLimpio.length > 20) {
            return responder({
                error: 'Uno de los campos supera la longitud permitida.'
            }, 400);
        }

        // Comprobar duplicidad de cédula.
        const { data: cedulaExistente, error: errorCedula } =
            await admin
                .from('perfiles')
                .select('id')
                .eq('cedula', cedulaLimpia)
                .maybeSingle();

        if (errorCedula) {
            throw errorCedula;
        }

        if (cedulaExistente) {
            return responder({
                error: 'Ya existe un usuario registrado con esa cédula.'
            }, 409);
        }

        // Comprobar que el recinto exista y esté activo.
        const { data: recinto, error: errorRecinto } =
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
                .eq('id', recintoId)
                .maybeSingle();

        if (errorRecinto) {
            throw errorRecinto;
        }

        if (!recinto || !recinto.activo) {
            return responder({
                error: 'El recinto no existe o está inactivo.'
            }, 404);
        }

        const parroquia = recinto.parroquias as any;
        const canton = parroquia?.cantones;
        const provinciaId = Number(canton?.provincia_id);

        if (!provinciaId) {
            throw new Error('No se pudo determinar la provincia del recinto.');
        }

        // Verificar que el coordinador provincial tenga acceso
        // al territorio del recinto seleccionado.
        if (esProvincial) {

            const { data: asignacionesProvincia, error: errorAsignaciones } =
                await admin
                    .from('asignaciones')
                    .select('provincia_id')
                    .eq('perfil_id', solicitanteId)
                    .eq('tipo_asignacion', 'coordinador_provincial')
                    .eq('activo', true);

            if (errorAsignaciones) {
                throw errorAsignaciones;
            }

            const tieneAcceso = (asignacionesProvincia ?? []).some(
                asignacion =>
                    Number(asignacion.provincia_id) === provinciaId
            );

            if (!tieneAcceso) {
                return responder({
                    error: 'No puedes asignar coordinadores a recintos de otra provincia.'
                }, 403);
            }
        }

        // Crear la cuenta y enviar invitación por correo.
        // El trigger crear_perfil_usuario() crea el perfil inicial.
        const { data: invitacion, error: errorInvitacion } =
            await admin.auth.admin.inviteUserByEmail(
                emailLimpio,
                {
                    data: {
                        nombres: nombreLimpio,
                        apellidos: apellidoLimpio,
                        cedula: cedulaLimpia,
                        telefono: telefonoLimpio
                    },
                    redirectTo: `${APP_URL}/cambio-password`
                }
            );

        if (errorInvitacion || !invitacion.user) {
            throw errorInvitacion ?? new Error(
                'No se pudo crear la cuenta.'
            );
        }

        usuarioCreadoId = invitacion.user.id;

        // El trigger crea el perfil con rol inicial veedor.
        // Aquí se asigna el rol correcto desde el servidor.
        const { error: errorPerfil } =
            await admin
                .from('perfiles')
                .update({
                    nombres: nombreLimpio,
                    apellidos: apellidoLimpio,
                    cedula: cedulaLimpia,
                    telefono: telefonoLimpio || null,
                    email: emailLimpio,
                    rol: 'coordinador_recinto',
                    activo: true,
                    primer_acceso: true
                })
                .eq('id', usuarioCreadoId);

        if (errorPerfil) {
            throw errorPerfil;
        }

        // Crear la asignación territorial.
        const { error: errorAsignacion } =
            await admin
                .from('asignaciones')
                .insert({
                    perfil_id: usuarioCreadoId,
                    provincia_id: provinciaId,
                    recinto_id: recintoId,
                    tipo_asignacion: 'coordinador_recinto',
                    fecha_asignacion: new Date().toISOString(),
                    activo: true
                });

        if (errorAsignacion) {
            throw errorAsignacion;
        }

        usuarioCreadoId = null;

        return responder({
            mensaje: 'Coordinador registrado correctamente. Se ha enviado una invitación a su correo.',
            perfil_id: invitacion.user.id,
            recinto_id: recintoId
        }, 201);

    } catch (error) {

    const detalle = error instanceof Error
        ? error.message
        : String(error);

    console.error('Error al crear coordinador:', {
        etapa,
        detalle,
        error
    });

    // Limpieza si la creación quedó incompleta.
    if (usuarioCreadoId && admin) {

        const { error: errorEliminarPerfil } = await admin
            .from('perfiles')
            .delete()
            .eq('id', usuarioCreadoId);

        if (errorEliminarPerfil) {
            console.error(
                'Error al eliminar perfil incompleto:',
                errorEliminarPerfil
            );
        }

        const { error: errorEliminarUsuario } =
            await admin.auth.admin.deleteUser(usuarioCreadoId);

        if (errorEliminarUsuario) {
            console.error(
                'Error al eliminar usuario incompleto:',
                errorEliminarUsuario
            );
        }
    }

    return responder({
        error: 'No se pudo completar el registro del coordinador.',
        etapa,
        detalle
    }, 500);
    }
});
