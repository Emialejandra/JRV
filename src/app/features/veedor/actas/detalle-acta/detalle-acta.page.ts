import { CommonModule } from '@angular/common';
import { Component, OnInit, inject, ChangeDetectorRef } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import {
  IonBackButton,
  IonBadge,
  IonButton,
  IonButtons,
  IonCard,
  IonCardContent,
  IonCardHeader,
  IonCardTitle,
  IonContent,
  IonHeader,
  IonImg,
  IonItem,
  IonLabel,
  IonSpinner,
  IonInput,
  IonTitle,
  IonToolbar,
} from '@ionic/angular';
import { ActasService } from '../../../../core/services/actas';
import { PerfilesService } from '../../../../core/services/perfiles.service';

interface ActaDetalle {
  id: number;
  jrv_id: number;
  registrado_por: string;
  dignidad: 'alcaldia' | 'prefectura';
  fotografia_url?: string | null;
  fotografia_path?: string | null;
  fecha_registro?: string;
  updated_at?: string;
  estado?: string;
  latitud?: number | null;
  longitud?: number | null;
  total_votos_validos: number;
  total_votos_blancos: number;
  total_votos_nulos: number;
  total_votantes: number;
  observaciones?: string | null;
  detalle_votos?: Array<{
    candidatura_id: number;
    cantidad_votos: number;
    candidaturas?: {
      nombres: string;
      apellidos: string;
      organizaciones?: { nombre: string; sigla?: string } | null;
    } | null;
  }>;
}

