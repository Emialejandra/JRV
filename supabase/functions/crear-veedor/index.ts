
import type { SupabaseClient } from 'npm:@supabase/supabase-js@2';
import { assertJrvAccess, authenticate } from '../_shared/auth.ts';
import {
  ApiError,
  errorResponse,
  handleOptions,
  readJson,
  success,
} from '../_shared/http.ts';
import {
  asEmail,
  asPhone,
  asText,
  asPositiveInteger,
  validateEcuadorianId,
} from '../_shared/validation.ts';

const initialPassword = 'Ecuador2026';

Deno.serve(async (request) => {
  const options = handleOptions(request);
  if (options) return options;

  let admin: SupabaseClient | null = null;
  let createdUserId: string | null = null;

  try {
    if (request.method !== 'POST') {
      throw new ApiError(
        405,
        'METHOD_NOT_ALLOWED',
        'Usa POST para registrar veedores.',
      );
    }

    // 1. Verificar que el usuario sea coordinador de recinto.
    const actor = await authenticate(request, ['coordinador_recinto']);
    admin = actor.admin;

    const body = await readJson(request);

    // 2. Validar los datos recibidos.
    const nombres = asText(body.nombres, 'Nombres', 100);
    const apellidos = asText(body.apellidos, 'Apellidos', 100);
    const cedula = validateEcuadorianId(body.cedula);
    const email = asEmail(body.email);
    const telefono = asPhone(body.telefono);
    const jrvId = asPositiveInteger(body.jrv_id, 'jrv_id');

    // 3. Verificar que la JRV pertenezca al coordinador.
    await assertJrvAccess(actor, jrvId);

    // 4. Comprobar que la cédula no esté registrada.
    const { data: existingProfile, error: existingProfileError } =
      await admin
        .from('perfiles')
        .select('id')
        .eq('cedula', cedula)
        .maybeSingle();

    if (existingProfileError) throw existingProfileError;

    if (existingProfile) {
      throw new ApiError(
        409,
        'CEDULA_ALREADY_REGISTERED',
        'Ya existe una cuenta registrada con esa cédula.',
      );
    }

    // 5. Crear la cuenta en Supabase Auth.
    const { data: createdUser, error: createUserError } =
      await admin.auth.admin.createUser({
        email,
        password: initialPassword,
        email_confirm: true,
        user_metadata: {
          nombres,
          apellidos,
          cedula,
          telefono,
        },
      });

    if (createUserError) {
      if (createUserError.code === 'email_exists') {
        throw new ApiError(
          409,
          'EMAIL_ALREADY_REGISTERED',
          'Ya existe una cuenta registrada con ese correo.',
        );
      }

      throw createUserError;
    }

    if (!createdUser.user) {
      throw new ApiError(
        502,
        'ACCOUNT_CREATION_FAILED',
        'No se pudo crear la cuenta.',
      );
    }

    createdUserId = createdUser.user.id;

    // 6. Actualizar el perfil del nuevo veedor.
    const { data: updatedProfile, error: profileError } =
      await admin
        .from('perfiles')
        .update({
          nombres,
          apellidos,
          cedula,
          email,
          telefono,
          rol: 'veedor',
          activo: true,
          primer_acceso: true,
        })
        .eq('id', createdUserId)
        .select('id')
        .maybeSingle();

    if (profileError) throw profileError;

    if (!updatedProfile) {
      throw new ApiError(
        500,
        'PROFILE_CREATION_FAILED',
        'No se pudo completar el perfil del veedor.',
      );
    }

    // 7. Verificar que la JRV exista.
    const { data: jrv, error: jrvError } = await admin
      .from('jrv')
      .select('id')
      .eq('id', jrvId)
      .single();

    if (jrvError) throw jrvError;

    if (!jrv) {
      throw new ApiError(
        404,
        'JRV_NOT_FOUND',
        'La JRV no existe.',
      );
    }

    // 8. Asignar el veedor a la JRV.
    const { error: assignmentError } = await admin
      .from('asignaciones')
      .insert({
        perfil_id: createdUserId,
        provincia_id: null,
        recinto_id: null,
        jrv_id: jrvId,
        tipo_asignacion: 'veedor',
        fecha_asignacion: new Date().toISOString(),
        activo: true,
      });

    if (assignmentError) throw assignmentError;

    // 9. Responder que el registro fue exitoso.
    // No se genera ningún enlace ni se envía ningún correo.
    createdUserId = null;

    return success(
      {
        perfil_id: createdUser.user.id,
        jrv_id: jrvId,
        rol: 'veedor',
        primer_acceso: true,
        registrado: true,
      },
      201,
    );

  } catch (error) {
    // 10. Limpiar los registros si ocurrió un error.
    if (createdUserId && admin) {
      const { error: assignmentCleanupError } = await admin
        .from('asignaciones')
        .delete()
        .eq('perfil_id', createdUserId)
        .eq('tipo_asignacion', 'veedor');

      if (assignmentCleanupError) {
        console.error(
          'No se pudo limpiar la asignación del veedor:',
          assignmentCleanupError,
        );
      }

      const { error: profileCleanupError } = await admin
        .from('perfiles')
        .delete()
        .eq('id', createdUserId);

      if (profileCleanupError) {
        console.error(
          'No se pudo limpiar el perfil del veedor:',
          profileCleanupError,
        );
      }

      const { error: userCleanupError } =
        await admin.auth.admin.deleteUser(createdUserId);

      if (userCleanupError) {
        console.error(
          'No se pudo limpiar el usuario del veedor:',
          userCleanupError,
        );
      }
    }

    return errorResponse(error);
  }
});
