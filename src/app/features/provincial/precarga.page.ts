import { CommonModule } from '@angular/common';
import { Component, OnInit, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import {
  IonBackButton,
  IonButton,
  IonButtons,
  IonCard,
  IonCardContent,
  IonCardHeader,
  IonCardTitle,
  IonContent,
  IonHeader,
  IonInput,
  IonItem,
  IonLabel,
  IonSelect,
  IonSelectOption,
  IonSpinner,
  IonTitle,
  IonToolbar,
} from '@ionic/angular';
import type { Canton } from '../../core/models/canton.model';
import type { Parroquia } from '../../core/models/parroquia.model';
import type { Provincia } from '../../core/models/provincia.model';
import { PerfilesService } from '../../core/services/perfiles.service';
import { PrecargaService } from '../../core/services/precarga.service';
import { TerritorioService } from '../../core/services/territorio.service';

interface OrganizacionInput {
  nombre: string;
  sigla: string;
  numero_lista: string;
}
interface CandidaturaInput {
  nombres: string;
  apellidos: string;
  numero_lista: string;
}
interface RecintoInput {
  parroquia_id: number | null;
  nombre: string;
  direccion: string;
  referencia: string;
  cantidad_jrv: number | null;
}

@Component({
  selector: 'app-precarga-electoral',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    IonBackButton,
    IonButton,
    IonButtons,
    IonCard,
    IonCardContent,
    IonCardHeader,
    IonCardTitle,
    IonContent,
    IonHeader,
    IonInput,
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
      ><ion-toolbar color="primary"
        ><ion-buttons slot="start"><ion-back-button defaultHref="/provincial/dashboard" /></ion-buttons
        ><ion-title>Datos iniciales</ion-title></ion-toolbar
      ></ion-header
    >
    <ion-content class="ion-padding"
      ><main class="page-shell">
        <p class="eyebrow">CONFIGURACIÓN ELECTORAL</p>
        <h1>Precarga inicial</h1>
        <p class="intro">
          Ingresa las organizaciones, candidaturas y recintos oficiales para el territorio elegido. La operación es
          idempotente.
        </p>
        @if (!esAdministrador && !cargando) {
          <ion-card color="warning"
            ><ion-card-content
              >Esta herramienta está disponible únicamente para administradores.</ion-card-content
            ></ion-card
          >
        }
        @if (esAdministrador) {
          <ion-card
            ><ion-card-header><ion-card-title>Territorio</ion-card-title></ion-card-header
            ><ion-card-content>
              <ion-item
                ><ion-label position="stacked">Provincia</ion-label
                ><ion-select
                  [(ngModel)]="provinciaId"
                  (ionChange)="cambioProvincia()"
                  interface="action-sheet"
                  placeholder="Selecciona una provincia"
                >
                  @for (provincia of provincias; track provincia.id) {
                    <ion-select-option [value]="provincia.id">{{ provincia.nombre }}</ion-select-option>
                  }
                </ion-select></ion-item
              >
              <ion-item
                ><ion-label position="stacked">Cantón</ion-label
                ><ion-select
                  [(ngModel)]="cantonId"
                  (ionChange)="cambioCanton()"
                  interface="action-sheet"
                  placeholder="Selecciona un cantón"
                  [disabled]="!provinciaId"
                >
                  @for (canton of cantones; track canton.id) {
                    <ion-select-option [value]="canton.id">{{ canton.nombre }}</ion-select-option>
                  }
                </ion-select></ion-item
              >
            </ion-card-content></ion-card
          >

          <ion-card
            ><ion-card-header><ion-card-title>Organizaciones · 5</ion-card-title></ion-card-header
            ><ion-card-content>
              @for (organizacion of organizaciones; track $index) {
                <div class="row-title">Organización {{ $index + 1 }}</div>
                <ion-item
                  ><ion-input label="Nombre" labelPlacement="stacked" [(ngModel)]="organizacion.nombre" maxlength="150"
                /></ion-item>
                <div class="two-col">
                  <ion-item
                    ><ion-input
                      label="Sigla"
                      labelPlacement="stacked"
                      [(ngModel)]="organizacion.sigla"
                      maxlength="30" /></ion-item
                  ><ion-item
                    ><ion-input
                      label="Lista"
                      labelPlacement="stacked"
                      [(ngModel)]="organizacion.numero_lista"
                      maxlength="20"
                  /></ion-item>
                </div>
              }</ion-card-content
          ></ion-card>

          <ion-card
            ><ion-card-header><ion-card-title>Candidaturas</ion-card-title></ion-card-header
            ><ion-card-content>
              @for (organizacion of organizaciones; track $index) {
                <div class="row-title">{{ organizacion.nombre || 'Organización ' + ($index + 1) }}</div>
                <div class="two-col">
                  <ion-item
                    ><ion-input
                      label="Alcaldía · nombres"
                      labelPlacement="stacked"
                      [(ngModel)]="alcaldia[$index].nombres"
                      maxlength="100" /></ion-item
                  ><ion-item
                    ><ion-input
                      label="Apellidos"
                      labelPlacement="stacked"
                      [(ngModel)]="alcaldia[$index].apellidos"
                      maxlength="100"
                  /></ion-item>
                </div>
                <div class="two-col">
                  <ion-item
                    ><ion-input
                      label="Lista alcaldía"
                      labelPlacement="stacked"
                      [(ngModel)]="alcaldia[$index].numero_lista"
                      maxlength="20" /></ion-item
                  ><ion-item
                    ><ion-input
                      label="Prefectura · nombres"
                      labelPlacement="stacked"
                      [(ngModel)]="prefectura[$index].nombres"
                      maxlength="100"
                  /></ion-item>
                </div>
                <div class="two-col">
                  <ion-item
                    ><ion-input
                      label="Apellidos"
                      labelPlacement="stacked"
                      [(ngModel)]="prefectura[$index].apellidos"
                      maxlength="100" /></ion-item
                  ><ion-item
                    ><ion-input
                      label="Lista prefectura"
                      labelPlacement="stacked"
                      [(ngModel)]="prefectura[$index].numero_lista"
                      maxlength="20"
                  /></ion-item>
                </div>
              }</ion-card-content
          ></ion-card>

          <ion-card
            ><ion-card-header><ion-card-title>Recintos y cantidad de JRV</ion-card-title></ion-card-header
            ><ion-card-content>
              @for (recinto of recintos; track $index) {
                <div class="row-title">Recinto {{ $index + 1 }}</div>
                <ion-item
                  ><ion-label position="stacked">Parroquia</ion-label
                  ><ion-select
                    [(ngModel)]="recinto.parroquia_id"
                    interface="action-sheet"
                    placeholder="Selecciona una parroquia"
                    [disabled]="!cantonId"
                  >
                    @for (parroquia of parroquias; track parroquia.id) {
                      <ion-select-option [value]="parroquia.id">{{ parroquia.nombre }}</ion-select-option>
                    }
                  </ion-select></ion-item
                >
                <ion-item
                  ><ion-input
                    label="Nombre del recinto"
                    labelPlacement="stacked"
                    [(ngModel)]="recinto.nombre"
                    maxlength="150"
                /></ion-item>
                <div class="two-col">
                  <ion-item
                    ><ion-input
                      label="Dirección"
                      labelPlacement="stacked"
                      [(ngModel)]="recinto.direccion"
                      maxlength="1000" /></ion-item
                  ><ion-item
                    ><ion-input
                      label="Referencia"
                      labelPlacement="stacked"
                      [(ngModel)]="recinto.referencia"
                      maxlength="1000"
                  /></ion-item>
                </div>
                <ion-item
                  ><ion-input
                    type="number"
                    min="1"
                    max="500"
                    step="1"
                    label="Cantidad de JRV"
                    labelPlacement="stacked"
                    [(ngModel)]="recinto.cantidad_jrv"
                /></ion-item>
                @if (recintos.length > 1) {
                  <ion-button fill="clear" color="danger" (click)="quitarRecinto($index)">Quitar recinto</ion-button>
                }
              }
              <ion-button expand="block" fill="outline" (click)="agregarRecinto()">＋ Agregar otro recinto</ion-button>
            </ion-card-content></ion-card
          >

          @if (error) {
            <ion-card color="danger"
              ><ion-card-content>{{ error }}</ion-card-content></ion-card
            >
          }
          @if (exito) {
            <ion-card color="success"
              ><ion-card-content>{{ exito }}</ion-card-content></ion-card
            >
          }
          <ion-button expand="block" class="submit" (click)="guardar()" [disabled]="guardando || cargando">
            @if (guardando) {
              <ion-spinner name="crescent" />
            } @else {
              Guardar precarga
            }
          </ion-button>
        }
      </main></ion-content
    >
  `,
  styles: [
    `
      .page-shell {
        max-width: 780px;
        margin: 0 auto;
        padding-bottom: 32px;
      }
      .eyebrow {
        font-size: 11px;
        font-weight: 800;
        letter-spacing: 0.12em;
        color: var(--ion-color-primary);
        margin: 10px 0;
      }
      h1 {
        font-size: 28px;
        font-weight: 800;
        margin: 0;
      }
      .intro {
        color: var(--ion-color-medium);
        line-height: 1.5;
        margin: 8px 0 18px;
      }
      ion-card {
        border-radius: 18px;
        box-shadow: 0 4px 18px #172b4d0b;
        margin: 12px 0;
      }
      ion-card-title {
        font-size: 17px;
      }
      ion-item {
        --padding-start: 0;
        --inner-padding-end: 8px;
      }
      .two-col {
        display: grid;
        grid-template-columns: 1fr 1fr;
        gap: 8px;
      }
      .row-title {
        font-size: 12px;
        font-weight: 800;
        color: var(--ion-color-primary);
        margin: 17px 0 3px;
      }
      .submit {
        min-height: 50px;
        font-weight: 700;
      }
      @media (max-width: 520px) {
        .two-col {
          grid-template-columns: 1fr;
          gap: 0;
        }
      }
    `,
  ],
})
export class PrecargaPage implements OnInit {
  private readonly perfilesService = inject(PerfilesService);
  private readonly territorioService = inject(TerritorioService);
  private readonly precargaService = inject(PrecargaService);
  provincias: Provincia[] = [];
  cantones: Canton[] = [];
  parroquias: Parroquia[] = [];
  provinciaId: number | null = null;
  cantonId: number | null = null;
  esAdministrador = false;
  cargando = true;
  guardando = false;
  error = '';
  exito = '';
  organizaciones: OrganizacionInput[] = Array.from({ length: 5 }, () => ({ nombre: '', sigla: '', numero_lista: '' }));
  alcaldia: CandidaturaInput[] = Array.from({ length: 5 }, () => ({ nombres: '', apellidos: '', numero_lista: '' }));
  prefectura: CandidaturaInput[] = Array.from({ length: 5 }, () => ({ nombres: '', apellidos: '', numero_lista: '' }));
  recintos: RecintoInput[] = [this.nuevoRecinto()];

  async ngOnInit(): Promise<void> {
    try {
      this.esAdministrador = (await this.perfilesService.obtenerMiPerfil())?.rol === 'administrador';
      if (this.esAdministrador) this.provincias = (await this.territorioService.obtenerProvincias()) as Provincia[];
    } catch (error) {
      this.error = error instanceof Error ? error.message : 'No se pudo cargar la configuración.';
    } finally {
      this.cargando = false;
    }
  }

  async cambioProvincia(): Promise<void> {
    this.cantonId = null;
    this.cantones = [];
    this.parroquias = [];
    if (this.provinciaId) this.cantones = (await this.territorioService.obtenerCantones(this.provinciaId)) as Canton[];
    this.recintos.forEach((recinto) => (recinto.parroquia_id = null));
  }

  async cambioCanton(): Promise<void> {
    this.parroquias = this.cantonId
      ? ((await this.territorioService.obtenerParroquias(this.cantonId)) as Parroquia[])
      : [];
    this.recintos.forEach((recinto) => (recinto.parroquia_id = null));
  }

  agregarRecinto(): void {
    this.recintos = [...this.recintos, this.nuevoRecinto()];
  }
  quitarRecinto(index: number): void {
    this.recintos = this.recintos.filter((_, item) => item !== index);
  }

  async guardar(): Promise<void> {
    this.error = '';
    this.exito = '';
    if (!this.provinciaId || !this.cantonId) {
      this.error = 'Selecciona una provincia y un cantón.';
      return;
    }
    if (this.organizaciones.some((item) => !item.nombre.trim())) {
      this.error = 'Completa los nombres de las cinco organizaciones.';
      return;
    }
    if ([...this.alcaldia, ...this.prefectura].some((item) => !item.nombres.trim() || !item.apellidos.trim())) {
      this.error = 'Completa nombres y apellidos de las diez candidaturas.';
      return;
    }
    if (
      this.recintos.some(
        (item) =>
          !item.parroquia_id ||
          !item.nombre.trim() ||
          !Number.isInteger(Number(item.cantidad_jrv)) ||
          Number(item.cantidad_jrv) < 1 ||
          Number(item.cantidad_jrv) > 500,
      )
    ) {
      this.error = 'Completa los datos de cada recinto y una cantidad de JRV entre 1 y 500.';
      return;
    }
    this.guardando = true;
    try {
      const candidaturas = this.organizaciones.flatMap((organizacion, index) => [
        { ...this.alcaldia[index], organizacion: organizacion.nombre.trim(), dignidad: 'alcaldia' },
        { ...this.prefectura[index], organizacion: organizacion.nombre.trim(), dignidad: 'prefectura' },
      ]);
      const result = await this.precargaService.ejecutar({
        provincia_id: this.provinciaId,
        canton_id: this.cantonId,
        organizaciones: this.organizaciones.map((item) => ({
          nombre: item.nombre.trim(),
          sigla: item.sigla.trim(),
          numero_lista: item.numero_lista.trim(),
        })),
        candidaturas,
        recintos: this.recintos.map((item) => ({ ...item, cantidad_jrv: Number(item.cantidad_jrv) })),
      });
      const count = (result as { recintos?: unknown[] } | null)?.recintos?.length ?? this.recintos.length;
      this.exito = `Precarga completada. Se procesaron ${count} recintos y sus JRV.`;
    } catch (error) {
      this.error = error instanceof Error ? error.message : 'No se pudo completar la precarga.';
    } finally {
      this.guardando = false;
    }
  }

  private nuevoRecinto(): RecintoInput {
    return { parroquia_id: null, nombre: '', direccion: '', referencia: '', cantidad_jrv: null };
  }
}
