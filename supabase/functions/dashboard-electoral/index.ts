import { assertRecintoAccess, authenticate } from '../_shared/auth.ts';
import { ApiError, errorResponse, handleOptions, readJson, success } from '../_shared/http.ts';
import { readAll } from '../_shared/pagination.ts';
import { asPositiveInteger } from '../_shared/validation.ts';

interface RecintoRow {
  id: number;
  nombre: string;
  parroquia_id: number;
}

interface JrvRow {
  id: number;
  recinto_id: number;
  numero: number;
  estado: string;
}

interface ActaRow {
  id: number;
  jrv_id: number;
  dignidad: 'alcaldia' | 'prefectura' | null;
  estado: string;
  latitud: number | null;
  longitud: number | null;
  total_votos_validos: number;
  total_votos_blancos: number;
  total_votos_nulos: number;
  total_votantes: number;
  fecha_registro: string;
  updated_at: string | null;
}

interface DetalleVotoRow {
  acta_id: number;
  candidatura_id: number;
  cantidad_votos: number;
}

interface CandidaturaRow {
  id: number;
  nombres: string;
  apellidos: string;
  organizacion_id: number;
}

interface OrganizacionRow {
  id: number;
  nombre: string;
  sigla: string | null;
}

function sumVotes(
  details: DetalleVotoRow[],
  candidaturas: Map<number, CandidaturaRow>,
  organizaciones: Map<number, OrganizacionRow>,
  actasById: Map<number, ActaRow>,
  dignidad: 'alcaldia' | 'prefectura',
  allowedJrvIds: Set<number>,
) {
  const candidates = new Map<number, number>();
  const organizations = new Map<number, number>();

  for (const detail of details) {
    const acta = actasById.get(detail.acta_id);
    const candidatura = candidaturas.get(detail.candidatura_id);
    if (!acta || acta.dignidad !== dignidad || !allowedJrvIds.has(acta.jrv_id) || !candidatura) {
      continue;
    }

    candidates.set(candidatura.id, (candidates.get(candidatura.id) ?? 0) + detail.cantidad_votos);
    organizations.set(
      candidatura.organizacion_id,
      (organizations.get(candidatura.organizacion_id) ?? 0) + detail.cantidad_votos,
    );
  }

  return {
    candidatos: [...candidates.entries()].map(([id, votos]) => {
      const candidate = candidaturas.get(id)!;
      const organization = organizaciones.get(candidate.organizacion_id);
      return {
        candidatura_id: id,
        nombres: candidate.nombres,
        apellidos: candidate.apellidos,
        organizacion: organization?.nombre ?? null,
        sigla: organization?.sigla ?? null,
        votos,
      };
    }),
    organizaciones: [...organizations.entries()].map(([id, votos]) => ({
      organizacion_id: id,
      nombre: organizaciones.get(id)?.nombre ?? null,
      sigla: organizaciones.get(id)?.sigla ?? null,
      votos,
    })),
  };
}

