import { createAdminClient, createPublicClient } from '../_shared/supabase.ts';
import { ApiError, errorResponse, handleOptions, readJson, success } from '../_shared/http.ts';
import { validateEcuadorianId } from '../_shared/validation.ts';

Deno.serve(async (request) => {
  const options = handleOptions(request);
  if (options) return options;

  try {
    if (request.method !== 'POST') {
      throw new ApiError(405, 'METHOD_NOT_ALLOWED', 'Usa POST para iniciar sesión.');
    }

    const body = await readJson(request);
    const cedula = validateEcuadorianId(body.cedula);
    if (typeof body.password !== 'string' || body.password.length === 0 || body.password.length > 128) {
      throw new ApiError(400, 'INVALID_CREDENTIALS', 'Las credenciales no son válidas.');
    }

    const admin = createAdminClient();
    const authClient = createPublicClient();
    const { data: profile, error: profileError } = await admin
      .from('perfiles')
      .select('id, activo, primer_acceso, rol')
      .eq('cedula', cedula)
      .maybeSingle();

    if (profileError) throw profileError;
    if (!profile || profile.activo !== true) {
      throw new ApiError(401, 'INVALID_CREDENTIALS', 'Las credenciales no son válidas.');
    }

    const { data: authUser, error: authUserError } = await admin.auth.admin.getUserById(profile.id);
    if (authUserError || !authUser.user?.email) {
      throw new ApiError(401, 'INVALID_CREDENTIALS', 'Las credenciales no son válidas.');
    }

    if (!authUser.user.email_confirmed_at) {
      throw new ApiError(403, 'EMAIL_UNCONFIRMED', 'Confirma tu correo electrónico antes de iniciar sesión.');
    }

    const { data, error } = await authClient.auth.signInWithPassword({
      email: authUser.user.email,
      password: body.password,
    });

    if (error || !data.session) {
      throw new ApiError(401, 'INVALID_CREDENTIALS', 'Las credenciales no son válidas.');
    }

    return success({
      session: {
        access_token: data.session.access_token,
        refresh_token: data.session.refresh_token,
      },
      primer_acceso: profile.primer_acceso === true,
      rol: profile.rol,
    });
  } catch (error) {
    return errorResponse(error);
  }
});
