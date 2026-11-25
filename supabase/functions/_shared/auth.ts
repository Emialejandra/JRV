import type { SupabaseClient, User } from 'npm:@supabase/supabase-js@2';
import { ApiError } from './http.ts';
import { createAdminClient, createUserClient } from './supabase.ts';

export type AppRole = 'administrador' | 'coordinador_provincial' | 'coordinador_recinto' | 'veedor';

export interface Profile {
  id: string;
  nombres: string;
  apellidos: string;
  cedula: string;
  email: string | null;
  telefono: string | null;
  rol: AppRole;
  activo: boolean;
  primer_acceso: boolean;
}

export interface AuthenticatedActor {
  user: User;
  profile: Profile;
  admin: SupabaseClient;
  userClient: SupabaseClient;
}

const allowedRoles = new Set<AppRole>(['administrador', 'coordinador_provincial', 'coordinador_recinto', 'veedor']);

export async function authenticate(request: Request, roles?: readonly AppRole[]): Promise<AuthenticatedActor> {
  const authorization = request.headers.get('Authorization');
  if (!authorization?.startsWith('Bearer ')) {
    throw new ApiError(401, 'AUTH_REQUIRED', 'Se requiere una sesión válida.');
  }

  const admin = createAdminClient();
  const userClient = createUserClient(authorization);
  const { data: userData, error: userError } = await userClient.auth.getUser();

  if (userError || !userData.user) {
    throw new ApiError(401, 'INVALID_SESSION', 'La sesión no es válida o expiró.');
  }

  const { data: profile, error: profileError } = await admin
    .from('perfiles')
    .select('id, nombres, apellidos, cedula, email, telefono, rol, activo, primer_acceso')
    .eq('id', userData.user.id)
    .maybeSingle();

  if (profileError) throw profileError;
  if (!profile || profile.activo !== true) {
    throw new ApiError(403, 'PROFILE_INACTIVE', 'El perfil no existe o está inactivo.');
  }

  if (!allowedRoles.has(profile.rol as AppRole)) {
    throw new ApiError(403, 'INVALID_ROLE', 'El rol del perfil no es válido.');
  }

  if (roles && !roles.includes(profile.rol as AppRole)) {
    throw new ApiError(403, 'ROLE_FORBIDDEN', 'No tienes permisos para esta operación.');
  }

  return {
    user: userData.user,
    profile: profile as Profile,
    admin,
    userClient,
  };
}

export async function getJrvTerritory(
  admin: SupabaseClient,
  jrvId: number,
): Promise<{ jrvId: number; recintoId: number; provinciaId: number }> {
  const { data: jrv, error: jrvError } = await admin.from('jrv').select('id, recinto_id').eq('id', jrvId).maybeSingle();

  if (jrvError) throw jrvError;
  if (!jrv) throw new ApiError(404, 'JRV_NOT_FOUND', 'La JRV no existe.');

  const { data: recinto, error: recintoError } = await admin
    .from('recintos')
    .select('id, parroquia_id')
    .eq('id', jrv.recinto_id)
    .maybeSingle();

  if (recintoError) throw recintoError;
  if (!recinto) throw new ApiError(404, 'RECINTO_NOT_FOUND', 'El recinto no existe.');

  const { data: parroquia, error: parroquiaError } = await admin
    .from('parroquias')
    .select('canton_id')
    .eq('id', recinto.parroquia_id)
    .maybeSingle();

  if (parroquiaError) throw parroquiaError;
  if (!parroquia) {
    throw new ApiError(409, 'TERRITORY_INCOMPLETE', 'La parroquia del recinto no existe.');
  }

  const { data: canton, error: cantonError } = await admin
    .from('cantones')
    .select('provincia_id')
    .eq('id', parroquia.canton_id)
    .maybeSingle();

  if (cantonError) throw cantonError;
  if (!canton) {
    throw new ApiError(409, 'TERRITORY_INCOMPLETE', 'El cantón del recinto no existe.');
  }

  return {
    jrvId,
    recintoId: jrv.recinto_id,
    provinciaId: canton.provincia_id,
  };
}

export async function assertJrvAccess(actor: AuthenticatedActor, jrvId: number): Promise<void> {
  const territory = await getJrvTerritory(actor.admin, jrvId);
  const role = actor.profile.rol;

  if (role === 'administrador') return;

  if (role === 'veedor') {
    const { data, error } = await actor.admin
      .from('asignaciones')
      .select('id')
      .eq('perfil_id', actor.user.id)
      .eq('jrv_id', jrvId)
      .eq('tipo_asignacion', 'veedor')
      .eq('activo', true)
      .limit(1)
      .maybeSingle();

    if (error) throw error;
    if (data) return;
  }

  if (role === 'coordinador_recinto') {
    const { data, error } = await actor.admin
      .from('asignaciones')
      .select('id')
      .eq('perfil_id', actor.user.id)
      .eq('recinto_id', territory.recintoId)
      .eq('tipo_asignacion', 'coordinador_recinto')
      .eq('activo', true)
      .limit(1)
      .maybeSingle();

    if (error) throw error;
    if (data) return;
  }

  if (role === 'coordinador_provincial') {
    const { data, error } = await actor.admin
      .from('asignaciones')
      .select('id')
      .eq('perfil_id', actor.user.id)
      .eq('provincia_id', territory.provinciaId)
      .eq('tipo_asignacion', 'coordinador_provincial')
      .eq('activo', true)
      .limit(1)
      .maybeSingle();

    if (error) throw error;
    if (data) return;
  }

  throw new ApiError(403, 'JRV_FORBIDDEN', 'No tienes acceso a esta JRV.');
}

export async function assertRecintoAccess(actor: AuthenticatedActor, recintoId: number): Promise<void> {
  const { data: recinto, error: recintoError } = await actor.admin
    .from('recintos')
    .select('id, parroquia_id')
    .eq('id', recintoId)
    .maybeSingle();

  if (recintoError) throw recintoError;
  if (!recinto) throw new ApiError(404, 'RECINTO_NOT_FOUND', 'El recinto no existe.');
  if (actor.profile.rol === 'administrador') return;

  const { data: parroquia, error: parroquiaError } = await actor.admin
    .from('parroquias')
    .select('canton_id')
    .eq('id', recinto.parroquia_id)
    .maybeSingle();

  if (parroquiaError) throw parroquiaError;
  if (!parroquia) {
    throw new ApiError(409, 'TERRITORY_INCOMPLETE', 'La parroquia del recinto no existe.');
  }

  const { data: canton, error: cantonError } = await actor.admin
    .from('cantones')
    .select('provincia_id')
    .eq('id', parroquia.canton_id)
    .maybeSingle();

  if (cantonError) throw cantonError;
  if (!canton) {
    throw new ApiError(409, 'TERRITORY_INCOMPLETE', 'El cantón del recinto no existe.');
  }

  const assignmentQuery = actor.admin
    .from('asignaciones')
    .select('id')
    .eq('perfil_id', actor.user.id)
    .eq('activo', true)
    .limit(1);

  const { data, error } =
    actor.profile.rol === 'coordinador_recinto'
      ? await assignmentQuery.eq('recinto_id', recintoId).eq('tipo_asignacion', 'coordinador_recinto').maybeSingle()
      : await assignmentQuery
          .eq('provincia_id', canton.provincia_id)
          .eq('tipo_asignacion', 'coordinador_provincial')
          .maybeSingle();

  if (error) throw error;
  if (!data) {
    throw new ApiError(403, 'RECINTO_FORBIDDEN', 'No tienes acceso a este recinto.');
  }
}
