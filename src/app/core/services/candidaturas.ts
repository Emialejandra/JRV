import { Injectable } from '@angular/core';
import { SupabaseService } from './supabase.service';
import { Candidatura } from '../models/candidatura.model';

@Injectable({
  providedIn: 'root'
})
export class CandidaturasService {

  constructor(
    private supabaseService: SupabaseService
  ) {}

  async obtenerCandidaturas(): Promise<Candidatura[]> {
    const { data, error } =
      await this.supabaseService.client
        .from('candidaturas')
        .select('*')
        .order('apellidos');

    if (error) {
      throw error;
    }

    return data ?? [];
  }

  async obtenerCandidaturasPorDignidad(
    dignidad: 'alcaldia' | 'prefectura'
  ): Promise<Candidatura[]> {

    const { data, error } =
      await this.supabaseService.client
        .from('candidaturas')
        .select('*')
        .eq('dignidad', dignidad)
        .eq('activo', true)
        .order('apellidos');

    if (error) {
      throw error;
    }

    return data ?? [];
  }

  async obtenerCandidaturasPorOrganizacion(
    organizacionId: number
  ): Promise<Candidatura[]> {

    const { data, error } =
      await this.supabaseService.client
        .from('candidaturas')
        .select('*')
        .eq('organizacion_id', organizacionId)
        .eq('activo', true)
        .order('apellidos');

    if (error) {
      throw error;
    }

    return data ?? [];
  }

  async obtenerCandidatura(id: number): Promise<Candidatura> {
    const { data, error } =
      await this.supabaseService.client
        .from('candidaturas')
        .select('*')
        .eq('id', id)
        .single();

    if (error) {
      throw error;
    }

    return data;
  }

  async crearCandidatura(
    candidatura: Omit<Candidatura, 'id' | 'created_at'>
  ) {
    const { data, error } =
      await this.supabaseService.client
        .from('candidaturas')
        .insert(candidatura)
        .select()
        .single();

    if (error) {
      throw error;
    }

    return data;
  }

  async actualizarCandidatura(
    id: number,
    datos: Partial<Candidatura>
  ) {
    const { data, error } =
      await this.supabaseService.client
        .from('candidaturas')
        .update(datos)
        .eq('id', id)
        .select()
        .single();

    if (error) {
      throw error;
    }

    return data;
  }

  async eliminarCandidatura(id: number) {
    const { error } =
      await this.supabaseService.client
        .from('candidaturas')
        .delete()
        .eq('id', id);

    if (error) {
      throw error;
    }
  }
}
