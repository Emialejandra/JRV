import { authenticate } from '../_shared/auth.ts';
import { ApiError, errorResponse, handleOptions, readJson, success } from '../_shared/http.ts';

Deno.serve(async (request) => {
  const options = handleOptions(request);
  if (options) return options;

  try {
    if (request.method !== 'POST') {
      throw new ApiError(405, 'METHOD_NOT_ALLOWED', 'Usa POST para cambiar la contraseña.');
    }

    const actor = await authenticate(request);
    const body = await readJson(request);
    const password = body.nuevaPassword;

    if (typeof password !== 'string' || password.length < 8 || password.length > 128) {
      throw new ApiError(422, 'INVALID_PASSWORD', 'La contraseña debe tener entre 8 y 128 caracteres.');
    }
    if (password === 'Ecuador2026') {
      throw new ApiError(
        422,
        'DEFAULT_PASSWORD_NOT_ALLOWED',
        'Debes establecer una contraseña distinta a la contraseña inicial.',
      );
    }

    const { error: passwordError } = await actor.admin.auth.admin.updateUserById(actor.user.id, { password });
    if (passwordError) throw passwordError;

    const { error: profileError } = await actor.admin
      .from('perfiles')
      .update({ primer_acceso: false })
      .eq('id', actor.user.id);

    if (profileError) {
      console.error('La contraseña se actualizó, pero no se pudo marcar primer_acceso como completado.', profileError);
      throw new ApiError(
        500,
        'FIRST_ACCESS_UPDATE_FAILED',
        'La contraseña se actualizó, pero no se pudo completar el estado del primer acceso.',
      );
    }

    return success({ primer_acceso: false });
  } catch (error) {
    return errorResponse(error);
  }
});