@Component({
  selector: 'app-detalle-acta',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    RouterLink,
    IonBackButton,
    IonBadge,
    IonButton,
    IonButtons,
    IonCard,
    IonCardContent,
    IonCardHeader,
    IonCardTitle,
    IonContent,
    IonHeader,
    IonImg,
    IonItem,
    IonInput,
    IonLabel,
    IonSpinner,
    IonTitle,
    IonToolbar,
  ],
  template: `
    <ion-header
      ><ion-toolbar color="primary">
        <ion-buttons slot="start"><ion-back-button [defaultHref]="volverA" /></ion-buttons>
        <ion-title>{{ acta ? 'Detalle del acta' : 'Actas de la JRV' }}</ion-title>
      </ion-toolbar></ion-header
    >
    <ion-content class="ion-padding">
      <main class="page-shell">
        @if (cargando) {
          <div class="loading"><ion-spinner name="crescent" /> Cargando información…</div>
        }
        @if (mensajeError) {
          <ion-card color="danger"
            ><ion-card-content>{{ mensajeError }}</ion-card-content></ion-card
          >
        }

        @if (!cargando && acta) {
          <p class="eyebrow">JRV {{ acta.jrv_id }} · {{ nombreDignidad(acta.dignidad) }}</p>
          <h1>Resultado registrado</h1>
          <div class="meta">
            <ion-badge color="success">{{ acta.estado || 'Registrada' }}</ion-badge
            ><span>{{ acta.fecha_registro | date: 'medium' }}</span>
          </div>
          @if (acta.fotografia_url) {
            <ion-img class="photo" [src]="acta.fotografia_url" alt="Fotografía del acta electoral" />
          }
          @if (puedeCorregir && !editando) {
            <ion-button fill="outline" (click)="iniciarEdicion()">Corregir acta</ion-button>
          }
          @if (editando) {
            <ion-card
              ><ion-card-header><ion-card-title>Corrección del acta</ion-card-title></ion-card-header
              ><ion-card-content>
                <p class="note">
                  Registra nuevamente los valores que aparecen en el acta. El sistema rechazará cambios si otra persona
                  ya actualizó este registro.
                </p>
                @for (voto of acta.detalle_votos || []; track $index) {
                  <ion-item
                    ><ion-label class="ion-text-wrap"
                      ><strong>{{
                        voto.candidaturas?.organizaciones?.sigla ||
                          voto.candidaturas?.organizaciones?.nombre ||
                          'Organización'
                      }}</strong>
                      <p>{{ voto.candidaturas?.nombres }} {{ voto.candidaturas?.apellidos }}</p></ion-label
                    ><ion-input
                      slot="end"
                      type="number"
                      inputmode="numeric"
                      min="0"
                      [(ngModel)]="votosEditados[voto.candidatura_id]"
                    ></ion-input
                  ></ion-item>
                }
                <ion-item
                  ><ion-label position="stacked">Votos blancos</ion-label
                  ><ion-input type="number" min="0" [(ngModel)]="blancosEditados"></ion-input
                ></ion-item>
                <ion-item
                  ><ion-label position="stacked">Votos nulos</ion-label
                  ><ion-input type="number" min="0" [(ngModel)]="nulosEditados"></ion-input
                ></ion-item>
                <ion-item
                  ><ion-label position="stacked">Total sufragantes</ion-label
                  ><ion-input type="number" min="0" [(ngModel)]="sufragantesEditados"></ion-input
                ></ion-item>
                <label class="photo-replace" for="replacement-photo">Cambiar fotografía (opcional)</label
                ><input
                  id="replacement-photo"
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  capture="environment"
                  (change)="seleccionarFoto($event)"
                />
                <ion-button expand="block" (click)="guardarCorreccion()" [disabled]="guardando">
                  @if (guardando) {
                    <ion-spinner name="crescent" />
                  } @else {
                    Guardar corrección
                  }
                </ion-button>
                <ion-button expand="block" fill="clear" color="medium" (click)="editando = false" [disabled]="guardando"
                  >Cancelar</ion-button
                >
              </ion-card-content></ion-card
            >
          }
          <ion-card
            ><ion-card-header><ion-card-title>Detalle de votos</ion-card-title></ion-card-header
            ><ion-card-content>
              @for (voto of acta.detalle_votos || []; track $index) {
                <ion-item
                  ><ion-label class="ion-text-wrap"
                    ><strong>{{
                      voto.candidaturas?.organizaciones?.sigla ||
                        voto.candidaturas?.organizaciones?.nombre ||
                        'Organización'
                    }}</strong>
                    <p>{{ voto.candidaturas?.nombres }} {{ voto.candidaturas?.apellidos }}</p></ion-label
                  ><ion-badge slot="end" color="light">{{ voto.cantidad_votos }}</ion-badge></ion-item
                >
              }
              <div class="totals">
                <span
                  >Votos válidos <b>{{ acta.total_votos_validos }}</b></span
                ><span
                  >Blancos <b>{{ acta.total_votos_blancos }}</b></span
                ><span
                  >Nulos <b>{{ acta.total_votos_nulos }}</b></span
                ><span
                  >Total sufragantes <b>{{ acta.total_votantes }}</b></span
                >
              </div>
              @if (acta.observaciones) {
                <p class="note"><strong>Observaciones:</strong> {{ acta.observaciones }}</p>
              }
              @if (acta.latitud != null && acta.longitud != null) {
                <p class="note">
                  Ubicación registrada: {{ acta.latitud | number: '1.4-6' }}, {{ acta.longitud | number: '1.4-6' }}
                </p>
              }
            </ion-card-content></ion-card
          >
        } @else if (!cargando) {
          <p class="eyebrow">SEGUIMIENTO</p>
          <h1>Actas recibidas</h1>
          <p class="note">Consulta los registros de tu mesa.</p>
          @if (actas.length === 0 && !mensajeError) {
            <ion-card><ion-card-content>Aún no hay actas registradas para esta mesa.</ion-card-content></ion-card>
          }
          @for (item of actas; track item.id) {
            <ion-card
              ><ion-card-content class="acta-row">
                <div>
                  <ion-badge color="primary">{{ nombreDignidad(item.dignidad) }}</ion-badge>
                  <p>{{ item.fecha_registro | date: 'short' }}</p>
                  <small>{{ item.total_votantes }} sufragantes</small>
                </div>
                <ion-button
  fill="outline"
  [routerLink]="[rutaDetalle]"
  [queryParams]="{ actaId: item.id }"
>
  Ver detalle
</ion-button>
                

              </ion-card-content></ion-card
            >
          }
        }
      </main>
    </ion-content>
  `,
  styles: [
    `
      .page-shell {
        max-width: 680px;
        margin: 0 auto;
        padding-bottom: 30px;
      }
      h1 {
        margin: 0 0 10px;
        font-size: 27px;
        font-weight: 800;
      }
      .eyebrow {
        margin: 14px 0 7px;
        font-size: 11px;
        font-weight: 800;
        letter-spacing: 0.12em;
        color: var(--ion-color-primary);
      }
      .meta,
      .acta-row {
        display: flex;
        justify-content: space-between;
        align-items: center;
        gap: 12px;
        color: var(--ion-color-medium);
      }
      .photo {
        margin: 16px 0;
        max-height: 420px;
        object-fit: contain;
        border-radius: 14px;
        background: #f4f6f8;
      }
      ion-card {
        border-radius: 17px;
        box-shadow: 0 4px 18px #172b4d0b;
      }
      ion-card-title {
        font-size: 17px;
      }
      ion-item {
        --padding-start: 0;
      }
      ion-item p {
        color: var(--ion-color-medium);
        margin: 4px 0 0;
      }
      .totals {
        display: grid;
        grid-template-columns: 1fr 1fr;
        gap: 12px;
        padding: 18px 0 6px;
      }
      .totals span {
        display: flex;
        justify-content: space-between;
        gap: 6px;
        color: var(--ion-color-medium);
        font-size: 13px;
      }
      .totals b {
        color: var(--ion-text-color);
      }
      .note {
        color: var(--ion-color-medium);
        font-size: 13px;
        line-height: 1.5;
      }
      .acta-row p {
        margin: 9px 0 3px;
      }
      .loading {
        display: flex;
        align-items: center;
        gap: 10px;
        justify-content: center;
        padding: 40px 0;
      }
      .photo-replace {
        display: block;
        margin: 14px 0 6px;
        color: var(--ion-color-primary);
        font-size: 14px;
      }
    `,
  ],
})
export class DetalleActaPage implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly actasService = inject(ActasService);
  private readonly perfilesService = inject(PerfilesService);
  private readonly cdr = inject(ChangeDetectorRef);


  // Ruta de destino según el módulo desde el que se consulta.
  rutaDetalle = '/veedor/actas/detalle';

  actas: ActaDetalle[] = [];
  acta: ActaDetalle | null = null;
  cargando = false;
  mensajeError = '';
  puedeCorregir = false;
  volverA = '/veedor/mesas';
  private miPerfilId = '';
  editando = false;
  guardando = false;
  votosEditados: Record<number, number> = {};
  blancosEditados = 0;
  nulosEditados = 0;
  sufragantesEditados = 0;
  fotoNueva: File | null = null;

  ngOnInit(): void {
    const url = this.router.url;

    if (url.startsWith('/provincial')) {
      this.rutaDetalle = '/provincial/actas/detalle';
      this.volverA = '/provincial/dashboard';
    } else if (url.startsWith('/recinto')) {
      this.rutaDetalle = '/recinto/actas/detalle';
      this.volverA = '/recinto/dashboard';
    } else {
      this.rutaDetalle = '/veedor/actas/detalle';
      this.volverA = '/veedor/mesas';
    }

    this.route.queryParamMap.subscribe(() => {
      void this.cargar();
    });
  }

  nombreDignidad(value: string): string {
    return value === 'alcaldia' ? 'Alcaldía' : 'Prefectura';
  }

  iniciarEdicion(): void {
    if (!this.acta) return;
    this.votosEditados = Object.fromEntries(
      (this.acta.detalle_votos ?? []).map((item) => [item.candidatura_id, item.cantidad_votos]),
    );
    this.blancosEditados = this.acta.total_votos_blancos;
    this.nulosEditados = this.acta.total_votos_nulos;
    this.sufragantesEditados = this.acta.total_votantes;
    this.fotoNueva = null;
    this.editando = true;
  }

  seleccionarFoto(event: Event): void {
    const file = (event.target as HTMLInputElement).files?.[0] ?? null;
    if (!file) return;
    if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type) || file.size > 10 * 1024 * 1024) {
      this.mensajeError = 'La imagen debe ser JPG, PNG o WebP y pesar máximo 10 MB.';
      return;
    }
    this.fotoNueva = file;
    this.mensajeError = '';
  }

  async guardarCorreccion(): Promise<void> {
    if (!this.acta) return;
    const detail = this.acta.detalle_votos ?? [];
    const total =
      detail.reduce((sum, item) => sum + Number(this.votosEditados[item.candidatura_id] ?? 0), 0) +
      Number(this.blancosEditados) +
      Number(this.nulosEditados);
    if (
      detail.length !== 5 ||
      total !== Number(this.sufragantesEditados) ||
      [...Object.values(this.votosEditados), this.blancosEditados, this.nulosEditados, this.sufragantesEditados].some(
        (value) => !Number.isSafeInteger(Number(value)) || Number(value) < 0,
      )
    ) {
      this.mensajeError = 'Verifica que existan cinco candidaturas y que la suma coincida con el total de sufragantes.';
      return;
    }
    if (!this.acta.updated_at) {
      this.mensajeError = 'El acta no tiene una marca de actualización para validar la corrección. Recarga el detalle.';
      return;
    }
    this.guardando = true;
    this.mensajeError = '';

    this.cdr.detectChanges();
    try {
      const photo = this.fotoNueva
        ? await this.actasService.subirFotografia(this.acta.jrv_id, this.acta.dignidad, this.fotoNueva)
        : null;
      const input = {
        jrv_id: this.acta.jrv_id,
        dignidad: this.acta.dignidad,
        votos: detail.map((item) => ({
          candidatura_id: item.candidatura_id,
          cantidad_votos: Number(this.votosEditados[item.candidatura_id] ?? 0),
        })),
        total_votos_blancos: Number(this.blancosEditados),
        total_votos_nulos: Number(this.nulosEditados),
        total_votantes: Number(this.sufragantesEditados),
        latitud: this.acta.latitud ?? null,
        longitud: this.acta.longitud ?? null,
        fotografia_path: photo?.path ?? null,
        observaciones: this.acta.observaciones ?? null,
      };
      await this.actasService.actualizarActa(this.acta.id, input, this.acta.updated_at);
      this.editando = false;
      await this.cargar();
    } catch (error) {
      this.mensajeError = error instanceof Error ? error.message : 'No se pudo corregir el acta.';
    } finally {
      this.guardando = false;
      this.cdr.detectChanges();
    }
  }

  private async cargar(): Promise<void> {
    this.cargando = true;
    this.mensajeError = '';
    this.acta = null;
    this.actas = [];
    this.puedeCorregir = false;

    // Actualizar inmediatamente el indicador de carga.
    this.cdr.detectChanges();

    const params = this.route.snapshot.queryParamMap;
    const actaId = Number(params.get('actaId'));
    const jrvId = Number(params.get('jrvId'));

    try {
      const profile = await this.perfilesService.obtenerMiPerfil();
      this.miPerfilId = profile?.id ?? '';

      if (actaId > 0) {
        this.acta = await this.actasService.obtenerActa<ActaDetalle>(actaId);
      } else if (jrvId > 0) {
        this.actas = await this.actasService.obtenerActasPorJrv<ActaDetalle[]>(jrvId);
      } else {
        this.mensajeError = 'Selecciona una JRV desde la lista de tus mesas.';
      }

      this.puedeCorregir =
        profile?.rol === 'coordinador_recinto' ||
        (profile?.rol === 'veedor' && this.acta?.registrado_por === this.miPerfilId);

    } catch (error) {
      console.error('Error cargando detalle de acta:', error);

      this.mensajeError =
        error instanceof Error ? error.message : 'No se pudo cargar el acta.';

    } finally {
      this.cargando = false;

      // Actualizar los datos al terminar la consulta.
      this.cdr.detectChanges();
    }
  }
}
