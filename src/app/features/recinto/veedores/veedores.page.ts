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
  template: `
    <ion-header>
      <ion-toolbar>
        <ion-title>Gestión de veedores</ion-title>
      </ion-toolbar>
    </ion-header>

    <ion-content class="ion-padding">

      <ion-card>
        <ion-card-header>
          <ion-card-title>Registrar nuevo veedor</ion-card-title>
        </ion-card-header>

        <ion-card-content>
          <form (ngSubmit)="registrarVeedor()">

            <ion-item>
              <ion-label position="stacked">Nombres</ion-label>
              <ion-input
                name="nombres"
                [(ngModel)]="nuevoVeedor.nombres"
                placeholder="Ingrese los nombres"
                required
                maxlength="100">
              </ion-input>
            </ion-item>

            <ion-item>
              <ion-label position="stacked">Apellidos</ion-label>
              <ion-input
                name="apellidos"
                [(ngModel)]="nuevoVeedor.apellidos"
                placeholder="Ingrese los apellidos"
                required
                maxlength="100">
              </ion-input>
            </ion-item>

            <ion-item>
              <ion-label position="stacked">Cédula</ion-label>
              <ion-input
                name="cedula"
                [(ngModel)]="nuevoVeedor.cedula"
                placeholder="Número de cédula"
                type="text"
                inputmode="numeric"
                maxlength="10"
                required>
              </ion-input>
            </ion-item>

            <ion-item>
              <ion-label position="stacked">Correo electrónico</ion-label>
              <ion-input
                name="email"
                [(ngModel)]="nuevoVeedor.email"
                placeholder="correo@ejemplo.com"
                type="email"
                required>
              </ion-input>
            </ion-item>

            <ion-item>
              <ion-label position="stacked">Teléfono</ion-label>
              <ion-input
                name="telefono"
                [(ngModel)]="nuevoVeedor.telefono"
                placeholder="Número de teléfono"
                type="tel"
                maxlength="20"
                required>
              </ion-input>
            </ion-item>

            <ion-item>
              <ion-label position="stacked">Junta Receptora del Voto</ion-label>
              <ion-select
                name="jrv"
                [(ngModel)]="nuevoVeedor.jrv_id"
                placeholder="Seleccione una JRV"
                interface="action-sheet"
                required>

                <ion-select-option
                  *ngFor="let mesa of jrvDisponibles"
                  [value]="mesa.id">
                  JRV {{ mesa.numero }}
                  {{ mesa.codigo ? '- ' + mesa.codigo : '' }}
                </ion-select-option>

              </ion-select>
            </ion-item>

            <ion-button
              expand="block"
              type="submit"
              class="ion-margin-top"
              [disabled]="guardando || cargando">

              <ion-spinner
                *ngIf="guardando"
                name="crescent">
              </ion-spinner>

              <span *ngIf="!guardando">Registrar veedor</span>
            </ion-button>

          </form>
        </ion-card-content>
      </ion-card>

      <ion-card>
        <ion-card-header>
          <ion-card-title>Veedores registrados</ion-card-title>
        </ion-card-header>

        <ion-card-content>

          <div *ngIf="cargando" class="ion-text-center ion-padding">
            <ion-spinner name="crescent"></ion-spinner>
            <p>Cargando información...</p>
          </div>

          <ion-note color="danger" *ngIf="mensajeError">
            {{ mensajeError }}
          </ion-note>

          <ion-list *ngIf="!cargando && veedores.length > 0">

            <ion-item
              *ngFor="let veedor of veedores"
              lines="full">

              <ion-label class="ion-text-wrap">

                <h2>
                  <strong>
                    {{ veedor.nombres }} {{ veedor.apellidos }}
                  </strong>
                </h2>

                <p>Cédula: {{ veedor.cedula }}</p>
                <p>Correo: {{ veedor.email }}</p>
                <p>Teléfono: {{ veedor.telefono }}</p>

                <p>
                  JRV asignada:
                  <ion-badge color="primary">
                    {{ veedor.jrv_numero !== null
                      ? 'JRV ' + veedor.jrv_numero
                      : 'Sin JRV' }}
                  </ion-badge>
                </p>

                <ion-select
                  [name]="'jrv-' + veedor.asignacion_id"
                  [(ngModel)]="cambiosJrv[veedor.asignacion_id]"
                  placeholder="Seleccionar nueva JRV"
                  interface="action-sheet">

                  <ion-select-option
                    *ngFor="let mesa of jrvDisponibles"
                    [value]="mesa.id">
                    JRV {{ mesa.numero }}
                    {{ mesa.codigo ? '- ' + mesa.codigo : '' }}
                  </ion-select-option>

                </ion-select>

                <div class="ion-margin-top">
                  <ion-button
                    size="small"
                    color="primary"
                    [disabled]="guardando"
                    (click)="reasignar(veedor)">
                    Reasignar JRV
                  </ion-button>

                  <ion-button
                    size="small"
                    color="danger"
                    fill="outline"
                    [disabled]="guardando"
                    (click)="desactivar(veedor)">
                    Desactivar asignación
                  </ion-button>
                </div>

              </ion-label>
            </ion-item>

          </ion-list>

          <div
            *ngIf="!cargando && veedores.length === 0 && !mensajeError"
            class="ion-text-center ion-padding">
            <p>Aún no existen veedores asignados a este recinto.</p>
          </div>

          <ion-button
            expand="block"
            fill="outline"
            (click)="cargarDatos()"
            [disabled]="cargando || guardando">
            Actualizar listado
          </ion-button>

        </ion-card-content>
      </ion-card>

    </ion-content>
  `,
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
    jrv_id: 0
  };

  constructor(
    private veedoresService: VeedoresService
  ) {}

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
    if (
      !this.nuevoVeedor.nombres.trim() ||
      !this.nuevoVeedor.apellidos.trim() ||
      !this.nuevoVeedor.cedula.trim() ||
      !this.nuevoVeedor.email.trim() ||
      !this.nuevoVeedor.telefono.trim() ||
      !this.nuevoVeedor.jrv_id
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
        jrv_id: Number(this.nuevoVeedor.jrv_id)
      });

      alert('Veedor registrado y asignado correctamente.');

      this.nuevoVeedor = {
        nombres: '',
        apellidos: '',
        cedula: '',
        email: '',
        telefono: '',
        jrv_id: 0
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