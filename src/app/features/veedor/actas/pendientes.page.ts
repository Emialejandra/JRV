import { CommonModule } from '@angular/common';
import { Component, OnInit, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import {
  IonBackButton,
  IonButton,
  IonButtons,
  IonCard,
  IonCardContent,
  IonContent,
  IonHeader,
  IonSpinner,
  IonText,
  IonTitle,
  IonToolbar,
} from '@ionic/angular';
import { ActasPendientesService, type ActaPendiente } from '../../../core/services/actas-pendientes.service';

@Component({
  standalone: true,
  imports: [
    CommonModule,
    RouterLink,
    IonBackButton,
    IonButton,
    IonButtons,
    IonCard,
    IonCardContent,
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
        ><ion-buttons slot="start"><ion-back-button defaultHref="/veedor/mesas" /></ion-buttons
        ><ion-title>Sincronización</ion-title></ion-toolbar
      ></ion-header
    >
    <ion-content class="ion-padding"
      ><main>
        <p class="eyebrow">TRABAJO SIN CONEXIÓN</p>
        <h1>Actas pendientes</h1>
        <p class="intro">
          Los registros guardados sin conexión se enviarán al recuperar internet. Cada envío usa un identificador único
          para evitar duplicados.
        </p>
        <ion-button
          expand="block"
          (click)="sincronizar()"
          [disabled]="sincronizando || pendientes.length === 0 || !enLinea"
        >
          @if (sincronizando) {
            <ion-spinner name="crescent" />
          } @else {
            Sincronizar ahora
          }
        </ion-button>
        @if (!enLinea) {
          <ion-card color="warning"
            ><ion-card-content
              >Sin conexión. Los registros permanecen guardados en este dispositivo.</ion-card-content
            ></ion-card
          >
        }
        @if (mensaje) {
          <ion-card
            ><ion-card-content>{{ mensaje }}</ion-card-content></ion-card
          >
        }
        @if (error) {
          <ion-card color="danger"
            ><ion-card-content
              ><ion-text color="light">{{ error }}</ion-text></ion-card-content
            ></ion-card
          >
        }
        @for (acta of pendientes; track acta.client_id) {
          <ion-card
            ><ion-card-content class="item">
              <div>
                <strong
                  >JRV {{ acta.data.jrv_id }} ·
                  {{ acta.data.dignidad === 'alcaldia' ? 'Alcaldía' : 'Prefectura' }}</strong
                >
                <p>{{ acta.creada_en | date: 'short' }}</p>
                <small>{{ acta.ultimo_error || 'Pendiente de envío' }}</small>
              </div>
              <ion-button fill="clear" color="danger" (click)="eliminar(acta.client_id)">Eliminar</ion-button>
            </ion-card-content></ion-card
          >
        } @empty {
          @if (!cargando) {
            <ion-card
              ><ion-card-content
                >No tienes actas pendientes. <a routerLink="/veedor/mesas">Volver a mis mesas</a></ion-card-content
              ></ion-card
            >
          }
        }
      </main></ion-content
    >
  `,
  styles: [
    `
      main {
        max-width: 680px;
        margin: 0 auto;
        padding-bottom: 30px;
      }
      .eyebrow {
        color: var(--ion-color-primary);
        font-size: 11px;
        font-weight: 800;
        letter-spacing: 0.12em;
        margin: 10px 0;
      }
      h1 {
        font-size: 28px;
        font-weight: 800;
        margin: 0;
      }
      .intro {
        line-height: 1.5;
        color: var(--ion-color-medium);
      }
      ion-card {
        border-radius: 16px;
        box-shadow: 0 4px 18px #172b4d0b;
      }
      .item {
        display: flex;
        justify-content: space-between;
        align-items: center;
        gap: 10px;
      }
      .item p,
      .item small {
        display: block;
        color: var(--ion-color-medium);
        margin: 5px 0;
        font-size: 12px;
      }
    `,
  ],
})
export class ActasPendientesPage implements OnInit {
  private readonly store = inject(ActasPendientesService);
  pendientes: ActaPendiente[] = [];
  cargando = true;
  sincronizando = false;
  enLinea = navigator.onLine;
  mensaje = '';
  error = '';

  ngOnInit(): void {
    window.addEventListener('online', this.actualizarConexion);
    window.addEventListener('offline', this.actualizarConexion);
    void this.cargar();
  }

  ngOnDestroy(): void {
    window.removeEventListener('online', this.actualizarConexion);
    window.removeEventListener('offline', this.actualizarConexion);
  }

  private readonly actualizarConexion = (): void => {
    this.enLinea = navigator.onLine;
    void this.cargar();
  };

  async cargar(): Promise<void> {
    this.cargando = true;
    try {
      this.pendientes = await this.store.listar();
    } catch (error) {
      this.error = error instanceof Error ? error.message : 'No se pudo leer el almacenamiento local.';
    } finally {
      this.cargando = false;
    }
  }

  async sincronizar(): Promise<void> {
    this.sincronizando = true;
    this.error = '';
    this.mensaje = '';
    try {
      const result = await this.store.sincronizar();
      this.mensaje = `${result.sincronizadas} actas sincronizadas · ${result.pendientes} pendientes.`;
      await this.cargar();
    } catch (error) {
      this.error = error instanceof Error ? error.message : 'No se pudo sincronizar el lote.';
    } finally {
      this.sincronizando = false;
    }
  }

  async eliminar(clientId: string): Promise<void> {
    await this.store.eliminar(clientId);
    await this.cargar();
  }
}
