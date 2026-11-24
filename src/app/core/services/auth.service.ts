import { Injectable } from '@angular/core';
import { SupabaseService } from './supabase.service';

@Injectable({
  providedIn: 'root'
})
export class AuthService {

  constructor(
    private supabaseService: SupabaseService
  ) { }

  async registrar(
    email: string,
    password: string,
    datos: {
      nombres: string;
      apellidos: string;
      cedula: string;
      telefono?: string;
    }
  ) {
    const { data, error } =
      await this.supabaseService.client.auth.signUp({
        email,
        password,
        options: {
          data: datos
        }
      });

    if (error) {
      throw error;
    }

    return data;
  }

  async iniciarSesion(
    cedula: string,
    password: string
  ) {
    const { data, error } =
      await this.supabaseService.client.functions.invoke(
        'login-cedula',
        {
          body: {
            cedula,
            password
          }
        }
      );

    if (error || !data?.session) {
      throw new Error(
        'Cédula o contraseña incorrectas, o usuario inactivo.'
      );
    }

    const { data: sesion, error: errorSesion } =
      await this.supabaseService.client.auth.setSession({
        access_token: data.session.access_token,
        refresh_token: data.session.refresh_token
      });

    if (errorSesion) {
      throw errorSesion;
    }

    return sesion;
  }

  async cerrarSesion() {
    const { error } =
      await this.supabaseService.client.auth.signOut();

    if (error) {
      throw error;
    }
  }

  async obtenerUsuarioActual() {
    const {
      data: { user }
    } = await this.supabaseService.client.auth.getUser();

    return user;
  }

  async cambiarPassword(nuevaPassword: string) {
    const { data, error } =
      await this.supabaseService.client.auth.updateUser({
        password: nuevaPassword
      });

    if (error) {
      throw error;
    }

    return data;
  }

  async marcarPrimerAccesoCompletado() {
    const user = await this.obtenerUsuarioActual();

    if (!user) {
      throw new Error('Usuario no autenticado.');
    }

    const { error } =
      await this.supabaseService.client
        .from('perfiles')
        .update({
          primer_acceso: false
        })
        .eq('id', user.id);

    if (error) {
      throw error;
    }
  }

  async enviarRecuperacionPassword(email: string) {
    const { data, error } =
      await this.supabaseService.client.auth.resetPasswordForEmail(
        email,
        {
          redirectTo:
            `${window.location.origin}/cambio-password`
        }
      );

    if (error) {
      throw error;
    }

    return data;
  }
}