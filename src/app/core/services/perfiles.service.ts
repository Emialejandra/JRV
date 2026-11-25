
import { Injectable } from '@angular/core';
import { SupabaseService } from './supabase.service';
import { Perfil } from '../models/perfil.model';

@Injectable({
  providedIn: 'root'
})
export class PerfilesService {

  constructor(
    private supabaseService: SupabaseService
  ) {}

  /**
   * Obtiene el perfil utilizando directamente el ID
   * del usuario autenticado.
   *
   * Evita ejecutar auth.getUser() cuando ya conocemos
   * el ID del usuario.
   */
  async obtenerPerfilPorId(userId: string): Promise<Perfil | null> {

    if (!userId) {
      return null;
    }

    const { data, error } = await this.supabaseService.client
      .from('perfiles')
      .select('*')
      .eq('id', userId)
      .maybeSingle();

    if (error) {
      throw error;
    }

    return data;
  }

  /**
   * Obtiene el perfil de la sesión actual.
   * getSession utiliza la sesión local, evitando una
   * petición adicional a auth/v1/user.
   */
  async obtenerMiPerfil(): Promise<Perfil | null> {

    const { data, error } =
      await this.supabaseService.client.auth.getSession();

    if (error) {
      throw error;
    }

    const userId = data.session?.user?.id;

    if (!userId) {
      return null;
    }

    return this.obtenerPerfilPorId(userId);
  }

  async actualizarPerfil(
    datos: Partial<Perfil>
  ) {

    const { data: sessionData, error: sessionError } =
      await this.supabaseService.client.auth.getSession();

    if (sessionError) {
      throw sessionError;
    }

    const userId = sessionData.session?.user?.id;

    if (!userId) {
      throw new Error('Usuario no autenticado');
    }

    const { data, error } =
      await this.supabaseService.client
        .from('perfiles')
        .update(datos)
        .eq('id', userId)
        .select()
        .single();

    if (error) {
      throw error;
    }

    return data;
  }
}
