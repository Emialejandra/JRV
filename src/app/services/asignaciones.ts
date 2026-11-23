import { Injectable } from '@angular/core';
import { SupabaseService } from './supabase.service';
import { Asignacion } from '../models/asignacion.model';

@Injectable({
  providedIn: 'root'
})
export class AsignacionesService {

  constructor(
    private supabaseService: SupabaseService
  ) {}

  async obtenerMisAsignaciones(): Promise<Asignacion[]> {

    const {
      data: { user }
    } = await this.supabaseService.client.auth.getUser();

    if (!user) {
      throw new Error('Usuario no autenticado');
    }

    const { data, error } =
      await this.supabaseService.client
        .from('asignaciones')
        .select(`
          *,
          provincias (
            id,
            nombre
          ),
          recintos (
            id,
            nombre
          ),
          jrv (
            id,
            numero,
            codigo
          )
        `)
        .eq('perfil_id', user.id)
        .eq('activo', true);

    if (error) {
      throw error;
    }

    return data ?? [];
  }

  async obtenerAsignacionesPorPerfil(
    perfilId: string
  ): Promise<Asignacion[]> {

    const { data, error } =
      await this.supabaseService.client
        .from('asignaciones')
        .select('*')
        .eq('perfil_id', perfilId)
        .eq('activo', true);

    if (error) {
      throw error;
    }

    return data ?? [];
  }

  async obtenerAsignacion(id: number): Promise<Asignacion> {

    const { data, error } =
      await this.supabaseService.client
        .from('asignaciones')
        .select('*')
        .eq('id', id)
        .single();

    if (error) {
      throw error;
    }

    return data;
  }

  async crearAsignacion(
    asignacion: Omit<Asignacion, 'id' | 'created_at' | 'updated_at'>
  ) {

    const { data, error } =
      await this.supabaseService.client
        .from('asignaciones')
        .insert(asignacion)
        .select()
        .single();

    if (error) {
      throw error;
    }

    return data;
  }

  async actualizarAsignacion(
    id: number,
    datos: Partial<Asignacion>
  ) {

    const { data, error } =
      await this.supabaseService.client
        .from('asignaciones')
        .update(datos)
        .eq('id', id)
        .select()
        .single();

    if (error) {
      throw error;
    }

    return data;
  }

  async desactivarAsignacion(id: number) {

    const { data, error } =
      await this.supabaseService.client
        .from('asignaciones')
        .update({ activo: false })
        .eq('id', id)
        .select()
        .single();

    if (error) {
      throw error;
    }

    return data;
  }
}