import { Component, inject, type OnInit } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import {
  IonHeader,
  IonToolbar,
  IonTitle,
  IonContent,
  IonButton,
  IonCard,
  IonCardHeader,
  IonCardTitle,
  IonCardContent,
  IonBadge,
  IonSpinner,
  IonText,
} from '@ionic/angular';

import type { Asignacion } from '../../../core/models/asignacion.model';
import type { EstadoJrv } from '../../../core/models/jrv.model';
import { AsignacionesService } from '../../../core/services/asignaciones';
import { AuthService } from '../../../core/services/auth.service';

@Component({
  selector: 'app-mesas',
  standalone: true,
  imports: [
    IonHeader,
    IonToolbar,
    IonTitle,
    IonContent,
    IonButton,
    IonCard,
    IonCardHeader,
    IonCardTitle,
    IonCardContent,
    IonBadge,
    IonSpinner,
    IonText,
    RouterLink,
  ],
  template: `
    <ion-header>
      <ion-toolbar>
        <ion-title>Mis mesas asignadas</ion-title>
        <ion-button slot="end" fill="clear" (click)="cerrarSesion()">Salir</ion-button>
      </ion-toolbar>
    </ion-header>

    <ion-content class="ion-padding">
      <h1>Mis JRV asignadas</h1>
      <p>Consulta las juntas receptoras del voto asignadas a tu cuenta.</p>

      <ion-button routerLink="/veedor/actas/pendientes" fill="outline">Actas pendientes de sincronizar</ion-button>
      <ion-button fill="outline" (click)="cargarAsignaciones()" [disabled]="cargando"> Actualizar </ion-button>

      @if (cargando) {
        <div class="ion-text-center ion-padding" role="status">
          <ion-spinner name="crescent"></ion-spinner>
          <p>Cargando tus mesas asignadas...</p>
        </div>
      }

      @if (mensajeError) {
        <ion-card color="danger">
          <ion-card-content>
            <ion-text color="light">{{ mensajeError }}</ion-text>
            <ion-button color="light" fill="outline" (click)="cargarAsignaciones()"> Reintentar </ion-button>
          </ion-card-content>
        </ion-card>
      } @else if (!cargando && asignaciones.length === 0) {
        <ion-card>
          <ion-card-content> Aún no tienes mesas asignadas. Contacta al coordinador de tu recinto. </ion-card-content>
        </ion-card>
      }

      @for (asignacion of asignaciones; track asignacion.id) {
        <ion-card>
          <ion-card-header>
            <ion-card-title> JRV {{ asignacion.jrv?.numero ?? asignacion.jrv_id }} </ion-card-title>
          </ion-card-header>
          <ion-card-content>
            <p><strong>Recinto:</strong> {{ asignacion.recintos?.nombre || 'No disponible' }}</p>
            <p><strong>Código:</strong> {{ asignacion.jrv?.codigo || 'No registrado' }}</p>
            <p>
              <strong>Estado:</strong>
              <ion-badge [color]="obtenerColorEstado(asignacion.jrv?.estado)">
                {{ obtenerTextoEstado(asignacion.jrv?.estado) }}
              </ion-badge>
            </p>
            <div class="mesa-actions">
              <ion-button [routerLink]="['/veedor/actas/registrar']" [queryParams]="{ jrvId: asignacion.jrv_id }">
                Registrar acta
              </ion-button>
              <ion-button
                fill="outline"
                [routerLink]="['/veedor/actas/detalle']"
                [queryParams]="{ jrvId: asignacion.jrv_id }"
              >
                Ver actas
              </ion-button>
            </div>
          </ion-card-content>
        </ion-card>
      }
    </ion-content>
  `,
  styles: [
    `
      ion-content {
        --background: #f4f7fb;
      }
      h1 {
        margin: 8px 0;
        font-size: 27px;
        font-weight: 800;
        color: #172b4d;
      }
      ion-content > p {
        color: var(--ion-color-medium);
      }
      ion-card {
        border-radius: 18px;
        box-shadow: 0 4px 18px #172b4d0b;
      }
      .mesa-actions {
        display: flex;
        flex-wrap: wrap;
        gap: 8px;
        margin-top: 14px;
      }
      @media (min-width: 760px) {
        ion-content {
          --padding-start: max(24px, calc((100vw - 760px) / 2));
          --padding-end: max(24px, calc((100vw - 760px) / 2));
        }
      }
    `,
  ],
})
export class MesasPage implements OnInit {
  private readonly asignacionesService = inject(AsignacionesService);
  private readonly authService = inject(AuthService);
  private readonly router = inject(Router);

  asignaciones: Asignacion[] = [];
  cargando = false;
  mensajeError = '';

  ngOnInit(): void {
    void this.cargarAsignaciones();
  }

  async cargarAsignaciones(): Promise<void> {
    this.cargando = true;
    this.mensajeError = '';

    try {
      const resultado = await this.asignacionesService.obtenerMisAsignaciones();
      this.asignaciones = resultado.filter(
        (asignacion) =>
          asignacion.tipo_asignacion === 'veedor' && asignacion.jrv_id !== null && asignacion.jrv_id !== undefined,
      );
    } catch (error: unknown) {
      console.error('Error al cargar las mesas asignadas:', error);
      this.mensajeError = this.obtenerMensajeError(error);
      this.asignaciones = [];
    } finally {
      this.cargando = false;
    }
  }

  private obtenerMensajeError(error: unknown): string {
    if (typeof error === 'object' && error !== null && 'message' in error && typeof error.message === 'string') {
      return error.message;
    }

    return 'No se pudieron cargar tus mesas asignadas. Inténtalo nuevamente.';
  }

  obtenerTextoEstado(estado?: EstadoJrv): string {
    switch (estado) {
      case 'asignada':
        return 'Asignada';
      case 'procesada':
        return 'Procesada';
      case 'cerrada':
        return 'Cerrada';
      case 'pendiente':
        return 'Pendiente';
      default:
        return 'No disponible';
    }
  }

  obtenerColorEstado(estado?: EstadoJrv): string {
    switch (estado) {
      case 'asignada':
        return 'warning';
      case 'procesada':
        return 'success';
      case 'cerrada':
        return 'medium';
      case 'pendiente':
        return 'primary';
      default:
        return 'medium';
    }
  }

  async cerrarSesion(): Promise<void> {
    await this.authService.cerrarSesion();
    await this.router.navigateByUrl('/login', { replaceUrl: true });
  }
}
