import { Injectable } from '@angular/core';
import { SupabaseService } from './supabase.service';
import { Acta } from '../models/acta.model';

@Injectable({
  providedIn: 'root'
})
export class ActasService {

  constructor(
    private supabaseService: SupabaseService
  ) {}

  async obtenerActas(): Promise<Acta[]> {

    const { data, error } =
      await this.supabaseService.client
        .from('actas')
        .select('*')
        .order('created_at', { ascending: false });

    if (error) {
      throw error;
    }

    return data ?? [];
  }

  async obtenerActa(id: number): Promise<Acta> {

    const { data, error } =
      await this.supabaseService.client
        .from('actas')
        .select('*')
        .eq('id', id)
        .single();

    if (error) {
      throw error;
    }

    return data;
  }

  async obtenerActasPorJrv(jrvId: number): Promise<Acta[]> {

    const { data, error } =
      await this.supabaseService.client
        .from('actas')
        .select('*')
        .eq('jrv_id', jrvId)
        .order('created_at', { ascending: false });

    if (error) {
      throw error;
    }

    return data ?? [];
  }

  async registrarActa(
    acta: Omit<Acta, 'id' | 'created_at' | 'updated_at'>
  ) {

    const { data, error } =
      await this.supabaseService.client
        .from('actas')
        .insert(acta)
        .select()
        .single();

    if (error) {
      throw error;
    }

    return data;
  }

  async actualizarActa(
    id: number,
    datos: Partial<Acta>
  ) {

    const { data, error } =
      await this.supabaseService.client
        .from('actas')
        .update(datos)
        .eq('id', id)
        .select()
        .single();

    if (error) {
      throw error;
    }

    return data;
  }

  async cambiarEstado(
    id: number,
    estado: Acta['estado']
  ) {

    const { data, error } =
      await this.supabaseService.client
        .from('actas')
        .update({ estado })
        .eq('id', id)
        .select()
        .single();

    if (error) {
      throw error;
    }

    return data;
  }
}