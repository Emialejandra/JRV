import { assertJrvAccess, assertRecintoAccess, authenticate } from '../_shared/auth.ts';
import { ApiError, errorResponse, handleOptions, readJson, success } from '../_shared/http.ts';
import { asPositiveInteger } from '../_shared/validation.ts';

Deno.serve(async (request) => {
  const options = handleOptions(request);
  if (options) return options;

  try {
    if (request.method !== 'POST') {
      throw new ApiError(405, 'METHOD_NOT_ALLOWED', 'Usa POST para gestionar asignaciones.');
    }

    const actor = await authenticate(request, ['administrador', 'coordinador_recinto', 'veedor']);
    const body = await readJson(request);

    if (body.action === 'asignar_veedor') {
      if (actor.profile.rol !== 'administrador' && actor.profile.rol !== 'coordinador_recinto') {
        throw new ApiError(403, 'ROLE_FORBIDDEN', 'No puedes asignar veedores.');
      }

      const jrvId = asPositiveInteger(body.jrv_id, 'jrv_id');
      let veedorId: string;
      if (actor.profile.rol === 'coordinador_recinto') {
        const assignmentId = asPositiveInteger(body.asignacion_id, 'asignacion_id');
        const { data: currentAssignment, error: currentAssignmentError } = await actor.admin
          .from('asignaciones')
          .select('id, perfil_id, recinto_id, jrv_id')
          .eq('id', assignmentId)
          .eq('tipo_asignacion', 'veedor')
          .eq('activo', true)
          .maybeSingle();

        if (currentAssignmentError) throw currentAssignmentError;
        if (!currentAssignment) {
          throw new ApiError(404, 'ASSIGNMENT_NOT_FOUND', 'La asignación activa del veedor no existe.');
        }
        if (currentAssignment.recinto_id !== null) {
          await assertRecintoAccess(actor, currentAssignment.recinto_id);
        }
        if (currentAssignment.jrv_id === jrvId) {
          throw new ApiError(409, 'ASSIGNMENT_UNCHANGED', 'El veedor ya está asignado a esa JRV.');
        }
        veedorId = currentAssignment.perfil_id;
      } else {
        if (typeof body.veedor_id !== 'string') {
          throw new ApiError(400, 'INVALID_FIELD', 'veedor_id debe ser un UUID.');
        }
        if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(body.veedor_id)) {
          throw new ApiError(400, 'INVALID_FIELD', 'veedor_id debe ser un UUID válido.');
        }
        veedorId = body.veedor_id;
      }

      await assertJrvAccess(actor, jrvId);
      const { data, error } = await actor.userClient.rpc('asignar_veedor_jrv', {
        p_veedor_id: veedorId,
        p_jrv_id: jrvId,
      });

      if (error) {
        if (error.code === '42501') {
          throw new ApiError(403, 'ASSIGNMENT_FORBIDDEN', error.message);
        }
        if (error.code === '22023') {
          throw new ApiError(422, 'ASSIGNMENT_INVALID', error.message);
        }
        if (error.code === 'P0002') {
          throw new ApiError(404, 'JRV_NOT_FOUND', error.message);
        }
        throw error;
      }

      return success(data);
    }

    if (body.action === 'desactivar_veedor') {
      if (actor.profile.rol !== 'administrador' && actor.profile.rol !== 'coordinador_recinto') {
        throw new ApiError(403, 'ROLE_FORBIDDEN', 'No puedes desactivar asignaciones.');
      }

      const assignmentId = asPositiveInteger(body.asignacion_id, 'asignacion_id');
      const { data: assignment, error: assignmentError } = await actor.admin
        .from('asignaciones')
        .select('id, recinto_id, tipo_asignacion, activo')
        .eq('id', assignmentId)
        .eq('tipo_asignacion', 'veedor')
        .eq('activo', true)
        .maybeSingle();

      if (assignmentError) throw assignmentError;
      if (!assignment) {
        throw new ApiError(404, 'ASSIGNMENT_NOT_FOUND', 'La asignación activa no existe.');
      }
      if (assignment.recinto_id !== null) {
        await assertRecintoAccess(actor, assignment.recinto_id);
      }

      const { error } = await actor.userClient.rpc('desactivar_asignacion_veedor', { p_asignacion_id: assignmentId });
      if (error) {
        if (error.code === '42501') {
          throw new ApiError(403, 'ASSIGNMENT_FORBIDDEN', error.message);
        }
        if (error.code === 'P0002') {
          throw new ApiError(404, 'ASSIGNMENT_NOT_FOUND', error.message);
        }
        throw error;
      }

      return success({ asignacion_id: assignmentId, activo: false });
    }

    if (body.action === 'listar') {
      let recintoId: number | null = null;
      let jrvId: number | null = null;

      if (body.recinto_id !== undefined && body.recinto_id !== null) {
        recintoId = asPositiveInteger(body.recinto_id, 'recinto_id');
        await assertRecintoAccess(actor, recintoId);
      }
      if (body.jrv_id !== undefined && body.jrv_id !== null) {
        jrvId = asPositiveInteger(body.jrv_id, 'jrv_id');
        await assertJrvAccess(actor, jrvId);
      }

      let query = actor.admin
        .from('asignaciones')
        .select('id, perfil_id, jrv_id, recinto_id, tipo_asignacion, fecha_asignacion, activo')
        .eq('tipo_asignacion', 'veedor')
        .eq('activo', true)
        .order('fecha_asignacion', { ascending: false });

      if (actor.profile.rol === 'veedor') {
        query = query.eq('perfil_id', actor.user.id);
      } else {
        if (recintoId === null && jrvId === null) {
          throw new ApiError(
            400,
            'RECINTO_REQUIRED',
            'Debes especificar recinto_id o jrv_id para consultar asignaciones.',
          );
        }
        if (recintoId !== null) query = query.eq('recinto_id', recintoId);
        if (jrvId !== null) query = query.eq('jrv_id', jrvId);
      }

      const { data: assignments, error } = await query;
      if (error) throw error;

      const profileIds = [...new Set((assignments ?? []).map((assignment) => assignment.perfil_id))];
      const jrvIds = [
        ...new Set(
          (assignments ?? []).map((assignment) => assignment.jrv_id).filter((id): id is number => id !== null),
        ),
      ];
      const [profilesResult, jrvsResult] = await Promise.all([
        profileIds.length
          ? actor.admin.from('perfiles').select('id, nombres, apellidos, cedula, email, telefono').in('id', profileIds)
          : Promise.resolve({ data: [], error: null }),
        jrvIds.length
          ? actor.admin.from('jrv').select('id, numero, codigo, recinto_id, estado').in('id', jrvIds)
          : Promise.resolve({ data: [], error: null }),
      ]);

      if (profilesResult.error) throw profilesResult.error;
      if (jrvsResult.error) throw jrvsResult.error;

      const profiles = new Map((profilesResult.data ?? []).map((profile) => [profile.id, profile]));
      const jrvs = new Map((jrvsResult.data ?? []).map((jrv) => [jrv.id, jrv]));

      return success(
        (assignments ?? []).map((assignment) => ({
          ...assignment,
          veedor: profiles.get(assignment.perfil_id) ?? null,
          jrv: assignment.jrv_id ? (jrvs.get(assignment.jrv_id) ?? null) : null,
        })),
      );
    }

    throw new ApiError(400, 'UNKNOWN_ACTION', 'La acción solicitada no existe.');
  } catch (error) {
    return errorResponse(error);
  }
});
