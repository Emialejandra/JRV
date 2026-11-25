import { CommonModule } from '@angular/common';
import { Component, OnInit, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
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
  IonItem,
  IonLabel,
  IonSelect,
  IonSelectOption,
  IonSpinner,
  IonTitle,
  IonToolbar,
} from '@ionic/angular';
import {
  DashboardService,
  type DashboardElectoral,
  type RecintoResumen,
} from '../../../core/services/dashboard.service';
import { AuthService } from '../../../core/services/auth.service';
import { PerfilesService } from '../../../core/services/perfiles.service';

@Component({
  selector: 'app-dashboard-provincial',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    RouterLink,
    IonBadge,
    IonButton,
    IonCard,
    IonCardContent,
    IonCardHeader,
    IonCardTitle,
    IonContent,
    IonHeader,
    IonItem,
    IonLabel,
    IonSelect,
    IonSelectOption,
    IonSpinner,
    IonTitle,
    IonToolbar,
  ],
  template: `
    <ion-header
      ><ion-toolbar color="primary">
        <ion-title>Centro de control</ion-title>
        <ion-button slot="end" fill="clear" color="light" (click)="cerrarSesion()">Salir</ion-button>
      </ion-toolbar></ion-header
    >
    <ion-content class="ion-padding">
      <main class="dashboard-shell">
        <p class="eyebrow">ESCRUTINIO · ÁMBITO PROVINCIAL</p>
        <div class="heading">
          <div>
            <h1>Avance electoral</h1>
            <p>Seguimiento de actas y resultados en tiempo real.</p>
          </div>
          <ion-button fill="outline" (click)="cargar()" [disabled]="cargando">Actualizar</ion-button>
        </div>

        <div class="quick-links">
          <ion-button routerLink="/provincial/recintos">Gestionar recintos</ion-button>
          <ion-button routerLink="/provincial/coordinadores" fill="outline">Coordinadores</ion-button>
          @if (esAdministrador) {
            <ion-button routerLink="/provincial/precarga" fill="outline">Precarga inicial</ion-button>
          }
        </div>

        @if (cargando) {
          <div class="loading"><ion-spinner name="crescent" /><span>Actualizando el escrutinio…</span></div>
        }
        @if (mensajeError) {
          <ion-card color="danger"
            ><ion-card-content>{{ mensajeError }}</ion-card-content></ion-card
          >
        }

        @if (dashboard && !cargando) {
          <div class="stats-grid">
            <ion-card
              ><ion-card-content
                ><span>Recintos</span><strong>{{ dashboard.resumen.recintos }}</strong></ion-card-content
              ></ion-card
            >
            <ion-card
              ><ion-card-content
                ><span>JRV habilitadas</span><strong>{{ dashboard.resumen.jrv_total }}</strong></ion-card-content
              ></ion-card
            >
            <ion-card
              ><ion-card-content
                ><span>Actas recibidas</span><strong>{{ dashboard.resumen.actas }}</strong></ion-card-content
              ></ion-card
            >
            <ion-card
              ><ion-card-content
                ><span>Actas con GPS</span><strong>{{ dashboard.resumen.actas_con_gps ?? 0 }}</strong></ion-card-content
              ></ion-card
            >
          </div>

          <ion-card class="filter-card"
            ><ion-item>
              <ion-label position="stacked">Filtrar por recinto</ion-label>
              <ion-select
                [(ngModel)]="recintoId"
                (ionChange)="cambiarRecinto()"
                placeholder="Todos los recintos"
                interface="action-sheet"
                [cancelText]="'Cerrar'"
              >
                <ion-select-option [value]="null">Todos los recintos</ion-select-option>
                @for (recinto of dashboard.recintos; track recinto.id) {
                  <ion-select-option [value]="recinto.id">{{ recinto.nombre }}</ion-select-option>
                }
              </ion-select>
            </ion-item></ion-card
          >

          <ion-card
            ><ion-card-header><ion-card-title>Avance por recinto</ion-card-title></ion-card-header
            ><ion-card-content>
              @for (recinto of dashboard.recintos; track recinto.id) {
                <section class="recinto-block">
                  <div class="recinto-title">
                    <div>
                      <h2>{{ recinto.nombre }}</h2>
                      <p>{{ recinto.jrv_total }} mesas · {{ contarActas(recinto) }} actas</p>
                    </div>
                    <ion-badge color="primary">{{ porcentaje(recinto) }}%</ion-badge>
                  </div>
                  <div class="progress-track"><span [style.width.%]="porcentaje(recinto)"></span></div>
                  <div class="dignities">
                    <span
                      >Alcaldía <b>{{ contarDignidad(recinto, 'alcaldia') }}/{{ recinto.jrv_total }}</b></span
                    ><span
                      >Prefectura <b>{{ contarDignidad(recinto, 'prefectura') }}/{{ recinto.jrv_total }}</b></span
                    >
                  </div>
                  @if (recinto.jrvs.length) {
                    <div class="jrv-list">
                      @for (jrv of recinto.jrvs; track jrv.id) {
                        <div class="jrv-row">
                          <span>JRV {{ jrv.numero }}</span>
                          <div>
                            <ion-badge [color]="jrv.actas.alcaldia ? 'success' : 'light'">Alcaldía</ion-badge
                            ><ion-badge [color]="jrv.actas.prefectura ? 'success' : 'light'">Prefectura</ion-badge
                            ><ion-button
                              size="small"
                              fill="clear"
                              [routerLink]="['/provincial/actas/detalle']"
                              [queryParams]="{ jrvId: jrv.id }"
                              >Detalle</ion-button
                            >
                          </div>
                        </div>
                      }
                    </div>
                  }
                </section>
              } @empty {
                <p class="empty">No hay recintos dentro de tu ámbito.</p>
              }
            </ion-card-content></ion-card
          >

          <ion-card
            ><ion-card-header><ion-card-title>Votos por candidatura</ion-card-title></ion-card-header
            ><ion-card-content>
              <ion-item
                ><ion-label position="stacked">Dignidad</ion-label
                ><ion-select [(ngModel)]="dignidad" interface="action-sheet"
                  ><ion-select-option value="alcaldia">Alcaldía</ion-select-option
                  ><ion-select-option value="prefectura">Prefectura</ion-select-option></ion-select
                ></ion-item
              >
              @for (candidato of candidatosSeleccionados; track candidato.candidatura_id) {
                <div class="vote-row">
                  <div>
                    <b>{{ candidato.organizacion || 'Organización' }}</b><small
                      >{{ candidato.nombres }} {{ candidato.apellidos }}</small
                    >
                  </div>
                  <strong>{{ candidato.votos }}</strong>
                </div>
              } @empty {
                <p class="empty">Aún no hay votos registrados para esta dignidad.</p>
              }
            </ion-card-content></ion-card
          >
        }
      </main>
    </ion-content>
  `,
  styles: [
    `
      .dashboard-shell {
        max-width: 920px;
        margin: 0 auto;
        padding-bottom: 34px;
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
        gap: 14px;
      }
      h1 {
        font-size: 28px;
        margin: 0;
        font-weight: 800;
      }
      .heading p {
        color: var(--ion-color-medium);
        margin: 6px 0 0;
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
        font-size: 25px;
      }
      .recinto-block {
        padding: 12px 0 18px;
        border-bottom: 1px solid var(--ion-border-color);
      }
      .recinto-title {
        display: flex;
        justify-content: space-between;
        align-items: center;
      }
      h2 {
        margin: 0;
        font-size: 16px;
      }
      .recinto-title p {
        margin: 4px 0;
        color: var(--ion-color-medium);
        font-size: 12px;
      }
      .progress-track {
        height: 7px;
        background: #e8edf5;
        overflow: hidden;
        border-radius: 99px;
        margin: 8px 0;
      }
      .progress-track span {
        display: block;
        height: 100%;
        background: var(--ion-color-primary);
        border-radius: 99px;
      }
      .dignities {
        display: flex;
        justify-content: space-between;
        color: var(--ion-color-medium);
        font-size: 12px;
      }
      .dignities b {
        color: var(--ion-text-color);
      }
      .jrv-list {
        margin-top: 12px;
      }
      .jrv-row {
        display: flex;
        justify-content: space-between;
        padding: 8px 0;
        border-bottom: 1px solid #eef1f5;
        font-size: 13px;
      }
      .vote-row {
        display: flex;
        justify-content: space-between;
        align-items: center;
        padding: 12px 0;
        border-bottom: 1px solid #eef1f5;
      }
      .vote-row small {
        color: var(--ion-color-medium);
      }
      .vote-row strong {
        font-size: 20px;
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
  private readonly authService = inject(AuthService);
  private readonly perfilesService = inject(PerfilesService);
  private readonly router = inject(Router);
  dashboard: DashboardElectoral | null = null;
  recintoId: number | null = null;
  dignidad: 'alcaldia' | 'prefectura' = 'alcaldia';
  cargando = false;
  mensajeError = '';
  esAdministrador = false;

  get candidatosSeleccionados() {
    return this.dashboard?.votos_consolidados?.[this.dignidad]?.candidatos ?? [];
  }

  ngOnInit(): void {
    void this.cargar();
  }

  async cargar(): Promise<void> {
    this.cargando = true;
    this.mensajeError = '';
    try {
      this.esAdministrador = (await this.perfilesService.obtenerMiPerfil())?.rol === 'administrador';
      this.dashboard = await this.dashboardService.obtener(this.recintoId ? { recinto_id: this.recintoId } : {});
    } catch (error) {
      this.mensajeError = error instanceof Error ? error.message : 'No se pudo cargar el avance electoral.';
    } finally {
      this.cargando = false;
    }
  }

  cambiarRecinto(): void {
    void this.cargar();
  }
  contarActas(recinto: RecintoResumen): number {
    return recinto.jrvs.reduce((sum, jrv) => sum + Number(!!jrv.actas.alcaldia) + Number(!!jrv.actas.prefectura), 0);
  }
  contarDignidad(recinto: RecintoResumen, dignidad: 'alcaldia' | 'prefectura'): number {
    return recinto.jrvs.filter((jrv) => !!jrv.actas[dignidad]).length;
  }
  porcentaje(recinto: RecintoResumen): number {
    return recinto.jrv_total ? Math.round((this.contarActas(recinto) / (recinto.jrv_total * 2)) * 100) : 0;
  }

  async cerrarSesion(): Promise<void> {
    await this.authService.cerrarSesion();
    await this.router.navigateByUrl('/login', { replaceUrl: true });
  }
}
