import { authenticate } from '../_shared/auth.ts';
import { ApiError, errorResponse, handleOptions, readJson, success } from '../_shared/http.ts';
import { readAll } from '../_shared/pagination.ts';
import { asCoordinate, asPositiveInteger, asText } from '../_shared/validation.ts';

interface CantonRow {
  id: number;
  nombre: string;
  provincia_id: number;
}

interface ParroquiaRow {
  id: number;
  nombre: string;
  canton_id: number;
}

interface RecintoRow {
  id: number;
  parroquia_id: number;
  nombre: string;
  direccion: string | null;
  referencia: string | null;
  latitud: number | null;
  longitud: number | null;
  capacidad_jrv: number | null;
  cne_zona: string | null;
  cne_cda: boolean | null;
  juntas_femeninas: number | null;
  juntas_masculinas: number | null;
  electores: number | null;
  dificil_acceso: boolean | null;
  sin_conectividad: boolean | null;
  activo: boolean;
}

interface JrvRow {
  id: number;
  recinto_id: number;
  numero: number;
  estado: string;
}

Deno.serve(async (request) => {
  const options = handleOptions(request);
  if (options) return options;

  try {
    if (request.method !== 'POST') {
      throw new ApiError(405, 'METHOD_NOT_ALLOWED', 'Usa POST para gestionar recintos.');
    }

    const actor = await authenticate(request, ['administrador', 'coordinador_provincial']);
    const body = await readJson(request);

    if (body.action === 'crear') {
      const { data, error } = await actor.userClient.rpc('crear_recinto_con_jrv', {
        p_parroquia_id: asPositiveInteger(body.parroquia_id, 'parroquia_id'),
        p_nombre: asText(body.nombre, 'nombre', 150),
        p_direccion:
          body.direccion === undefined || body.direccion === null ? null : asText(body.direccion, 'direccion', 1000),
        p_referencia:
          body.referencia === undefined || body.referencia === null
            ? null
            : asText(body.referencia, 'referencia', 1000),
        p_capacidad_jrv: asPositiveInteger(body.cantidad_jrv, 'cantidad_jrv'),
        p_latitud: asCoordinate(body.latitud, 'latitud', -90, 90),
        p_longitud: asCoordinate(body.longitud, 'longitud', -180, 180),
      });

      if (error) {
        if (error.code === '42501') {
          throw new ApiError(403, 'RECINTO_FORBIDDEN', error.message);
        }
        if (error.code === '22023') {
          throw new ApiError(422, 'RECINTO_VALIDATION_FAILED', error.message);
        }
        if (error.code === '23505') {
          throw new ApiError(409, 'RECINTO_CONFLICT', error.message);
        }
        throw error;
      }

      const created =
        typeof data === 'object' &&
        data !== null &&
        !Array.isArray(data) &&
        (data as Record<string, unknown>).created === true;
      return success(data, created ? 201 : 200);
    }

    if (body.action !== 'listar') {
      throw new ApiError(400, 'UNKNOWN_ACTION', 'La acción solicitada no existe.');
    }

    let provinceIds: number[] = [];
    if (actor.profile.rol === 'coordinador_provincial') {
      const { data, error } = await actor.admin
        .from('asignaciones')
        .select('provincia_id')
        .eq('perfil_id', actor.user.id)
        .eq('tipo_asignacion', 'coordinador_provincial')
        .eq('activo', true)
        .not('provincia_id', 'is', null);
      if (error) throw error;

      provinceIds = [...new Set((data ?? []).map((row) => row.provincia_id))];
      if (!provinceIds.length) {
        throw new ApiError(403, 'PROVINCE_FORBIDDEN', 'No tienes provincias asignadas.');
      }
    }

    if (body.provincia_id !== undefined && body.provincia_id !== null) {
      const requestedProvinceId = asPositiveInteger(body.provincia_id, 'provincia_id');
      if (actor.profile.rol === 'coordinador_provincial' && !provinceIds.includes(requestedProvinceId)) {
        throw new ApiError(403, 'PROVINCE_FORBIDDEN', 'No tienes acceso a esta provincia.');
      }
      provinceIds = [requestedProvinceId];
    }

    const cantones = await readAll<CantonRow>((from, to) => {
      let query = actor.admin.from('cantones').select('id, nombre, provincia_id').order('nombre');
      if (provinceIds.length) query = query.in('provincia_id', provinceIds);
      return query.range(from, to);
    });
    const cantonIds = cantones.map((canton) => canton.id);

    const parroquias = cantonIds.length
      ? await readAll<ParroquiaRow>((from, to) =>
          actor.admin
            .from('parroquias')
            .select('id, nombre, canton_id')
            .in('canton_id', cantonIds)
            .order('nombre')
            .range(from, to),
        )
      : [];
    const parroquiaIds = parroquias.map((parroquia) => parroquia.id);

    const recintos = parroquiaIds.length
      ? await readAll<RecintoRow>((from, to) =>
          actor.admin
            .from('recintos')
            .select(
              'id, parroquia_id, nombre, direccion, referencia, latitud, longitud, capacidad_jrv, cne_zona, cne_cda, juntas_femeninas, juntas_masculinas, electores, dificil_acceso, sin_conectividad, activo',
            )
            .in('parroquia_id', parroquiaIds)
            .eq('activo', true)
            .order('nombre')
            .range(from, to),
        )
      : [];
    const recintoIds = recintos.map((recinto) => recinto.id);
    const jrvs = recintoIds.length
      ? await readAll<JrvRow>((from, to) =>
          actor.admin
            .from('jrv')
            .select('id, recinto_id, numero, estado')
            .in('recinto_id', recintoIds)
            .order('numero')
            .range(from, to),
        )
      : [];

    const cantonesById = new Map(cantones.map((canton) => [canton.id, canton]));
    const parroquiasById = new Map(parroquias.map((parroquia) => [parroquia.id, parroquia]));
    const jrvsByRecinto = new Map<number, JrvRow[]>();
    for (const jrv of jrvs) {
      const current = jrvsByRecinto.get(jrv.recinto_id) ?? [];
      current.push(jrv);
      jrvsByRecinto.set(jrv.recinto_id, current);
    }

    return success(
      recintos.map((recinto) => {
        const parroquia = parroquiasById.get(recinto.parroquia_id);
        const canton = parroquia ? cantonesById.get(parroquia.canton_id) : undefined;
        const provinceId = canton?.provincia_id;
        return {
          ...recinto,
          parroquia: parroquia ?? null,
          canton: canton ?? null,
          provincia_id: provinceId ?? null,
          jrvs: jrvsByRecinto.get(recinto.id) ?? [],
        };
      }),
    );
  } catch (error) {
    return errorResponse(error);
  }
});
