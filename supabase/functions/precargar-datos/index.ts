import { authenticate } from '../_shared/auth.ts';
import { ApiError, errorResponse, handleOptions, readJson, success } from '../_shared/http.ts';
import { asPositiveInteger } from '../_shared/validation.ts';

function assertArray(value: unknown, name: string): unknown[] {
  if (!Array.isArray(value)) {
    throw new ApiError(400, 'INVALID_FIELD', `${name} debe ser un arreglo.`);
  }
  return value;
}

Deno.serve(async (request) => {
  const options = handleOptions(request);
  if (options) return options;

  try {
    if (request.method !== 'POST') {
      throw new ApiError(405, 'METHOD_NOT_ALLOWED', 'Usa POST para precargar los datos.');
    }

    const actor = await authenticate(request, ['administrador']);
    const body = await readJson(request);
    const organizaciones = assertArray(body.organizaciones, 'organizaciones');
    const candidaturas = assertArray(body.candidaturas, 'candidaturas');
    const recintos = assertArray(body.recintos, 'recintos');

    if (
      organizaciones.length !== 5 ||
      candidaturas.filter(
        (candidate) =>
          typeof candidate === 'object' &&
          candidate !== null &&
          !Array.isArray(candidate) &&
          (candidate as Record<string, unknown>).dignidad === 'alcaldia',
      ).length !== 5 ||
      candidaturas.filter(
        (candidate) =>
          typeof candidate === 'object' &&
          candidate !== null &&
          !Array.isArray(candidate) &&
          (candidate as Record<string, unknown>).dignidad === 'prefectura',
      ).length !== 5 ||
      recintos.length === 0
    ) {
      throw new ApiError(
        422,
        'INVALID_SEED_COUNTS',
        'Envía cinco organizaciones, cinco candidaturas por dignidad y al menos un recinto.',
      );
    }

    const { data, error } = await actor.admin.rpc('precargar_datos_electorales', {
      p_actor_id: actor.user.id,
      p_provincia_id: asPositiveInteger(body.provincia_id, 'provincia_id'),
      p_canton_id: asPositiveInteger(body.canton_id, 'canton_id'),
      p_organizaciones: organizaciones,
      p_candidaturas: candidaturas,
      p_recintos: recintos,
    });

    if (error) {
      if (error.code === '42501') {
        throw new ApiError(403, 'SEED_FORBIDDEN', error.message);
      }
      if (error.code === '22023') {
        throw new ApiError(422, 'SEED_VALIDATION_FAILED', error.message);
      }
      throw error;
    }

    return success(data, 201);
  } catch (error) {
    return errorResponse(error);
  }
});
