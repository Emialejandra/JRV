import { createClient } from
    'npm:@supabase/supabase-js@2';

const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers':
        'authorization, x-client-info, apikey, content-type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS'
};

Deno.serve(async (req) => {

    if (req.method === 'OPTIONS') {
        return new Response('ok', {
            headers: corsHeaders
        });
    }

    const responder = (
        body: object,
        status = 200
    ) => new Response(
        JSON.stringify(body),
        {
            status,
            headers: {
                ...corsHeaders,
                'Content-Type': 'application/json'
            }
        }
    );

    try {

        const { cedula, password } = await req.json();

        if (
            typeof cedula !== 'string' ||
            !/^\d{10}$/.test(cedula) ||
            typeof password !== 'string' ||
            !password
        ) {
            return responder({
                error: 'Credenciales inválidas.'
            }, 400);
        }

        const url = Deno.env.get('SUPABASE_URL')!;
        const anonKey = Deno.env.get('SUPABASE_ANON_KEY')!;
        const serviceKey = Deno.env.get(
            'SUPABASE_SERVICE_ROLE_KEY'
        )!;

        // Cliente administrativo: solo funciona en el servidor.
        const admin = createClient(
            url,
            serviceKey,
            {
                auth: {
                    persistSession: false,
                    autoRefreshToken: false
                }
            }
        );

        // Cliente público para autenticar al usuario.
        const authClient = createClient(
            url,
            anonKey,
            {
                auth: {
                    persistSession: false,
                    autoRefreshToken: false
                }
            }
        );

        // Buscar el perfil por cédula.
        const { data: perfil, error: errorPerfil } =
            await admin
                .from('perfiles')
                .select('id, activo')
                .eq('cedula', cedula)
                .maybeSingle();

        if (
            errorPerfil ||
            !perfil ||
            !perfil.activo
        ) {
            return responder({
                error: 'Credenciales inválidas.'
            }, 401);
        }

        // Obtener el correo asociado al usuario de Auth.
        const { data: usuario, error: errorUsuario } =
            await admin.auth.admin.getUserById(
                perfil.id
            );

        const email = usuario.user?.email;

        if (errorUsuario || !email) {
            return responder({
                error: 'No se pudo validar el usuario.'
            }, 401);
        }

        // Validar la contraseña con Supabase Auth.
        const { data, error } =
            await authClient.auth.signInWithPassword({
                email,
                password
            });

        if (error || !data.session) {
            return responder({
                error: 'Credenciales inválidas.'
            }, 401);
        }

        return responder({
            session: {
                access_token: data.session.access_token,
                refresh_token: data.session.refresh_token
            }
        });

    } catch (error) {

        console.error('Error de autenticación:', error);

        return responder({
            error: 'No fue posible iniciar sesión.'
        }, 500);

    }

});