import { Injectable } from '@angular/core';
import { SupabaseService } from './supabase.service';
import { Acta } from '../models/acta.model';

export interface ActaVotoInput {
  candidatura_id: number;
  cantidad_votos: number;
}

export interface ActaRegistroInput {
  jrv_id: number;
  dignidad: 'alcaldia' | 'prefectura';
  client_id?: string;
  expected_updated_at?: string | null;
  votos: ActaVotoInput[];
  total_votos_blancos: number;
  total_votos_nulos: number;
  total_votantes: number;
  latitud?: number | null;
  longitud?: number | null;
  fotografia_path: string | null;
  observaciones?: string | null;
}

export interface CandidaturaParaActa {
  id: number;
  nombres: string;
  apellidos: string;
  organizacion_id: number;
  numero_lista?: string | null;
  organizaciones?: { nombre: string; sigla?: string | null } | null;
}

interface ApiResponse<T> {
  success: boolean;
  data: T;
  error?: { message?: string };
}

@Injectable({
  providedIn: 'root',
})
export class ActasService {
  constructor(private supabaseService: SupabaseService) { }

  async obtenerActa<T = Acta>(id: number): Promise<T> {
    return this.invokeApi<T>({ action: 'detalle', acta_id: id });
  }

  async obtenerActasPorJrv<T = Acta[]>(jrvId: number): Promise<T> {
    return this.invokeApi<T>({ action: 'listar', jrv_id: jrvId });
  }

  async registrarActa(acta: ActaRegistroInput) {
    return this.invokeApi({ action: 'guardar', data: acta });
  }

  async actualizarActa(id: number, datos: ActaRegistroInput, expectedUpdatedAt: string) {
    return this.invokeApi({
      action: 'corregir',
      data: { ...datos, acta_id: id, expected_updated_at: expectedUpdatedAt },
    });
  }

  async obtenerCandidaturas(dignidad: 'alcaldia' | 'prefectura'): Promise<CandidaturaParaActa[]> {
    console.log('=== DIAGNÓSTICO CANDIDATURAS ===');
    console.log('Dignidad:', dignidad);

    const { data: sessionData } = await this.supabaseService.client.auth.getSession();
    console.log(
      'Usuario autenticado:',
      sessionData.session?.user?.id ?? 'SIN SESIÓN'
    );

    const { data, error } = await this.supabaseService.client
      .from('candidaturas')
      .select(
        'id, nombres, apellidos, organizacion_id, numero_lista, organizaciones(nombre, sigla)'
      )
      .eq('dignidad', dignidad)
      .eq('activo', true)
      .order('numero_lista', { nullsFirst: false })
      .order('nombres');

    console.log('Candidaturas recibidas:', data);
    console.log('Error:', error);
    console.log('Cantidad:', data?.length ?? 0);

    if (error) throw error;

    const rows = (data ?? []) as unknown as Array<
      Omit<CandidaturaParaActa, 'organizaciones'> & {
        organizaciones:
        | CandidaturaParaActa['organizaciones']
        | NonNullable<CandidaturaParaActa['organizaciones']>[];
      }
    >;

    return rows.map((row) => ({
      ...row,
      organizaciones: Array.isArray(row.organizaciones)
        ? (row.organizaciones[0] ?? null)
        : row.organizaciones,
    }));
  }

  async subirFotografia(
    jrvId: number,
    dignidad: 'alcaldia' | 'prefectura',
    file: File,
  ): Promise<{ path: string; fotografia_url: string }> {
    const form = new FormData();
    form.append('jrv_id', String(jrvId));
    form.append('dignidad', dignidad);
    form.append('file', file, file.name);

    const { data, error } = await this.supabaseService.client.functions.invoke<{
      success: boolean;
      data?: { path: string; fotografia_url: string };
      error?: { message?: string };
    }>('acta-fotografia', { body: form });

    if (error) throw error;
    if (!data?.success || !data.data?.path) {
      throw new Error(data?.error?.message ?? 'No se pudo subir la fotografía.');
    }
    return data.data;
  }

  private async invokeApi<T = unknown>(body: Record<string, unknown>): Promise<T> {
    const { data, error } = await this.supabaseService.client.functions.invoke<ApiResponse<T>>('actas-api', { body });

    if (error) throw error;
    if (!data?.success) {
      throw new Error(data?.error?.message ?? 'No se pudo completar la operación del acta.');
    }

    return data.data;
  }
}
