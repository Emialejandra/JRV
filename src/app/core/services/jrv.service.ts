import { Injectable } from '@angular/core';
import { SupabaseService } from './supabase.service';
import { Jrv } from '../models/jrv.model';

@Injectable({
  providedIn: 'root'
})
export class JrvService {

  constructor(
    private supabaseService: SupabaseService
  ) { }

  /**
   * Obtiene el recinto asignado al usuario actualmente autenticado.
   */
  async obtenerRecintoAsignado(): Promise<number> {

    console.log(' JRV: iniciando obtenerRecintoAsignado()');

    const usuario = await this.supabaseService.client.auth.getUser();

    console.log(' JRV: respuesta de auth.getUser()', usuario);

    if (!usuario.data.user) {
      throw new Error('No existe un usuario autenticado.');
    }

    console.log(
      ' JRV: usuario autenticado:',
      usuario.data.user.id
    );

    console.log(' JRV: consultando asignaciones...');

    const { data, error } = await this.supabaseService.client
      .from('asignaciones')
      .select('recinto_id')
      .eq('perfil_id', usuario.data.user.id)
      .eq('activo', true)
      .eq('tipo_asignacion', 'coordinador_recinto')
      .not('recinto_id', 'is', null)
      .limit(1)
      .maybeSingle();

    console.log(' JRV: respuesta de asignaciones:', {
      data,
      error
    });

    if (error) {
      throw error;
    }

    if (!data?.recinto_id) {
      throw new Error('El usuario no tiene un recinto asignado.');
    }

    console.log(
      ' JRV: recinto encontrado:',
      data.recinto_id
    );

    return data.recinto_id;
  }

  /**
   * Obtiene las JRV de un recinto.
   */
  async obtenerJrvPorRecinto(recintoId: number): Promise<Jrv[]> {

    console.log(
      ' JRV: buscando JRV del recinto:',
      recintoId
    );

    const { data, error } =
      await this.supabaseService.client
        .from('jrv')
        .select('*')
        .eq('recinto_id', recintoId)
        .order('numero');

    console.log(' JRV: respuesta de tabla jrv:', {
      data,
      error
    });

    if (error) {
      throw error;
    }

    console.log(
      ' JRV: JRV encontradas:',
      data?.length ?? 0
    );

    return data ?? [];
  }

  /**
   * Obtiene una JRV por ID.
   */
  async obtenerJrv(id: number) {

    const { data, error } =
      await this.supabaseService.client
        .from('jrv')
        .select('*')
        .eq('id', id)
        .single();

    if (error) {
      throw error;
    }

    return data;
  }

  
  /**
   * Crea una nueva JRV.
   */
  async crearJrv(
    jrv: Omit<Jrv, 'id' | 'created_at'>
  ) {

    const { data, error } =
      await this.supabaseService.client
        .from('jrv')
        .insert(jrv)
        .select()
        .single();

    if (error) {
      throw error;
    }

    return data;
  }

  /**
   * Actualiza una JRV.
   */
  async actualizarJrv(
    id: number,
    cambios: Partial<Omit<Jrv, 'id' | 'created_at'>>
  ) {

    const { data, error } =
      await this.supabaseService.client
        .from('jrv')
        .update(cambios)
        .eq('id', id)
        .select()
        .single();

    if (error) {
      throw error;
    }

    return data;
  }

  /**
   * Elimina una JRV.
   */
  async eliminarJrv(id: number) {

    const { error } =
      await this.supabaseService.client
        .from('jrv')
        .delete()
        .eq('id', id);

    if (error) {
      throw error;
    }
  }
}