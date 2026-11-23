import { Injectable } from '@angular/core';
import { SupabaseService } from './supabase.service';
import { DetalleVoto } from '../models/detalle-voto.model';

@Injectable({
  providedIn: 'root'
})
export class VotosService {

  constructor(
    private supabaseService: SupabaseService
  ) {}

  async obtenerVotosPorActa(
    actaId: number
  ): Promise<DetalleVoto[]> {

    const { data, error } =
      await this.supabaseService.client
        .from('detalle_votos')
        .select(`
          *,
          candidaturas (
            id,
            nombres,
            apellidos,
            dignidad,
            organizacion_id
          )
        `)
        .eq('acta_id', actaId);

    if (error) {
      throw error;
    }

    return data ?? [];
  }

  async obtenerVoto(id: number): Promise<DetalleVoto> {

    const { data, error } =
      await this.supabaseService.client
        .from('detalle_votos')
        .select('*')
        .eq('id', id)
        .single();

    if (error) {
      throw error;
    }

    return data;
  }

  async registrarVoto(
    voto: Omit<DetalleVoto, 'id' | 'created_at'>
  ) {

    const { data, error } =
      await this.supabaseService.client
        .from('detalle_votos')
        .insert(voto)
        .select()
        .single();

    if (error) {
      throw error;
    }

    return data;
  }

  async registrarVotos(
    votos: Omit<DetalleVoto, 'id' | 'created_at'>[]
  ) {

    const { data, error } =
      await this.supabaseService.client
        .from('detalle_votos')
        .insert(votos)
        .select();

    if (error) {
      throw error;
    }

    return data ?? [];
  }

  async actualizarVoto(
    id: number,
    cantidadVotos: number
  ) {

    const { data, error } =
      await this.supabaseService.client
        .from('detalle_votos')
        .update({
          cantidad_votos: cantidadVotos
        })
        .eq('id', id)
        .select()
        .single();

    if (error) {
      throw error;
    }

    return data;
  }

  async eliminarVoto(id: number) {

    const { error } =
      await this.supabaseService.client
        .from('detalle_votos')
        .delete()
        .eq('id', id);

    if (error) {
      throw error;
    }
  }
}