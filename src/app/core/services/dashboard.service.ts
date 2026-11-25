import { Injectable } from '@angular/core';
import { SupabaseService } from './supabase.service';

export interface ActaResumen {
  id: number;
  jrv_id: number;
  dignidad: 'alcaldia' | 'prefectura';
  estado: string;
  latitud: number | null;
  longitud: number | null;
  total_votantes: number;
  fecha_registro: string;
}

export interface JrvResumen {
  id: number;
  numero: number;
  estado: string;
  actas: { alcaldia: ActaResumen | null; prefectura: ActaResumen | null };
}

export interface RecintoResumen {
  id: number;
  nombre: string;
  jrv_total: number;
  jrvs: JrvResumen[];
  votos: {
    alcaldia: {
      candidatos: Array<{
        candidatura_id: number;
        nombres: string;
        apellidos: string;
        organizacion: string | null;
        votos: number;
      }>;
    };
    prefectura: {
      candidatos: Array<{
        candidatura_id: number;
        nombres: string;
        apellidos: string;
        organizacion: string | null;
        votos: number;
      }>;
    };
  };
}

export interface DashboardElectoral {
  resumen: {
    recintos: number;
    jrv_total: number;
    actas: number;
    actas_alcaldia?: number;
    actas_prefectura?: number;
    actas_con_gps?: number;
  };
  recintos: RecintoResumen[];
  votos_consolidados?: RecintoResumen['votos'];
}

@Injectable({ providedIn: 'root' })
export class DashboardService {
  constructor(private readonly supabase: SupabaseService) {}

  async obtener(res: { recinto_id?: number; provincia_id?: number } = {}): Promise<DashboardElectoral> {
    const { data, error } = await this.supabase.client.functions.invoke<{
      success: boolean;
      data?: DashboardElectoral;
      error?: { message?: string };
    }>('dashboard-electoral', { body: res });

    if (error) throw error;
    if (!data?.success || !data.data) throw new Error(data?.error?.message ?? 'No se pudo cargar el dashboard.');
    return data.data;
  }
}
