import { CommonModule } from '@angular/common';
import { Component, OnInit, inject } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import {
  IonBadge,
  IonButton,
  IonCard,
  IonCardContent,
  IonCardHeader,
  IonCardTitle,
  IonContent,
  IonHeader,
  IonSpinner,
  IonText,
  IonTitle,
  IonToolbar,
} from '@ionic/angular';
import { AuthService } from '../../../core/services/auth.service';
import {
  DashboardService,
  type DashboardElectoral,
  type RecintoResumen,
} from '../../../core/services/dashboard.service';
import { VeedoresService } from '../../../core/services/veedores.services';

@Component({
  selector: 'app-dashboard-recinto',
  standalone: true,
  imports: [
    CommonModule,
    RouterLink,
    IonBadge,
    IonButton,
    IonCard,
    IonCardContent,
    IonCardHeader,
    IonCardTitle,
    IonContent,
    IonHeader,
    IonSpinner,
    IonText,
    IonTitle,
    IonToolbar,
  ],
  template: `
    <ion-header
      ><ion-toolbar color="primary"
        ><ion-title>Panel del recinto</ion-title
        ><ion-button slot="end" fill="clear" color="light" (click)="cerrarSesion()">Salir</ion-button></ion-toolbar
      ></ion-header
    >
    <ion-content class="ion-padding"
      ><main class="dashboard-shell">
        <p class="eyebrow">COORDINACIÓN DE RECINTO</p>
        <div class="heading">
          <div>
            <h1>{{ recinto?.nombre || 'Mi recinto' }}</h1>
            <p>Estado de mesas y recepción de actas.</p>
          </div>
          <ion-button fill="outline" (click)="cargar()" [disabled]="cargando">Actualizar</ion-button>
        </div>
        <div class="quick-links">
          <ion-button routerLink="/recinto/jrv">Ver mesas</ion-button
          ><ion-button routerLink="/recinto/veedores" fill="outline">Gestionar veedores</ion-button>
        </div>
        @if (cargando) {
          <div class="loading"><ion-spinner name="crescent" /> Cargando información…</div>
        }
        @if (mensajeError) {
          <ion-card color="danger"
            ><ion-card-content
              ><ion-text color="light">{{ mensajeError }}</ion-text></ion-card-content
            ></ion-card
          >
        }
        @if (dashboard && recinto && !cargando) {
          <div class="stats-grid">
            <ion-card
              ><ion-card-content
                ><span>Mesas</span><strong>{{ recinto.jrv_total }}</strong></ion-card-content
              ></ion-card
            >
            <ion-card
              ><ion-card-content
                ><span>Actas recibidas</span><strong>{{ dashboard.resumen.actas }}</strong></ion-card-content
              ></ion-card
            >
            <ion-card
              ><ion-card-content
                ><span>Alcaldía</span
                ><strong>{{ dashboard.resumen.actas_alcaldia ?? 0 }}/{{ recinto.jrv_total }}</strong></ion-card-content
              ></ion-card
            >
            <ion-card
              ><ion-card-content
                ><span>Prefectura</span
                ><strong
                  >{{ dashboard.resumen.actas_prefectura ?? 0 }}/{{ recinto.jrv_total }}</strong
                ></ion-card-content
              ></ion-card
            >
          </div>
          <ion-card
            ><ion-card-header><ion-card-title>Estado de las JRV</ion-card-title></ion-card-header
            ><ion-card-content>
              @for (jrv of recinto.jrvs; track jrv.id) {
                <section class="jrv-block">
                  <div class="jrv-head">
                    <div>
                      <h2>JRV {{ jrv.numero }}</h2>
                      <ion-badge [color]="colorEstado(jrv.estado)">{{ textoEstado(jrv.estado) }}</ion-badge>
                    </div>
                    <span class="done"
                      >{{ (jrv.actas.alcaldia ? 1 : 0) + (jrv.actas.prefectura ? 1 : 0) }}/2 actas</span
                    >
                  </div>
                  <div class="acta-status">
                    <span
                      >Alcaldía
                      <ion-badge [color]="jrv.actas.alcaldia ? 'success' : 'light'">{{
                        jrv.actas.alcaldia ? 'Recibida' : 'Pendiente'
                      }}</ion-badge></span
                    ><span
                      >Prefectura
                      <ion-badge [color]="jrv.actas.prefectura ? 'success' : 'light'">{{
                        jrv.actas.prefectura ? 'Recibida' : 'Pendiente'
                      }}</ion-badge></span
                    >
                  </div>
                  @if (jrv.actas.alcaldia || jrv.actas.prefectura) {
                    <ion-button
                      size="small"
                      fill="clear"
                      [routerLink]="['/recinto/actas/detalle']"
                      [queryParams]="{ jrvId: jrv.id }"
                      >Revisar y corregir actas</ion-button
                    >
                  }
                </section>
              } @empty {
                <p class="empty">No hay mesas precargadas en este recinto.</p>
              }
            </ion-card-content></ion-card
          >
          <ion-card
            ><ion-card-header><ion-card-title>Ubicación de actas</ion-card-title></ion-card-header
            ><ion-card-content>
              @for (jrv of recinto.jrvs; track jrv.id) {
                @for (acta of [jrv.actas.alcaldia, jrv.actas.prefectura]; track acta?.id) {
                  @if (acta) {
                    <div class="gps-row">
                      <span>JRV {{ jrv.numero }} · {{ acta.dignidad === 'alcaldia' ? 'Alcaldía' : 'Prefectura' }}</span
                      ><small>{{
                        acta.latitud != null && acta.longitud != null
                          ? acta.latitud + ', ' + acta.longitud
                          : 'GPS no registrado'
                      }}</small>
                    </div>
                  }
                }
              } @empty {
                <p class="empty">Las coordenadas aparecerán al recibir actas.</p>
              }
            </ion-card-content></ion-card
          >
        }
      </main></ion-content
    >
  `,
  styles: [
    `
      .dashboard-shell {
        max-width: 900px;
        margin: 0 auto;
        padding-bottom: 32px;
      }
      .eyebrow {
        color: var(--ion-color-primary);
        font-size: 11px;
        font-weight: 800;
        letter-spacing: 0.12em;
        margin: 10px 0;
      }
      .heading {
        display: flex;
        justify-content: space-between;
        align-items: center;
        gap: 12px;
      }
      h1 {
        font-size: 27px;
        font-weight: 800;
        margin: 0;
      }
      .heading p {
        color: var(--ion-color-medium);
        margin: 6px 0;
      }
      .quick-links {
        display: flex;
        gap: 10px;
        flex-wrap: wrap;
        margin: 16px 0;
      }
      ion-card {
        border-radius: 18px;
        box-shadow: 0 4px 18px #172b4d0b;
        margin: 12px 0;
      }
      ion-card-title {
        font-size: 17px;
      }
      .stats-grid {
        display: grid;
        grid-template-columns: repeat(2, minmax(0, 1fr));
        gap: 2px;
      }
      .stats-grid ion-card {
        margin: 5px 0;
      }
      .stats-grid ion-card-content {
        display: flex;
        flex-direction: column;
        gap: 6px;
      }
      .stats-grid span {
        color: var(--ion-color-medium);
        font-size: 12px;
      }
      .stats-grid strong {
        font-size: 23px;
      }
      .jrv-block {
        padding: 12px 0;
        border-bottom: 1px solid #edf0f5;
      }
      .jrv-head {
        display: flex;
        align-items: center;
        justify-content: space-between;
      }
      h2 {
        font-size: 15px;
        margin: 0 0 7px;
      }
      .done {
        font-size: 12px;
        color: var(--ion-color-medium);
      }
      .acta-status {
        display: grid;
        grid-template-columns: 1fr 1fr;
        gap: 8px;
        margin: 8px 0;
      }
      .acta-status span {
        display: flex;
        flex-direction: column;
        gap: 5px;
        font-size: 12px;
        color: var(--ion-color-medium);
      }
      .gps-row {
        display: flex;
        flex-direction: column;
        gap: 4px;
        padding: 11px 0;
        border-bottom: 1px solid #edf0f5;
        font-size: 13px;
      }
      .gps-row small {
        color: var(--ion-color-medium);
      }
      .loading {
        display: flex;
        justify-content: center;
        gap: 10px;
        padding: 28px;
      }
      .empty {
        text-align: center;
        color: var(--ion-color-medium);
        padding: 12px;
      }
      @media (min-width: 700px) {
        .stats-grid {
          grid-template-columns: repeat(4, minmax(0, 1fr));
        }
      }
    `,
  ],
})
export class DashboardPage implements OnInit {
  private readonly dashboardService = inject(DashboardService);
  private readonly veedoresService = inject(VeedoresService);
  private readonly authService = inject(AuthService);
  private readonly router = inject(Router);
  dashboard: DashboardElectoral | null = null;
  recinto: RecintoResumen | null = null;
  cargando = false;
  mensajeError = '';

  ngOnInit(): void {
    void this.cargar();
  }

  async cargar(): Promise<void> {
    this.cargando = true;
    this.mensajeError = '';
    try {
      const recintoId = await this.veedoresService.obtenerMiRecinto();
      this.dashboard = await this.dashboardService.obtener({ recinto_id: recintoId });
      this.recinto = this.dashboard.recintos[0] ?? null;
    } catch (error) {
      this.mensajeError = error instanceof Error ? error.message : 'No se pudo cargar el recinto.';
    } finally {
      this.cargando = false;
    }
  }

  textoEstado(value: string): string {
    return (
      (
        { pendiente: 'Pendiente', asignada: 'Asignada', procesada: 'Procesada', cerrada: 'Cerrada' } as Record<
          string,
          string
        >
      )[value] ?? value
    );
  }
  colorEstado(value: string): string {
    return value === 'procesada'
      ? 'success'
      : value === 'asignada'
        ? 'warning'
        : value === 'cerrada'
          ? 'medium'
          : 'primary';
  }
  async cerrarSesion(): Promise<void> {
    await this.authService.cerrarSesion();
    await this.router.navigateByUrl('/login', { replaceUrl: true });
  }
}
