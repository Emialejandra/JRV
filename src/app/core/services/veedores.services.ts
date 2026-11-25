import { Injectable } from '@angular/core';
import { SupabaseService } from './supabase.service';
import { Jrv } from '../models/jrv.model';

export interface DatosNuevoVeedor {
  nombres: string;
  apellidos: string;
  cedula: string;
  email: string;
  telefono: string;
  jrv_id: number;
}

export interface VeedorListado {
  perfil_id: string;
  nombres: string;
  apellidos: string;
  cedula: string;
  email: string;
  telefono: string;
  asignacion_id: number;
  jrv_id: number;
  jrv_numero: number | null;
  jrv_codigo: string | null;
}

@Injectable({
  providedIn: 'root'
})
export class VeedoresService {
  constructor(private supabaseService: SupabaseService) {}

  private get client() {
    return this.supabaseService.client;
  }

  /**
   * Obtiene el recinto asociado al coordinador autenticado.
   */
  async obtenerMiRecinto(): Promise<number> {
    const {
      data: { user },
      error: errorUsuario
    } = await this.client.auth.getUser();

    if (errorUsuario || !user) {
      throw new Error('No existe una sesión autenticada.');
    }

    const { data, error } = await this.client
      .from('asignaciones')
      .select('recinto_id')
      .eq('perfil_id', user.id)
      .eq('tipo_asignacion', 'coordinador_recinto')
      .eq('activo', true)
      .not('recinto_id', 'is', null)
      .limit(1)
      .maybeSingle();

    if (error) throw error;

    if (!data?.recinto_id) {
      throw new Error('No tienes un recinto asignado.');
    }

    return data.recinto_id;
  }

  /**
   * Obtiene las JRV del recinto del coordinador.
   */
  async obtenerMisJrv(): Promise<Jrv[]> {
    const recintoId = await this.obtenerMiRecinto();

    const { data, error } = await this.client
      .from('jrv')
      .select('*')
      .eq('recinto_id', recintoId)
      .order('numero');

    if (error) throw error;

    return data ?? [];
  }

  /**
   * Registra un veedor mediante la Edge Function crear-veedor.
   */
  async crearVeedor(datos: DatosNuevoVeedor) {
    const { data, error } = await this.client.functions.invoke(
      'crear-veedor',
      { body: datos }
    );

    if (error) {
      throw new Error(
        data?.error?.message ||
          error.message ||
          'No se pudo registrar el veedor.'
      );
    }

    if (data?.success === false) {
      throw new Error(data.error?.message || 'No se pudo registrar el veedor.');
    }

    return data?.data ?? data;
  }

  /**
   * Lista los veedores asignados al recinto del coordinador.
   */
  async obtenerMisVeedores(): Promise<VeedorListado[]> {
    const recintoId = await this.obtenerMiRecinto();
    const { data, error } = await this.client.functions.invoke(
      'asignaciones-api',
      { body: { action: 'listar', recinto_id: recintoId } }
    );

    if (error) {
      throw new Error(
        data?.error?.message || error.message || 'No se pudieron cargar los veedores.'
      );
    }
    if (data?.success === false) {
      throw new Error(data.error?.message || 'No se pudieron cargar los veedores.');
    }

    const assignments = data?.data;
    if (!Array.isArray(assignments)) return [];

    return assignments.map((assignment) => ({
      perfil_id: assignment.perfil_id,
      nombres: assignment.veedor?.nombres ?? '',
      apellidos: assignment.veedor?.apellidos ?? '',
      cedula: assignment.veedor?.cedula ?? '',
      email: assignment.veedor?.email ?? '',
      telefono: assignment.veedor?.telefono ?? '',
      asignacion_id: assignment.id,
      jrv_id: assignment.jrv_id ?? 0,
      jrv_numero: assignment.jrv?.numero ?? null,
      jrv_codigo: assignment.jrv?.codigo ?? null
    }));
  }

  /**
   * Reasigna un veedor a otra JRV del mismo recinto.
   * Conserva el registro anterior como historial.
   */
  async reasignarVeedor(
    asignacionId: number,
    nuevaJrvId: number
  ): Promise<void> {
    await this.obtenerMiRecinto();
    const { data, error } = await this.client.functions.invoke(
      'asignaciones-api',
      {
        body: {
          action: 'asignar_veedor',
          asignacion_id: asignacionId,
          jrv_id: nuevaJrvId
        }
      }
    );

    if (error) {
      throw new Error(
        data?.error?.message || error.message || 'No se pudo reasignar el veedor.'
      );
    }
    if (data?.success === false) {
      throw new Error(data.error?.message || 'No se pudo reasignar el veedor.');
    }
  }

  /**
   * Desactiva la asignación activa de un veedor.
   * No elimina el perfil ni el usuario.
   */
  async desactivarAsignacionVeedor(asignacionId: number): Promise<void> {
    await this.obtenerMiRecinto();
    const { data, error } = await this.client.functions.invoke(
      'asignaciones-api',
      {
        body: {
          action: 'desactivar_veedor',
          asignacion_id: asignacionId
        }
      }
    );

    if (error) {
      throw new Error(
        data?.error?.message || error.message || 'No se pudo desactivar la asignación.'
      );
    }
    if (data?.success === false) {
      throw new Error(
        data.error?.message || 'No se encontró una asignación activa para desactivar.'
      );
    }
  }
}