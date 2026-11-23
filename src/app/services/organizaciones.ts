import { Injectable } from '@angular/core';
import { SupabaseService } from './supabase.service';
import { Organizacion } from '../models/organizacion.model';

@Injectable({
  providedIn: 'root'
})
export class OrganizacionesService {

  constructor(
    private supabaseService: SupabaseService
  ) {}

  async obtenerOrganizaciones(): Promise<Organizacion[]> {
    const { data, error } =
      await this.supabaseService.client
        .from('organizaciones')
        .select('*')
        .order('nombre');

    if (error) {
      throw error;
    }

    return data ?? [];
  }

  async obtenerOrganizacion(id: number): Promise<Organizacion> {
    const { data, error } =
      await this.supabaseService.client
        .from('organizaciones')
        .select('*')
        .eq('id', id)
        .single();

    if (error) {
      throw error;
    }

    return data;
  }

  async crearOrganizacion(
    organizacion: Omit<Organizacion, 'id' | 'created_at'>
  ) {
    const { data, error } =
      await this.supabaseService.client
        .from('organizaciones')
        .insert(organizacion)
        .select()
        .single();

    if (error) {
      throw error;
    }

    return data;
  }

  async actualizarOrganizacion(
    id: number,
    datos: Partial<Organizacion>
  ) {
    const { data, error } =
      await this.supabaseService.client
        .from('organizaciones')
        .update(datos)
        .eq('id', id)
        .select()
        .single();

    if (error) {
      throw error;
    }

    return data;
  }

  async eliminarOrganizacion(id: number) {
    const { error } =
      await this.supabaseService.client
        .from('organizaciones')
        .delete()
        .eq('id', id);

    if (error) {
      throw error;
    }
  }
}