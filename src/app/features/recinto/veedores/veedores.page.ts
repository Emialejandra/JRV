import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

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
  IonList,
  IonBadge,
  IonSpinner,
  IonNote
} from '@ionic/angular';

import {
  VeedoresService,
  DatosNuevoVeedor,
  VeedorListado
} from '../../../core/services/veedores.services';

interface JrvDisponible {
  id: number;
  numero: number;
  codigo?: string | null;
}

@Component({
  selector: 'app-veedores',
  standalone: true,
  templateUrl: './veedores.page.html',
  styleUrls: ['./veedores.page.scss'],
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
    IonList,
    IonBadge,
    IonSpinner,
    IonNote
  ]
})
export class VeedoresPage implements OnInit {

  jrvDisponibles: JrvDisponible[] = [];
  veedores: VeedorListado[] = [];

  cargando = false;
  guardando = false;
  mensajeError = '';

  cambiosJrv: Record<number, number | null> = {};

  nuevoVeedor: DatosNuevoVeedor = {
    nombres: '',
    apellidos: '',
    cedula: '',
    email: '',
    telefono: '',
    jrv_id: null as any
  };

  constructor(
    private veedoresService: VeedoresService
  ) { }

  ngOnInit(): void {
    this.cargarDatos();
  }

  async cargarDatos(): Promise<void> {
    this.cargando = true;
    this.mensajeError = '';

    try {
      const [jrv, veedores] = await Promise.all([
        this.veedoresService.obtenerMisJrv(),
        this.veedoresService.obtenerMisVeedores()
      ]);

      this.jrvDisponibles = jrv;
      this.veedores = veedores;

      this.cambiosJrv = {};

      for (const veedor of veedores) {
        this.cambiosJrv[veedor.asignacion_id] = null;
      }

    } catch (error) {
      console.error('Error al cargar gestión de veedores:', error);

      this.mensajeError =
        error instanceof Error
          ? error.message
          : 'No se pudo cargar la información.';
    } finally {
      this.cargando = false;
    }
  }

  async registrarVeedor(): Promise<void> {
    const jrvId = Number(this.nuevoVeedor.jrv_id);

    console.log('DATOS DEL FORMULARIO:', this.nuevoVeedor);
    console.log('JRV SELECCIONADA:', this.nuevoVeedor.jrv_id);
    console.log('JRV CONVERTIDA:', jrvId);

    if (
      !this.nuevoVeedor.nombres?.trim() ||
      !this.nuevoVeedor.apellidos?.trim() ||
      !this.nuevoVeedor.cedula?.trim() ||
      !this.nuevoVeedor.email?.trim() ||
      !this.nuevoVeedor.telefono?.trim() ||
      !Number.isInteger(jrvId) ||
      jrvId <= 0
    ) {
      alert('Complete todos los campos y seleccione una JRV.');
      return;
    }

    this.guardando = true;
    this.mensajeError = '';

    try {
      await this.veedoresService.crearVeedor({
        ...this.nuevoVeedor,
        nombres: this.nuevoVeedor.nombres.trim(),
        apellidos: this.nuevoVeedor.apellidos.trim(),
        cedula: this.nuevoVeedor.cedula.trim(),
        email: this.nuevoVeedor.email.trim().toLowerCase(),
        telefono: this.nuevoVeedor.telefono.trim(),
        jrv_id: jrvId
      });

      alert('Veedor registrado y asignado correctamente.');

      this.nuevoVeedor = {
        nombres: '',
        apellidos: '',
        cedula: '',
        email: '',
        telefono: '',
        jrv_id: null as any
      };

      await this.cargarDatos();

    } catch (error) {
      console.error('Error al registrar veedor:', error);

      const mensaje =
        error instanceof Error
          ? error.message
          : 'No se pudo registrar el veedor.';

      alert(mensaje);

    } finally {
      this.guardando = false;
    }
  }

  async reasignar(veedor: VeedorListado): Promise<void> {
    const nuevaJrvId = this.cambiosJrv[veedor.asignacion_id];

    if (!nuevaJrvId) {
      alert('Seleccione la nueva JRV.');
      return;
    }

    if (!confirm(
      `¿Desea reasignar a ${veedor.nombres} ${veedor.apellidos} a otra JRV?`
    )) {
      return;
    }

    this.guardando = true;

    try {
      await this.veedoresService.reasignarVeedor(
        veedor.asignacion_id,
        Number(nuevaJrvId)
      );

      alert('La asignación se actualizó correctamente.');

      await this.cargarDatos();

    } catch (error) {
      console.error('Error al reasignar veedor:', error);

      alert(
        error instanceof Error
          ? error.message
          : 'No se pudo reasignar el veedor.'
      );

    } finally {
      this.guardando = false;
    }
  }

  async desactivar(veedor: VeedorListado): Promise<void> {
    if (!confirm(
      `¿Desea desactivar la asignación de ${veedor.nombres} ${veedor.apellidos}?`
    )) {
      return;
    }

    this.guardando = true;

    try {
      await this.veedoresService.desactivarAsignacionVeedor(
        veedor.asignacion_id
      );

      alert('La asignación fue desactivada.');

      await this.cargarDatos();

    } catch (error) {
      console.error('Error al desactivar asignación:', error);

      alert(
        error instanceof Error
          ? error.message
          : 'No se pudo desactivar la asignación.'
      );

    } finally {
      this.guardando = false;
    }
  }
}