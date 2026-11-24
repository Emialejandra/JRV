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
  return await this.supabase.client
    .from('recintos')
    .select('*')
    .order('nombre');
}

async crearRecinto(recinto: Recinto) {
  return await this.supabase.client
    .from('recintos')
    .insert([recinto])
    .select()
    .single();
}
}
