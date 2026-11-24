import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { SupabaseService } from '../services/supabase.service';

export const roleGuard: CanActivateFn = async (route) => {
  const supabaseService = inject(SupabaseService);
  const router = inject(Router);

  const {
    data: { user }
  } = await supabaseService.client.auth.getUser();

  if (!user) {
    return router.createUrlTree(['/login']);
  }

  const { data: perfil, error } =
    await supabaseService.client
      .from('perfiles')
      .select('rol, activo')
      .eq('id', user.id)
      .single();

  if (error || !perfil || !perfil.activo) {
    return router.createUrlTree(['/acceso-denegado']);
  }

  const rolesPermitidos = route.data['roles'] as string[];

  if (rolesPermitidos.includes(perfil.rol)) {
    return true;
  }

  return router.createUrlTree(['/acceso-denegado']);
};