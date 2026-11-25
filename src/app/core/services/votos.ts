import { Injectable } from '@angular/core';
import { SupabaseService } from './supabase.service';
import { DetalleVoto } from '../models/detalle-voto.model';

interface ApiResponse<T> {
  success: boolean;
  data: T;
  error?: { message?: string };
}

interface ActaDetails {
  detalle_votos: DetalleVoto[] | null;
}

@Injectable({
  providedIn: 'root'
})
export class VotosService {
  constructor(private supabaseService: SupabaseService) {}

  async obtenerVotosPorActa(actaId: number): Promise<DetalleVoto[]> {
    const acta = await this.invokeApi<ActaDetails>({
      action: 'detalle',
      acta_id: actaId,
    });

    return acta.detalle_votos ?? [];
  }

  async obtenerVoto(id: number): Promise<DetalleVoto> {
    return this.invokeApi<DetalleVoto>({
      action: 'detalle_voto',
      detalle_voto_id: id,
    });
  }

  private async invokeApi<T>(body: Record<string, unknown>): Promise<T> {
    const { data, error } = await this.supabaseService.client.functions.invoke<ApiResponse<T>>(
      'actas-api',
      { body },
    );

    if (error) throw error;
    if (!data?.success) {
      throw new Error(data?.error?.message ?? 'No se pudo consultar el detalle de votos.');
    }

    return data.data;
  }
}
