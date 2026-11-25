import { authenticate } from '../_shared/auth.ts';
import { saveActa } from '../_shared/acta.ts';
import { ApiError, errorResponse, handleOptions, readJson, success } from '../_shared/http.ts';
import { validateActaInput } from '../_shared/validation.ts';

const MAX_BATCH_SIZE = 25;

Deno.serve(async (request) => {
  const options = handleOptions(request);
  if (options) return options;

  try {
    if (request.method !== 'POST') {
      throw new ApiError(405, 'METHOD_NOT_ALLOWED', 'Usa POST para sincronizar actas.');
    }

    const actor = await authenticate(request, ['coordinador_recinto', 'veedor']);
    const body = await readJson(request);

    if (!Array.isArray(body.registros) || body.registros.length === 0) {
      throw new ApiError(400, 'INVALID_BATCH', 'registros debe ser un arreglo no vacío.');
    }
    if (body.registros.length > MAX_BATCH_SIZE) {
      throw new ApiError(413, 'BATCH_TOO_LARGE', `El lote no puede superar ${MAX_BATCH_SIZE} registros.`);
    }

    const results = [];
    for (let index = 0; index < body.registros.length; index += 1) {
      try {
        const row = body.registros[index];
        if (typeof row !== 'object' || row === null || Array.isArray(row)) {
          throw new ApiError(400, 'INVALID_RECORD', 'El registro debe ser un objeto.');
        }

        const input = validateActaInput(row as Record<string, unknown>);
        const saved = await saveActa(actor, input);
        results.push({
          index,
          client_id: input.client_id,
          success: true,
          data: saved,
        });
      } catch (error) {
        if (error instanceof ApiError) {
          results.push({
            index,
            success: false,
            error: { code: error.code, message: error.message },
          });
        } else {
          console.error(`Error sincronizando acta ${index}:`, error);
          results.push({
            index,
            success: false,
            error: {
              code: 'SYNC_FAILED',
              message: 'No se pudo sincronizar este registro.',
            },
          });
        }
      }
    }

    return success({
      results,
      total: results.length,
      sincronizados: results.filter((result) => result.success).length,
      fallidos: results.filter((result) => !result.success).length,
    });
  } catch (error) {
    return errorResponse(error);
  }
});
