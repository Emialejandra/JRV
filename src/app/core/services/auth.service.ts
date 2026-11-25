import { Injectable } from '@angular/core';
import { SupabaseService } from './supabase.service';

@Injectable({
  providedIn: 'root',
})
export class AuthService {
  constructor(private supabaseService: SupabaseService) { }

  async iniciarSesion(cedula: string, password: string) {
    const { data, error } = await this.supabaseService.client.functions.invoke('login-cedula', {
      body: {
        cedula,
        password,
      },
    });

    if (error) {
      throw new Error(await this.mensajeErrorFuncion(error));
    }

    const payload = data?.data ?? data;
    if (!payload?.session?.access_token || !payload?.session?.refresh_token) {
      throw new Error(data?.error?.message || 'No se pudo obtener la sesión.');
    }

    const { data: sessionData, error: sessionError } = await this.supabaseService.client.auth.setSession({
      access_token: payload.session.access_token,
      refresh_token: payload.session.refresh_token,
    });

    if (sessionError) {
      throw sessionError;
    }

    return sessionData;
  }

  private async mensajeErrorFuncion(error: unknown): Promise<string> {
    if (typeof error === 'object' && error !== null && 'context' in error) {
      const context = (error as { context?: unknown }).context;
      if (context instanceof Response) {
        try {
          const responseText = await context.clone().text();
          let body: unknown;
          try {
            body = JSON.parse(responseText);
          } catch {
            if (responseText.trim()) return responseText.trim();
          }
          if (typeof body === 'object' && body !== null) {
            const payload = body as {
              error?: { message?: unknown; code?: unknown };
              message?: unknown;
            };
            if (typeof payload.error?.message === 'string') return payload.error.message;
            if (typeof payload.message === 'string') return payload.message;
          }
          if (context.status === 401) {
            return 'Supabase rechazó el inicio de sesión (401). Verifica que login-cedula esté desplegada sin verificación JWT y revisa los logs de la función.';
          }
        } catch {
          // La respuesta puede ser texto plano (por ejemplo, un rechazo del gateway).
        }
      }
    }

    if (error instanceof Error && error.message) return error.message;
    return 'No se pudo iniciar sesión. Verifica la cédula y la contraseña.';
  }

  async cerrarSesion() {
    const { error } = await this.supabaseService.client.auth.signOut();

    if (error) {
      throw error;
    }
  }

  async cambiarPassword(nuevaPassword: string) {
    const { data, error } = await this.supabaseService.client.functions.invoke('cambiar-password', {
      body: { nuevaPassword },
    });

    if (error) {
      throw new Error(data?.error?.message || error.message || 'No se pudo cambiar la contraseña.');
    }
    if (data?.success === false) {
      throw new Error(data.error?.message || 'No se pudo cambiar la contraseña.');
    }

    return data?.data;
  }

  async enviarRecuperacionPassword(email: string) {
    const { data, error } =
      await this.supabaseService.client.auth.resetPasswordForEmail(email, {
        redirectTo: 'io.ionic.starter://auth/callback',
      });

    if (error) {
      throw error;
    }

    return data;
  }
}
