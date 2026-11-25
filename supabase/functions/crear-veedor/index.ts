import type { SupabaseClient } from 'npm:@supabase/supabase-js@2';
import { assertJrvAccess, authenticate } from '../_shared/auth.ts';
import { ApiError, errorResponse, handleOptions, readJson, success } from '../_shared/http.ts';
import { asEmail, asPhone, asText, asPositiveInteger, validateEcuadorianId } from '../_shared/validation.ts';
import { requiredAppUrl, requiredResendApiKey } from '../_shared/supabase.ts';

const initialPassword = 'Ecuador2026';

function escapeHtml(value: string): string {
  return value.replace(/[&<>"']/g, (character) => {
    const entities: Record<string, string> = {
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      '"': '&quot;',
      "'": '&#39;',
    };
    return entities[character];
  });
}

Deno.serve(async (request) => {
  const options = handleOptions(request);
  if (options) return options;

  let admin: SupabaseClient | null = null;
  let createdUserId: string | null = null;

  try {
    if (request.method !== 'POST') {
      throw new ApiError(405, 'METHOD_NOT_ALLOWED', 'Usa POST para registrar veedores.');
    }

    const actor = await authenticate(request, ['coordinador_recinto']);
    admin = actor.admin;
    const body = await readJson(request);
    const nombres = asText(body.nombres, 'Nombres', 100);
    const apellidos = asText(body.apellidos, 'Apellidos', 100);
    const cedula = validateEcuadorianId(body.cedula);
    const email = asEmail(body.email);
    const telefono = asPhone(body.telefono);
    const jrvId = asPositiveInteger(body.jrv_id, 'jrv_id');

    await assertJrvAccess(actor, jrvId);

    const { data: existingProfile, error: existingProfileError } = await admin
      .from('perfiles')
      .select('id')
      .eq('cedula', cedula)
      .maybeSingle();

    if (existingProfileError) throw existingProfileError;
    if (existingProfile) {
      throw new ApiError(409, 'CEDULA_ALREADY_REGISTERED', 'Ya existe una cuenta registrada con esa cédula.');
    }

    const { data: createdUser, error: createUserError } = await admin.auth.admin.createUser({
      email,
      password: initialPassword,
      email_confirm: false,
      user_metadata: { nombres, apellidos, cedula, telefono },
    });

    if (createUserError) {
      if (createUserError.code === 'email_exists') {
        throw new ApiError(409, 'EMAIL_ALREADY_REGISTERED', 'Ya existe una cuenta registrada con ese correo.');
      }
      throw createUserError;
    }
    if (!createdUser.user) {
      throw new ApiError(502, 'ACCOUNT_CREATION_FAILED', 'No se pudo crear la cuenta.');
    }

    createdUserId = createdUser.user.id;

    const { data: updatedProfile, error: profileError } = await admin
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
      throw new ApiError(500, 'PROFILE_CREATION_FAILED', 'No se pudo completar el perfil del veedor.');
    }

    const { data: jrv, error: jrvError } = await admin.from('jrv').select('recinto_id').eq('id', jrvId).single();
    if (jrvError) throw jrvError;
    if (!jrv) {
      throw new ApiError(404, 'JRV_NOT_FOUND', 'La JRV no existe.');
    }

    const { error: assignmentError } = await admin.from('asignaciones').insert({
      perfil_id: createdUserId,
      recinto_id: jrv.recinto_id,
      jrv_id: jrvId,
      tipo_asignacion: 'veedor',
      fecha_asignacion: new Date().toISOString(),
      activo: true,
    });

    if (assignmentError) throw assignmentError;

    const appUrl = requiredAppUrl();
    const { data: linkData, error: linkError } = await admin.auth.admin.generateLink({
      type: 'magiclink',
      email,
      options: { redirectTo: `${appUrl}/login` },
    });

    if (linkError) throw linkError;
    const actionLink = linkData.properties?.action_link;
    if (!actionLink) {
      throw new ApiError(502, 'CONFIRMATION_LINK_FAILED', 'No se pudo generar el enlace de confirmación.');
    }

    const safeName = escapeHtml(`${nombres} ${apellidos}`);
    const emailResponse = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${requiredResendApiKey()}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: 'Sistema JRV <onboarding@resend.dev>',
        to: [email],
        subject: 'Registro de cuenta - Sistema JRV',
        html: `
          <div style="font-family:Arial,sans-serif">
            <h2>Bienvenido al Sistema JRV</h2>
            <p>Hola ${safeName}.</p>
            <p>Se ha creado una cuenta para usted como veedor electoral.</p>
            <p>Usuario: su número de cédula.</p>
            <p>Contraseña inicial: <strong>${initialPassword}</strong></p>
            <p><a href="${actionLink}">Confirmar cuenta</a></p>
            <p>Al ingresar deberá cambiar la contraseña inicial.</p>
          </div>
        `,
      }),
    });

    if (!emailResponse.ok) {
      console.error('Resend rechazó el correo del veedor:', emailResponse.status);
      throw new ApiError(
        502,
        'CONFIRMATION_EMAIL_FAILED',
        'La cuenta no pudo completar el envío del correo de confirmación.',
      );
    }

    createdUserId = null;
    return success(
      {
        perfil_id: createdUser.user.id,
        jrv_id: jrvId,
        correo_enviado: true,
        primer_acceso: true,
      },
      201,
    );
  } catch (error) {
    if (createdUserId && admin) {
      const { error: assignmentCleanupError } = await admin
        .from('asignaciones')
        .delete()
        .eq('perfil_id', createdUserId)
        .eq('tipo_asignacion', 'veedor');
      if (assignmentCleanupError) {
        console.error('No se pudo limpiar la asignación del veedor:', assignmentCleanupError);
      }

      const { error: profileCleanupError } = await admin.from('perfiles').delete().eq('id', createdUserId);
      if (profileCleanupError) {
        console.error('No se pudo limpiar el perfil del veedor:', profileCleanupError);
      }

      const { error: userCleanupError } = await admin.auth.admin.deleteUser(createdUserId);
      if (userCleanupError) {
        console.error('No se pudo limpiar el usuario del veedor:', userCleanupError);
      }
    }

    return errorResponse(error);
  }
});
