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

  async obtenerMiPerfil(): Promise<Perfil | null> {

    const {
      data: { user }
    } = await this.supabaseService.client.auth.getUser();

    if (!user) {
      return null;
    }

    const { data, error } =
      await this.supabaseService.client
        .from('perfiles')
        .select('*')
        .eq('id', user.id)
        .single();

    if (error) {
      throw error;
    }

    return data;
  }

  async actualizarPerfil(
    datos: Partial<Perfil>
  ) {

    const {
      data: { user }
    } = await this.supabaseService.client.auth.getUser();

    if (!user) {
      throw new Error('Usuario no autenticado');
    }

    const { data, error } =
      await this.supabaseService.client
        .from('perfiles')
        .update(datos)
        .eq('id', user.id)
        .select()
        .single();

    if (error) {
      throw error;
    }

    return data;
  }
}