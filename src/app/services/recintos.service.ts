import { Injectable } from '@angular/core';
import { SupabaseService } from './supabase.service';

@Injectable({
  providedIn: 'root'
})
export class RecintosService {

  constructor(
    private supabaseService: SupabaseService
  ) {}

  async obtenerRecintos() {

    const { data, error } =
      await this.supabaseService.client
        .from('recintos')
        .select('*')
        .order('nombre');

    if (error) {
      throw error;
    }

    return data;
  }

  async obtenerRecintosPorParroquia(
    parroquiaId: number
  ) {

    const { data, error } =
      await this.supabaseService.client
        .from('recintos')
        .select('*')
        .eq('parroquia_id', parroquiaId)
        .order('nombre');

    if (error) {
      throw error;
    }

    return data;
  }
}