Deno.serve(async (request) => {
  const options = handleOptions(request);
  if (options) return options;

  try {
    if (request.method !== 'POST') {
      throw new ApiError(405, 'METHOD_NOT_ALLOWED', 'Usa POST para consultar el dashboard.');
    }

    const actor = await authenticate(request, ['administrador', 'coordinador_provincial', 'coordinador_recinto']);
    const body = await readJson(request);
    const requestedRecintoId =
      body.recinto_id === undefined || body.recinto_id === null
        ? null
        : asPositiveInteger(body.recinto_id, 'recinto_id');
    const requestedProvinciaId =
      body.provincia_id === undefined || body.provincia_id === null
        ? null
        : asPositiveInteger(body.provincia_id, 'provincia_id');

    let provinceIds: number[] = [];
    let recintoIds: number[] = [];

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
      if (requestedProvinciaId && !provinceIds.includes(requestedProvinciaId)) {
        throw new ApiError(403, 'PROVINCE_FORBIDDEN', 'No tienes acceso a esta provincia.');
      }
      if (!provinceIds.length) {
        throw new ApiError(403, 'PROVINCE_FORBIDDEN', 'No tienes provincias asignadas.');
      }
    } else if (actor.profile.rol === 'coordinador_recinto') {
      const { data, error } = await actor.admin
        .from('asignaciones')
        .select('recinto_id')
        .eq('perfil_id', actor.user.id)
        .eq('tipo_asignacion', 'coordinador_recinto')
        .eq('activo', true)
        .not('recinto_id', 'is', null);
      if (error) throw error;

      recintoIds = [...new Set((data ?? []).map((row) => row.recinto_id))];
      if (!recintoIds.length) {
        throw new ApiError(403, 'RECINTO_FORBIDDEN', 'No tienes recintos asignados.');
      }
    } else if (requestedProvinciaId) {
      provinceIds = [requestedProvinciaId];
    }

    if (requestedRecintoId !== null) {
      await assertRecintoAccess(actor, requestedRecintoId);
      recintoIds = [requestedRecintoId];
    }

    if (provinceIds.length && recintoIds.length === 0) {
      const cantones = await readAll<{ id: number }>((from, to) =>
        actor.admin.from('cantones').select('id').in('provincia_id', provinceIds).range(from, to),
      );
      const cantonIds = cantones.map((canton) => canton.id);

      if (cantonIds.length) {
        const parroquias = await readAll<{ id: number }>((from, to) =>
          actor.admin.from('parroquias').select('id').in('canton_id', cantonIds).range(from, to),
        );
        const parroquiaIds = parroquias.map((parroquia) => parroquia.id);

        if (parroquiaIds.length) {
          const recintos = await readAll<RecintoRow>((from, to) =>
            actor.admin
              .from('recintos')
              .select('id, nombre, parroquia_id')
              .in('parroquia_id', parroquiaIds)
              .eq('activo', true)
              .range(from, to),
          );
          recintoIds = recintos.map((recinto) => recinto.id);
        }
      }
    }

    if (actor.profile.rol === 'administrador' && !requestedProvinciaId && !requestedRecintoId) {
      const recintos = await readAll<RecintoRow>((from, to) =>
        actor.admin.from('recintos').select('id, nombre, parroquia_id').eq('activo', true).range(from, to),
      );
      recintoIds = recintos.map((recinto) => recinto.id);
    }

    if (!recintoIds.length) {
      return success({
        resumen: { recintos: 0, jrv_total: 0, actas: 0 },
        recintos: [],
        votos_consolidados: {
          alcaldia: { candidatos: [], organizaciones: [] },
          prefectura: { candidatos: [], organizaciones: [] },
        },
      });
    }

    const recintos = await readAll<RecintoRow>((from, to) =>
      actor.admin.from('recintos').select('id, nombre, parroquia_id').in('id', recintoIds).range(from, to),
    );
    const jrvs = await readAll<JrvRow>((from, to) =>
      actor.admin
        .from('jrv')
        .select('id, recinto_id, numero, estado')
        .in('recinto_id', recintoIds)
        .order('numero')
        .range(from, to),
    );
    const jrvIds = jrvs.map((jrv) => jrv.id);
    const actas = jrvIds.length
      ? await readAll<ActaRow>((from, to) =>
          actor.admin
            .from('actas')
            .select(
              `
              id, jrv_id, dignidad, estado, latitud, longitud,
              total_votos_validos, total_votos_blancos, total_votos_nulos,
              total_votantes, fecha_registro, updated_at
            `,
            )
            .in('jrv_id', jrvIds)
            .range(from, to),
        )
      : [];
    const actaIds = actas.map((acta) => acta.id);
    const details = actaIds.length
      ? await readAll<DetalleVotoRow>((from, to) =>
          actor.admin
            .from('detalle_votos')
            .select('acta_id, candidatura_id, cantidad_votos')
            .in('acta_id', actaIds)
            .range(from, to),
        )
      : [];
    const candidateIds = [...new Set(details.map((detail) => detail.candidatura_id))];
    const candidates = candidateIds.length
      ? await readAll<CandidaturaRow>((from, to) =>
          actor.admin
            .from('candidaturas')
            .select('id, nombres, apellidos, organizacion_id')
            .in('id', candidateIds)
            .range(from, to),
        )
      : [];
    const organizationIds = [...new Set(candidates.map((candidate) => candidate.organizacion_id))];
    const organizations = organizationIds.length
      ? await readAll<OrganizacionRow>((from, to) =>
          actor.admin.from('organizaciones').select('id, nombre, sigla').in('id', organizationIds).range(from, to),
        )
      : [];

    const actasByJrv = new Map<number, ActaRow[]>();
    for (const acta of actas) {
      const list = actasByJrv.get(acta.jrv_id) ?? [];
      list.push(acta);
      actasByJrv.set(acta.jrv_id, list);
    }

    const actasById = new Map(actas.map((acta) => [acta.id, acta]));
    const candidaturasById = new Map(candidates.map((candidate) => [candidate.id, candidate]));
    const organizacionesById = new Map(organizations.map((organization) => [organization.id, organization]));

    const recintoSummaries = recintos.map((recinto) => {
      const recintoJrvs = jrvs.filter((jrv) => jrv.recinto_id === recinto.id);
      const allowedJrvIds = new Set(recintoJrvs.map((jrv) => jrv.id));

      return {
        id: recinto.id,
        nombre: recinto.nombre,
        jrv_total: recintoJrvs.length,
        jrvs: recintoJrvs.map((jrv) => {
          const jrvActas = actasByJrv.get(jrv.id) ?? [];
          return {
            id: jrv.id,
            numero: jrv.numero,
            estado: jrv.estado,
            actas: {
              alcaldia: jrvActas.find((acta) => acta.dignidad === 'alcaldia') ?? null,
              prefectura: jrvActas.find((acta) => acta.dignidad === 'prefectura') ?? null,
            },
          };
        }),
        votos: {
          alcaldia: sumVotes(details, candidaturasById, organizacionesById, actasById, 'alcaldia', allowedJrvIds),
          prefectura: sumVotes(details, candidaturasById, organizacionesById, actasById, 'prefectura', allowedJrvIds),
        },
      };
    });

    const allJrvIds = new Set(jrvIds);
    const completedByDignity = (dignity: 'alcaldia' | 'prefectura') =>
      actas.filter((acta) => acta.dignidad === dignity && allJrvIds.has(acta.jrv_id)).length;

    return success({
      filtros: {
        provincias: provinceIds,
        recinto_id: requestedRecintoId,
      },
      resumen: {
        recintos: recintoSummaries.length,
        jrv_total: jrvs.length,
        actas: actas.length,
        actas_alcaldia: completedByDignity('alcaldia'),
        actas_prefectura: completedByDignity('prefectura'),
        actas_con_gps: actas.filter((acta) => acta.latitud !== null && acta.longitud !== null).length,
      },
      recintos: recintoSummaries,
      votos_consolidados: {
        alcaldia: sumVotes(details, candidaturasById, organizacionesById, actasById, 'alcaldia', allJrvIds),
        prefectura: sumVotes(details, candidaturasById, organizacionesById, actasById, 'prefectura', allJrvIds),
      },
    });
  } catch (error) {
    return errorResponse(error);
  }
});
