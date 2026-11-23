import { Injectable } from '@angular/core';
import { SupabaseService } from './supabase.service';

@Injectable({
  providedIn: 'root'
})
export class JrvService {

  constructor(
    private supabaseService: SupabaseService
  ) {}

  async obtenerJrvPorRecinto(recintoId: number) {

    const { data, error } =
      await this.supabaseService.client
        .from('jrv')
        .select('*')
        .eq('recinto_id', recintoId)
        .order('numero');

    if (error) {
      throw error;
    }

    return data;
  }

  async obtenerJrv(id: number) {

    const { data, error } =
      await this.supabaseService.client
        .from('jrv')
        .select('*')
        .eq('id', id)
        .single();

    if (error) {
      throw error;
    }

    return data;
  }
}