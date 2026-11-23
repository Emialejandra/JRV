import { Injectable } from '@angular/core';
import { SupabaseService } from './supabase.service';

@Injectable({
  providedIn: 'root'
})
export class TerritorioService {

  constructor(
    private supabaseService: SupabaseService
  ) {}

  async obtenerProvincias() {
    const { data, error } =
      await this.supabaseService.client
        .from('provincias')
        .select('*')
        .order('nombre');

    if (error) {
      throw error;
    }

    return data;
  }

  async obtenerCantones(provinciaId: number) {
    const { data, error } =
      await this.supabaseService.client
        .from('cantones')
        .select('*')
        .eq('provincia_id', provinciaId)
        .order('nombre');

    if (error) {
      throw error;
    }

    return data;
  }

  async obtenerParroquias(cantonId: number) {
    const { data, error } =
      await this.supabaseService.client
        .from('parroquias')
        .select('*')
        .eq('canton_id', cantonId)
        .order('nombre');

    if (error) {
      throw error;
    }

    return data;
  }
}