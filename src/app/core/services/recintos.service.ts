import { Injectable } from '@angular/core';
import { SupabaseService } from './supabase.service';

export interface Recinto {
  id?: number;
  parroquia_id: number;
  nombre: string;
  direccion?: string;
  referencia?: string;
  latitud?: number;
  longitud?: number;
  capacidad_jrv?: number;
  cne_zona?: string | null;
  cne_cda?: boolean | null;
  juntas_femeninas?: number | null;
  juntas_masculinas?: number | null;
  electores?: number | null;
  dificil_acceso?: boolean | null;
  sin_conectividad?: boolean | null;
  activo?: boolean;
}

@Injectable({
  providedIn: 'root'
})
export class RecintosService {

  constructor(
    private supabase: SupabaseService
  ) {}

  async obtenerRecintos() {
    const { data, error } = await this.supabase.client.functions.invoke(
      'recintos-api',
      { body: { action: 'listar' } }
    );

    if (error) {
      return {
        data: null,
        error: new Error(
          data?.error?.message || error.message || 'No se pudieron cargar los recintos.'
        )
      };
    }
    if (data?.success === false) {
      return {
        data: null,
        error: new Error(data.error?.message || 'No se pudieron cargar los recintos.')
      };
    }

    return { data: data?.data ?? [], error: null };
  }

  async crearRecinto(recinto: Recinto) {
    const { data, error } = await this.supabase.client.functions.invoke(
      'recintos-api',
      {
        body: {
          action: 'crear',
          parroquia_id: recinto.parroquia_id,
          nombre: recinto.nombre,
          direccion: recinto.direccion,
          referencia: recinto.referencia,
          cantidad_jrv: recinto.capacidad_jrv,
          latitud: recinto.latitud,
          longitud: recinto.longitud
        }
      }
    );

    if (error) {
      return {
        data: null,
        error: new Error(
          data?.error?.message || error.message || 'No se pudo crear el recinto.'
        )
      };
    }
    if (data?.success === false) {
      return {
        data: null,
        error: new Error(data.error?.message || 'No se pudo crear el recinto.')
      };
    }

    return { data: data?.data ?? null, error: null };
  }
}
