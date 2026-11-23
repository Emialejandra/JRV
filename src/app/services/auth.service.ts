import { Injectable } from '@angular/core';
import { SupabaseService } from './supabase.service';

@Injectable({
  providedIn: 'root'
})
export class AuthService {

  constructor(
    private supabaseService: SupabaseService
  ) {}

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
    email: string,
    password: string
  ) {
    const { data, error } =
      await this.supabaseService.client.auth.signInWithPassword({
        email,
        password
      });

    if (error) {
      throw error;
    }

    return data;
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
}