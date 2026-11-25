import type { SupabaseClient } from 'npm:@supabase/supabase-js@2';
import type { AuthenticatedActor } from './auth.ts';
import { assertJrvAccess } from './auth.ts';
import { ApiError } from './http.ts';
import type { ActaInput } from './validation.ts';

const rpcMessages: Record<string, { status: number; code: string }> = {
  '22023': { status: 422, code: 'ACTA_VALIDATION_FAILED' },
  '23505': { status: 409, code: 'ACTA_ALREADY_EXISTS' },
  '40001': { status: 409, code: 'ACTA_CONFLICT' },
  '42501': { status: 403, code: 'ACTA_FORBIDDEN' },
  '55000': { status: 409, code: 'ACTA_NOT_EDITABLE' },
  P0002: { status: 404, code: 'ACTA_NOT_FOUND' },
};

export async function saveActa(actor: AuthenticatedActor, input: ActaInput): Promise<Record<string, unknown>> {
  if (input.acta_id === null && actor.profile.rol !== 'veedor') {
    throw new ApiError(403, 'ROLE_FORBIDDEN', 'Solo un veedor puede registrar un acta.');
  }

  if (input.acta_id !== null && actor.profile.rol === 'coordinador_provincial') {
    throw new ApiError(403, 'ROLE_FORBIDDEN', 'El coordinador provincial no puede corregir actas.');
  }

  await assertJrvAccess(actor, input.jrv_id);

  if (input.acta_id !== null && !input.expected_updated_at) {
    throw new ApiError(400, 'BASE_TIMESTAMP_REQUIRED', 'Para corregir un acta debes enviar expected_updated_at.');
  }

  if (input.acta_id === null && !input.client_id) {
    throw new ApiError(
      400,
      'CLIENT_ID_REQUIRED',
      'Para registrar o sincronizar un acta debes enviar un client_id UUID estable.',
    );
  }

  const { data, error } = await actor.userClient.rpc('guardar_acta_electoral', {
    p_acta_id: input.acta_id,
    p_jrv_id: input.jrv_id,
    p_dignidad: input.dignidad,
    p_votos: input.votos,
    p_total_votos_blancos: input.total_votos_blancos,
    p_total_votos_nulos: input.total_votos_nulos,
    p_total_votantes: input.total_votantes,
    p_client_id: input.client_id,
    p_expected_updated_at: input.expected_updated_at,
    p_latitud: input.latitud,
    p_longitud: input.longitud,
    p_fotografia_path: input.fotografia_path,
    p_observaciones: input.observaciones,
  });

  if (error) {
    const mapped = rpcMessages[error.code ?? ''];
    if (mapped) {
      throw new ApiError(mapped.status, mapped.code, error.message);
    }
    throw error;
  }

  if (typeof data !== 'object' || data === null || Array.isArray(data)) {
    throw new ApiError(502, 'INVALID_DATABASE_RESPONSE', 'La base de datos devolvió una respuesta inesperada.');
  }

  return data as Record<string, unknown>;
}

export async function signPhoto(admin: SupabaseClient, path: unknown): Promise<string | null> {
  if (typeof path !== 'string' || path.length === 0) return null;

  const { data, error } = await admin.storage.from('actas-electorales').createSignedUrl(path, 300);

  if (error) {
    throw new ApiError(502, 'PHOTO_URL_FAILED', 'No se pudo generar un enlace temporal para la fotografía.');
  }

  return data.signedUrl;
}
