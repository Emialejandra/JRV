import { Injectable } from '@angular/core';
import { SupabaseService } from './supabase.service';

@Injectable({ providedIn: 'root' })
export class PrecargaService {
  constructor(private readonly supabase: SupabaseService) {}

  async ejecutar(payload: Record<string, unknown>): Promise<unknown> {
    const { data, error } = await this.supabase.client.functions.invoke<{
      success: boolean;
      data?: unknown;
      error?: { message?: string };
    }>('precargar-datos', { body: payload });
    if (error) throw error;
    if (!data?.success) throw new Error(data?.error?.message ?? 'No se pudo precargar la información.');
    return data.data;
  }
}
