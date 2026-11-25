import { assertJrvAccess, authenticate } from '../_shared/auth.ts';
import { saveActa, signPhoto } from '../_shared/acta.ts';
import { ApiError, errorResponse, handleOptions, readJson, success } from '../_shared/http.ts';
import { asPositiveInteger, validateActaInput, validateDignity } from '../_shared/validation.ts';

Deno.serve(async (request) => {
  const options = handleOptions(request);
  if (options) return options;

  try {
    if (request.method !== 'POST') {
      throw new ApiError(405, 'METHOD_NOT_ALLOWED', 'Usa POST para esta operación.');
    }

    const actor = await authenticate(request, [
      'administrador',
      'coordinador_provincial',
      'coordinador_recinto',
      'veedor',
    ]);
    const body = await readJson(request);
    const action = body.action;

    if (action === 'listar') {
      const jrvId = asPositiveInteger(body.jrv_id, 'jrv_id');
      const dignity = body.dignidad === undefined || body.dignidad === null ? null : validateDignity(body.dignidad);

      await assertJrvAccess(actor, jrvId);

      let query = actor.admin
        .from('actas')
        .select(
          `
          *,
          detalle_votos (
            id,
            candidatura_id,
            cantidad_votos,
            candidaturas (
              id,
              nombres,
              apellidos,
              dignidad,
              organizacion_id,
              organizaciones (id, nombre, sigla)
            )
          )
        `,
        )
        .eq('jrv_id', jrvId)
        .order('created_at', { ascending: false });

      if (dignity) query = query.eq('dignidad', dignity);

      const { data, error } = await query;
      if (error) throw error;

      const actas = await Promise.all(
        (data ?? []).map(async (acta) => ({
          ...acta,
          fotografia_url: (await signPhoto(actor.admin, acta.fotografia_url)) ?? acta.fotografia_url ?? null,
        })),
      );

      return success(actas);
    }

    if (action === 'guardar' || action === 'corregir') {
      if (typeof body.data !== 'object' || body.data === null || Array.isArray(body.data)) {
        throw new ApiError(400, 'INVALID_BODY', 'data debe ser un objeto.');
      }

      const input = validateActaInput(body.data as Record<string, unknown>);
      if (action === 'guardar' && input.acta_id !== null) {
        throw new ApiError(400, 'INVALID_ACTION', 'Usa corregir para editar un acta.');
      }
      if (action === 'corregir' && input.acta_id === null) {
        throw new ApiError(400, 'INVALID_ACTION', 'corregir requiere acta_id.');
      }

      const result = await saveActa(actor, input);
      return success(result, input.acta_id === null ? 201 : 200);
    }

    if (action === 'detalle') {
      const actaId = asPositiveInteger(body.acta_id, 'acta_id');
      const { data: acta, error: actaError } = await actor.admin
        .from('actas')
        .select(
          `
          *,
          detalle_votos (
            id,
            candidatura_id,
            cantidad_votos,
            candidaturas (
              id,
              nombres,
              apellidos,
              dignidad,
              organizacion_id,
              organizaciones (id, nombre, sigla)
            )
          )
        `,
        )
        .eq('id', actaId)
        .maybeSingle();

      if (actaError) throw actaError;
      if (!acta) throw new ApiError(404, 'ACTA_NOT_FOUND', 'El acta no existe.');

      await assertJrvAccess(actor, acta.jrv_id);

      return success({
        ...acta,
        fotografia_url: (await signPhoto(actor.admin, acta.fotografia_url)) ?? acta.fotografia_url ?? null,
      });
    }

    if (action === 'detalle_voto') {
      const voteId = asPositiveInteger(body.detalle_voto_id, 'detalle_voto_id');
      const { data: vote, error: voteError } = await actor.admin
        .from('detalle_votos')
        .select('*')
        .eq('id', voteId)
        .maybeSingle();

      if (voteError) throw voteError;
      if (!vote) throw new ApiError(404, 'VOTE_NOT_FOUND', 'El detalle de votos no existe.');

      const { data: acta, error: actaError } = await actor.admin
        .from('actas')
        .select('jrv_id')
        .eq('id', vote.acta_id)
        .maybeSingle();

      if (actaError) throw actaError;
      if (!acta) throw new ApiError(404, 'ACTA_NOT_FOUND', 'El acta no existe.');
      await assertJrvAccess(actor, acta.jrv_id);

      return success(vote);
    }

    if (action === 'historial') {
      if (actor.profile.rol !== 'administrador' && actor.profile.rol !== 'coordinador_recinto') {
        throw new ApiError(
          403,
          'ROLE_FORBIDDEN',
          'Solo administradores y coordinadores de recinto pueden consultar el historial.',
        );
      }

      const actaId = asPositiveInteger(body.acta_id, 'acta_id');
      const { data: acta, error: actaError } = await actor.admin
        .from('actas')
        .select('id, jrv_id')
        .eq('id', actaId)
        .maybeSingle();

      if (actaError) throw actaError;
      if (!acta) throw new ApiError(404, 'ACTA_NOT_FOUND', 'El acta no existe.');
      await assertJrvAccess(actor, acta.jrv_id);

      const { data, error } = await actor.admin
        .from('historial_actas')
        .select('id, actor_id, accion, antes, despues, created_at')
        .eq('acta_id', actaId)
        .order('created_at', { ascending: false });

      if (error) throw error;

      return success(data ?? []);

      throw new ApiError(400, 'UNKNOWN_ACTION', 'La acción solicitada no existe.');
    } catch (error) {
      return errorResponse(error);
    }
  });
