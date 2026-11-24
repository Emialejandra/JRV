
import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { SupabaseService } from '../../../core/services/supabase.service';
import { AlertController } from '@ionic/angular';

import {
  IonHeader,
  IonToolbar,
  IonTitle,
  IonContent,
  IonCard,
  IonCardHeader,
  IonCardTitle,
  IonCardContent,
  IonItem,
  IonLabel,
  IonInput,
  IonSelect,
  IonSelectOption,
  IonButton,
  IonSpinner,
  IonText
} from '@ionic/angular';

interface Recinto {
  id: number;
  nombre: string;
  direccion?: string;
}

@Component({
  selector: 'app-coordinadores',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    IonHeader,
    IonToolbar,
    IonTitle,
    IonContent,
    IonCard,
    IonCardHeader,
    IonCardTitle,
    IonCardContent,
    IonItem,
    IonLabel,
    IonInput,
    IonSelect,
    IonSelectOption,
    IonButton,
    IonSpinner,
    IonText
  ],
  templateUrl: './coordinadores.page.html'
})
export class CoordinadoresPage implements OnInit {

  recintos: Recinto[] = [];

  cargando = false;
  guardando = false;

  mensaje = '';
  tipoMensaje: 'success' | 'danger' = 'success';

  coordinador = {
    nombres: '',
    apellidos: '',
    cedula: '',
    email: '',
    telefono: '',
    recinto_id: null as number | null
  };

  constructor(
    private supabaseService: SupabaseService,
    private alertController: AlertController
  ) { }

  ngOnInit() {
    this.cargarRecintos();
  }

  async cargarRecintos() {
    this.cargando = true;
    this.mensaje = '';

    try {
      const { data, error } =
        await this.supabaseService.client
          .from('recintos')
          .select('id, nombre, direccion')
          .eq('activo', true)
          .order('nombre');

      if (error) throw error;

      this.recintos = data ?? [];

    } catch (error: any) {
      console.error('Error cargando recintos:', error);
      this.mostrarMensaje(
        'No se pudieron cargar los recintos. Verifica los permisos.',
        'danger'
      );
    } finally {
      this.cargando = false;
    }
  }

  async crearCoordinador() {
    this.mensaje = '';

    if (
      !this.coordinador.nombres.trim() ||
      !this.coordinador.apellidos.trim() ||
      !this.coordinador.cedula.trim() ||
      !this.coordinador.email.trim() ||
      !this.coordinador.recinto_id
    ) {
      this.mostrarMensaje(
        'Completa todos los campos obligatorios.',
        'danger'
      );
      return;
    }

    this.guardando = true;

    try {
      const { data, error } =
        await this.supabaseService.client.functions.invoke(
          'crear-coordinador',
          {
            body: {
              nombres: this.coordinador.nombres,
              apellidos: this.coordinador.apellidos,
              cedula: this.coordinador.cedula,
              email: this.coordinador.email,
              telefono: this.coordinador.telefono,
              recinto_id: this.coordinador.recinto_id
            }
          }
        );

      if (error) {
        let mensaje = error.message;

        try {
          const respuesta = await error.context.json();

          mensaje = [
            respuesta?.error,
            respuesta?.etapa,
            respuesta?.detalle
          ].filter(Boolean).join('\n');
        } catch {
          mensaje = error.message;
        }

        throw new Error(mensaje);
      }

      if (!data) {
        throw new Error('El servidor no devolvió una respuesta.');
      }

      this.mostrarMensaje(
        data?.mensaje || 'Coordinador registrado correctamente.',
        'success'
      );

      this.limpiarFormulario();

    } catch (error: any) {
      console.error('Error creando coordinador:', error);

      const mensaje =
        error?.message ||
        'Ocurrió un error inesperado al registrar el coordinador.';

      await this.mostrarAlerta(
        'No se pudo registrar',
        mensaje
      );
    } finally {
      this.guardando = false;
    }
  }

  limpiarFormulario() {
    this.coordinador = {
      nombres: '',
      apellidos: '',
      cedula: '',
      email: '',
      telefono: '',
      recinto_id: null
    };
  }

  mostrarMensaje(
    mensaje: string,
    tipo: 'success' | 'danger'
  ) {
    this.mensaje = mensaje;
    this.tipoMensaje = tipo;
  }

  async mostrarAlerta(
    titulo: string,
    mensaje: string
  ) {
    const alert = await this.alertController.create({
      header: titulo,
      message: mensaje,
      buttons: ['Aceptar']
    });

    await alert.present();
  }
}
