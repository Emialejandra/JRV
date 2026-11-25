import { createPublicClient, requiredAppUrl } from '../_shared/supabase.ts';
import { ApiError, errorResponse, handleOptions, readJson, success } from '../_shared/http.ts';
import { asEmail } from '../_shared/validation.ts';

Deno.serve(async (request) => {
  const options = handleOptions(request);
  if (options) return options;

  try {
    if (request.method !== 'POST') {
      throw new ApiError(405, 'METHOD_NOT_ALLOWED', 'Usa POST para recuperar la contraseña.');
    }

    const body = await readJson(request);
    const email = asEmail(body.email);
    const { error } = await createPublicClient().auth.resetPasswordForEmail(email, {
      redirectTo: `${requiredAppUrl()}/cambio-password`,
    });

    if (error) {
      console.error('Error solicitando recuperación de contraseña:', error);
      throw new ApiError(502, 'PASSWORD_RECOVERY_FAILED', 'No se pudo solicitar la recuperación.');
    }

    // Mensaje indistinguible para evitar confirmar si un correo tiene cuenta.
    return success({
      message: 'Si el correo está registrado, recibirás instrucciones para recuperar tu contraseña.',
    });
  } catch (error) {
    return errorResponse(error);
  }
});
