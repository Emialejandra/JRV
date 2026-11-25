import { CommonModule } from '@angular/common';
import {
  ChangeDetectorRef,
  Component,
  OnInit,
  inject,
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import {
  ActivatedRoute,
  Router,
  RouterLink,
} from '@angular/router';

import {
  IonBackButton,
  IonBadge,
  IonButton,
  IonButtons,
  IonCard,
  IonCardContent,
  IonCardHeader,
  IonCardTitle,
  IonCheckbox,
  IonContent,
  IonHeader,
  IonInput,
  IonItem,
  IonLabel,
  IonSelect,
  IonSelectOption,
  IonSpinner,
  IonText,
  IonTextarea,
  IonTitle,
  IonToolbar,
} from '@ionic/angular';

import type { Asignacion } from '../../../../core/models/asignacion.model';
import { AsignacionesService } from '../../../../core/services/asignaciones';
import {
  ActasService,
  type CandidaturaParaActa,
} from '../../../../core/services/actas';
import { ActasPendientesService } from '../../../../core/services/actas-pendientes.service';

type Dignidad = 'alcaldia' | 'prefectura';

@Component({
  selector: 'app-registrar-acta',
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
    IonCheckbox,
    IonContent,
    IonHeader,
    IonInput,
    IonItem,
    IonLabel,
    IonSelect,
    IonSelectOption,
    IonSpinner,
    IonText,
    IonTextarea,
    IonTitle,
    IonToolbar,
  ],
  template: `
    <ion-header>
      <ion-toolbar color="primary">
        <ion-buttons slot="start">
          <ion-back-button defaultHref="/veedor/mesas" />
        </ion-buttons>

        <ion-title>Registrar acta</ion-title>
      </ion-toolbar>
    </ion-header>

    <ion-content class="ion-padding">
      <main class="page-shell">
        <p class="eyebrow">CAPTURA ELECTORAL</p>

        <h1>Resultado de la JRV</h1>

        <p class="intro">
          Registra los votos tal como aparecen en el acta física.
          Podrás revisar el total antes de guardar.
        </p>

        <!-- MESA Y DIGNIDAD -->
        <ion-card>
          <ion-card-content>
            <ion-item>
              <ion-label position="stacked">
                Mesa asignada
              </ion-label>

              <ion-select
                [(ngModel)]="jrvId"
                interface="action-sheet"
                placeholder="Elige una JRV"
                [disabled]="asignaciones.length === 1"
              >
                @for (
                  asignacion of asignaciones;
                  track asignacion.id
                ) {
                  <ion-select-option
                    [value]="asignacion.jrv_id"
                  >
                    JRV
                    {{ asignacion.jrv?.numero ?? asignacion.jrv_id }}
                    ·
                    {{ asignacion.recintos?.nombre }}
                  </ion-select-option>
                }
              </ion-select>
            </ion-item>

            <ion-item>
              <ion-label position="stacked">
                Dignidad
              </ion-label>

              <ion-select
                [(ngModel)]="dignidad"
                (ionChange)="cargarCandidaturas()"
                interface="action-sheet"
              >
                <ion-select-option value="alcaldia">
                  Alcaldía
                </ion-select-option>

                <ion-select-option value="prefectura">
                  Prefectura
                </ion-select-option>
              </ion-select>
            </ion-item>
          </ion-card-content>
        </ion-card>

        <!-- VOTOS -->
        <ion-card>
          <ion-card-header>
            <ion-card-title>
              Votos por organización
            </ion-card-title>
          </ion-card-header>

          <ion-card-content>
            @if (cargandoCandidaturas) {
              <div class="loading">
                <ion-spinner name="crescent" />
                <span>Cargando candidaturas…</span>
              </div>
            } @else if (candidaturas.length !== 5) {
              <ion-text color="danger">
                <p>
                  Se esperaban cinco candidaturas activas para
                  esta dignidad y se encontraron
                  {{ candidaturas.length }}.
                  Revisa la precarga electoral.
                </p>
              </ion-text>
            } @else {
              @for (
                candidatura of candidaturas;
                track candidatura.id
              ) {
                <ion-item>
                  <ion-label class="ion-text-wrap">
                    <strong>
                      {{
                        candidatura.organizaciones?.sigla ||
                        candidatura.organizaciones?.nombre
                      }}
                    </strong>

                    <p>
                      {{ candidatura.nombres }}
                      {{ candidatura.apellidos }}
                    </p>
                  </ion-label>

                  <ion-input
                    slot="end"
                    type="number"
                    inputmode="numeric"
                    min="0"
                    step="1"
                    aria-label="Votos"
                    [(ngModel)]="votos[candidatura.id]"
                    (ionInput)="actualizarTotal()"
                  />
                </ion-item>
              }
            }

            <ion-item>
              <ion-label position="stacked">
                Votos blancos
              </ion-label>

              <ion-input
                type="number"
                inputmode="numeric"
                min="0"
                step="1"
                [(ngModel)]="blancos"
                (ionInput)="actualizarTotal()"
              />
            </ion-item>

            <ion-item>
              <ion-label position="stacked">
                Votos nulos
              </ion-label>

              <ion-input
                type="number"
                inputmode="numeric"
                min="0"
                step="1"
                [(ngModel)]="nulos"
                (ionInput)="actualizarTotal()"
              />
            </ion-item>

            <ion-item>
              <ion-label position="stacked">
                Total de sufragantes según el acta
              </ion-label>

              <ion-input
                type="number"
                inputmode="numeric"
                min="0"
                step="1"
                [(ngModel)]="sufragantes"
                (ionInput)="actualizarTotal()"
              />
            </ion-item>

            <div class="total-row">
              <span>Votos contabilizados</span>

              <ion-badge
                [color]="
                  cuadraTotal
                    ? 'success'
                    : 'warning'
                "
              >
                {{ totalVotos }} /
                {{ sufragantes || 0 }}
              </ion-badge>
            </div>
          </ion-card-content>
        </ion-card>

        <!-- FOTO Y UBICACIÓN -->
        <ion-card>
          <ion-card-header>
            <ion-card-title>
              Fotografía y ubicación
            </ion-card-title>
          </ion-card-header>

          <ion-card-content>
            <!-- FOTO -->
            <label
              class="camera-control"
              for="acta-photo"
            >
              <span class="camera-icon">
                ＋
              </span>

              <span>
                {{
                  archivo
                    ? 'Cambiar fotografía'
                    : 'Tomar fotografía del acta'
                }}
              </span>

              <small>
                Usa la cámara trasera · JPG, PNG o WebP ·
                máximo 10 MB
              </small>
            </label>

            <input
              id="acta-photo"
              class="visually-hidden"
              type="file"
              accept="image/jpeg,image/png,image/webp"
              capture="environment"
              (change)="seleccionarFoto($event)"
            />

            @if (vistaPrevia) {
              <img
                class="photo-preview"
                [src]="vistaPrevia"
                alt="Vista previa de la fotografía del acta"
              />

              <ion-checkbox
                [(ngModel)]="fotoLegible"
                labelPlacement="end"
              >
                Confirmo que el texto y los números se leen
                con claridad.
              </ion-checkbox>
            }

            <!-- GPS -->
            <ion-button
              expand="block"
              fill="outline"
              (click)="capturarUbicacion()"
              [disabled]="obteniendoGps"
            >
              @if (obteniendoGps) {
                <ion-spinner name="crescent" />
              } @else {
                <span>⌖</span>
              }

              {{
                coordenadas
                  ? 'Ubicación obtenida'
                  : 'Guardar mi ubicación GPS'
              }}
            </ion-button>

            <!-- CONFIRMACIÓN DE UBICACIÓN -->
            @if (coordenadas) {
              <div class="ubicacion-confirmada">
                <strong>
                  ✓ Ubicación obtenida correctamente
                </strong>

                <p class="gps-note">
                  Latitud:
                  {{
                    coordenadas.latitud
                      | number: '1.4-6'
                  }}

                  <br />

                  Longitud:
                  {{
                    coordenadas.longitud
                      | number: '1.4-6'
                  }}
                </p>
              </div>
            } @else {
              <p class="gps-note">
                Debes obtener tu ubicación GPS antes de
                guardar el acta.
              </p>
            }

            <!-- OBSERVACIONES -->
            <ion-item>
              <ion-label position="stacked">
                Observaciones (opcional)
              </ion-label>

              <ion-textarea
                [(ngModel)]="observaciones"
                autoGrow="true"
                maxlength="2000"
                placeholder="Describe novedades visibles en el acta"
              />
            </ion-item>
          </ion-card-content>
        </ion-card>

        <!-- ERROR -->
        @if (mensajeError) {
          <ion-card color="danger">
            <ion-card-content>
              {{ mensajeError }}
            </ion-card-content>
          </ion-card>
        }

        <!-- ÉXITO -->
        @if (mensajeExito) {
          <ion-card color="success">
            <ion-card-content>
              {{ mensajeExito }}

              @if (guardadoLocal) {
                <ion-button
                  fill="clear"
                  routerLink="/veedor/actas/pendientes"
                >
                  Ver pendientes
                </ion-button>
              }
            </ion-card-content>
          </ion-card>
        }

        <!-- GUARDAR -->
        <ion-button
          class="submit-button"
          expand="block"
          (click)="guardar()"
          [disabled]="
            guardando || !puedeGuardar
          "
        >
          @if (guardando) {
            <ion-spinner name="crescent" />
          } @else {
            Guardar acta
          }
        </ion-button>

        <p class="fine-print">
          Al guardar se verifica nuevamente la suma de votos
          en el servidor.
        </p>
      </main>
    </ion-content>
  `,
  styles: [
    `
      .page-shell {
        max-width: 680px;
        margin: 0 auto;
        padding-bottom: 28px;
      }

      .eyebrow {
        color: var(--ion-color-primary);
        font-size: 11px;
        font-weight: 800;
        letter-spacing: 0.12em;
        margin: 8px 0;
      }

      h1 {
        margin: 0;
        font-size: 28px;
        font-weight: 800;
      }

      .intro {
        color: var(--ion-color-medium);
        line-height: 1.5;
        margin: 8px 0 18px;
      }

      ion-card {
        border-radius: 18px;
        margin: 12px 0;
        box-shadow: 0 4px 18px #172b4d0b;
      }

      ion-card-title {
        font-size: 17px;
      }

      ion-item {
        --padding-start: 0;
        --inner-padding-end: 4px;
      }

      ion-item p {
        color: var(--ion-color-medium);
        font-size: 13px;
        margin: 4px 0;
      }

      ion-input[slot='end'] {
        max-width: 84px;
        text-align: right;
        font-size: 18px;
        font-weight: 700;
      }

      .loading {
        display: flex;
        gap: 10px;
        align-items: center;
        padding: 14px 0;
      }

      .total-row {
        display: flex;
        justify-content: space-between;
        align-items: center;
        padding: 16px 0 4px;
        font-weight: 700;
      }

      .camera-control {
        display: flex;
        flex-direction: column;
        align-items: center;
        gap: 7px;
        padding: 22px 12px;
        margin: 4px 0 14px;
        border: 1px dashed #a8b4c8;
        border-radius: 16px;
        text-align: center;
        font-weight: 700;
        color: var(--ion-color-primary);
      }

      .camera-control small {
        font-size: 12px;
        font-weight: 400;
        color: var(--ion-color-medium);
      }

      .camera-icon {
        width: 34px;
        height: 34px;
        display: grid;
        place-items: center;
        border-radius: 50%;
        background: #e9f1ff;
        font-size: 25px;
      }

      .visually-hidden {
        position: absolute;
        width: 1px;
        height: 1px;
        opacity: 0;
        pointer-events: none;
      }

      .photo-preview {
        width: 100%;
        max-height: 360px;
        object-fit: contain;
        border-radius: 12px;
        background: #f4f6f8;
        margin: 0 0 12px;
      }

      .ubicacion-confirmada {
        margin: 12px 0;
        padding: 12px;
        border-radius: 12px;
        background: #eef8f1;
        border: 1px solid #c8e6d0;
      }

      .ubicacion-confirmada strong {
        color: #237a3b;
        font-size: 13px;
      }

      .gps-note {
        text-align: center;
        color: var(--ion-color-medium);
        font-size: 12px;
        line-height: 1.6;
      }

      .fine-print {
        text-align: center;
        color: var(--ion-color-medium);
        font-size: 12px;
      }

      .submit-button {
        margin-top: 14px;
        min-height: 50px;
        font-weight: 700;
      }
    `,
  ],
})
export class RegistrarActaPage implements OnInit {
  private readonly asignacionesService =
    inject(AsignacionesService);

  private readonly actasService =
    inject(ActasService);

  private readonly pendientesService =
    inject(ActasPendientesService);

  private readonly router =
    inject(Router);

  private readonly route =
    inject(ActivatedRoute);

  // NUEVO:
  // Permite forzar la actualización visual de Ionic/Angular
  // después de recibir la ubicación del navegador.
  private readonly cdr =
    inject(ChangeDetectorRef);

  asignaciones: Asignacion[] = [];

  jrvId: number | null = null;

  dignidad: Dignidad = 'alcaldia';

  candidaturas: CandidaturaParaActa[] = [];

  votos: Record<number, number | null> = {};

  blancos: number | null = 0;

  nulos: number | null = 0;

  sufragantes: number | null = null;

  totalVotos = 0;

  archivo: File | null = null;

  vistaPrevia: string | null = null;

  fotoLegible = false;

  coordenadas: {
    latitud: number;
    longitud: number;
  } | null = null;

  observaciones = '';

  cargandoCandidaturas = false;

  obteniendoGps = false;

  guardando = false;

  mensajeError = '';

  mensajeExito = '';

  guardadoLocal = false;

  get cuadraTotal(): boolean {
    return (
      this.sufragantes !== null &&
      this.sufragantes >= 0 &&
      this.totalVotos ===
        this.sufragantes
    );
  }

  get puedeGuardar(): boolean {
    return (
      !this.guardadoLocal &&
      !!this.jrvId &&
      this.candidaturas.length === 5 &&
      !!this.archivo &&
      this.fotoLegible &&
      this.cuadraTotal &&
      !!this.coordenadas
    );
  }

  async ngOnInit(): Promise<void> {
    try {
      this.asignaciones = (
        await this.asignacionesService.obtenerMisAsignaciones()
      ).filter(
        (item) =>
          item.jrv_id !== null &&
          item.jrv_id !== undefined,
      );

      const requestedId = Number(
        this.route.snapshot.queryParamMap.get(
          'jrvId',
        ),
      );

      this.jrvId =
        this.asignaciones.find(
          (item) =>
            item.jrv_id === requestedId,
        )?.jrv_id ??
        this.asignaciones[0]?.jrv_id ??
        null;

      await this.cargarCandidaturas();
    } catch (error) {
      this.mensajeError = this.mensaje(
        error,
        'No se pudieron cargar tus mesas asignadas.',
      );
    }
  }

  async cargarCandidaturas(): Promise<void> {
    this.cargandoCandidaturas = true;
    this.mensajeError = '';

    try {
      this.candidaturas =
        await this.actasService.obtenerCandidaturas(
          this.dignidad,
        );

      this.votos =
        Object.fromEntries(
          this.candidaturas.map(
            (item) => [
              item.id,
              0,
            ],
          ),
        );

      this.actualizarTotal();
    } catch (error) {
      this.mensajeError =
        this.mensaje(
          error,
          'No se pudieron cargar las candidaturas.',
        );

      this.candidaturas = [];
    } finally {
      this.cargandoCandidaturas = false;
    }
  }

  seleccionarFoto(event: Event): void {
    const input =
      event.target as HTMLInputElement;

    const file =
      input.files?.[0] ?? null;

    if (!file) return;

    if (
      ![
        'image/jpeg',
        'image/png',
        'image/webp',
      ].includes(file.type) ||
      file.size > 10 * 1024 * 1024
    ) {
      this.mensajeError =
        'Elige una imagen JPG, PNG o WebP de máximo 10 MB.';

      input.value = '';

      return;
    }

    this.archivo = file;

    this.fotoLegible = false;

    this.vistaPrevia =
      URL.createObjectURL(file);

    this.mensajeError = '';
  }

  actualizarTotal(): void {
    this.totalVotos =
      Object.values(this.votos).reduce<number>(
        (sum, value) =>
          sum + this.entero(value),
        0,
      ) +
      this.entero(this.blancos) +
      this.entero(this.nulos);
  }

  async capturarUbicacion(): Promise<void> {
    this.mensajeError = '';

    this.obteniendoGps = true;

    // Actualiza la interfaz para mostrar
    // el estado de carga inmediatamente.
    this.cdr.detectChanges();

    if (!navigator.geolocation) {
      this.mensajeError =
        'Este dispositivo no ofrece geolocalización.';

      this.obteniendoGps = false;

      this.cdr.detectChanges();

      return;
    }

    try {
      const position =
        await new Promise<GeolocationPosition>(
          (resolve, reject) =>
            navigator.geolocation.getCurrentPosition(
              resolve,
              reject,
              {
                enableHighAccuracy: true,
                timeout: 15000,
                maximumAge: 0,
              },
            ),
        );

      const latitud =
        position.coords.latitude;

      const longitud =
        position.coords.longitude;

      if (
        !Number.isFinite(latitud) ||
        !Number.isFinite(longitud)
      ) {
        throw new Error(
          'El dispositivo devolvió coordenadas inválidas.',
        );
      }

      this.coordenadas = {
        latitud,
        longitud,
      };

      console.log(
        '📍 UBICACIÓN GPS OBTENIDA:',
        {
          latitud:
            this.coordenadas.latitud,
          longitud:
            this.coordenadas.longitud,
        },
      );

      // IMPORTANTE:
      // Fuerza a Angular/Ionic a actualizar
      // inmediatamente la vista.
      this.cdr.detectChanges();

    } catch (error) {
      console.error(
        '❌ ERROR OBTENIENDO GPS:',
        error,
      );

      this.coordenadas = null;

      this.mensajeError =
        'No se pudo obtener la ubicación. Revisa los permisos de ubicación e inténtalo de nuevo.';

      this.cdr.detectChanges();

    } finally {
      this.obteniendoGps = false;

      // Garantiza que el botón vuelva
      // a su estado correcto.
      this.cdr.detectChanges();
    }
  }

  async guardar(): Promise<void> {
    this.mensajeError = '';

    this.mensajeExito = '';

    this.guardadoLocal = false;

    this.actualizarTotal();

    if (
      !this.puedeGuardar ||
      !this.jrvId ||
      !this.archivo
    ) {
      this.mensajeError =
        'Completa los votos, verifica el total, adjunta la foto, confirma que sea legible y obtén la ubicación GPS.';

      return;
    }

    if (
      Object.values(this.votos).some(
        (value) =>
          !Number.isSafeInteger(
            Number(value),
          ) ||
          Number(value) < 0,
      ) ||
      !Number.isSafeInteger(
        Number(this.blancos),
      ) ||
      Number(this.blancos) < 0 ||
      !Number.isSafeInteger(
        Number(this.nulos),
      ) ||
      Number(this.nulos) < 0 ||
      !Number.isSafeInteger(
        Number(this.sufragantes),
      )
    ) {
      this.mensajeError =
        'Los votos y sufragantes deben ser números enteros no negativos.';

      return;
    }

    if (!this.coordenadas) {
      this.mensajeError =
        'No existe una ubicación GPS registrada. Obtén tu ubicación antes de guardar el acta.';

      return;
    }

    this.guardando = true;

    this.cdr.detectChanges();

    try {
      const clientId =
        crypto.randomUUID();

      const data = {
        jrv_id: this.jrvId,

        dignidad: this.dignidad,

        client_id: clientId,

        votos:
          this.candidaturas.map(
            (item) => ({
              candidatura_id:
                item.id,

              cantidad_votos:
                Number(
                  this.votos[
                    item.id
                  ] ?? 0,
                ),
            }),
          ),

        total_votos_blancos:
          Number(this.blancos),

        total_votos_nulos:
          Number(this.nulos),

        total_votantes:
          Number(this.sufragantes),

        // IMPORTANTE:
        // Aquí enviamos directamente
        // las coordenadas obtenidas.
        latitud:
          this.coordenadas.latitud,

        longitud:
          this.coordenadas.longitud,

        observaciones:
          this.observaciones.trim() ||
          null,
      };

      console.log(
        '📍 COORDENADAS ANTES DE GUARDAR:',
        {
          latitud:
            data.latitud,

          longitud:
            data.longitud,
        },
      );

      console.log(
        '📦 DATA COMPLETA DEL ACTA:',
        data,
      );

      if (!navigator.onLine) {
        await this.pendientesService.encolar({
          client_id:
            clientId,

          data,

          foto:
            this.archivo,

          nombre_archivo:
            this.archivo.name,

          tipo_archivo:
            this.archivo.type,

          creada_en:
            new Date().toISOString(),
        });

        this.guardadoLocal = true;

        this.mensajeExito =
          'Acta guardada en este dispositivo. Se sincronizará al recuperar la conexión.';

      } else {
        const foto =
          await this.actasService.subirFotografia(
            this.jrvId,
            this.dignidad,
            this.archivo,
          );

        await this.actasService.registrarActa({
          ...data,
          fotografia_path:
            foto.path,
        });

        console.log(
          '✅ ACTA GUARDADA CON UBICACIÓN:',
          {
            latitud:
              data.latitud,

            longitud:
              data.longitud,
          },
        );

        this.mensajeExito =
          'Acta registrada correctamente con la ubicación GPS.';

        this.cdr.detectChanges();

        window.setTimeout(
          () =>
            void this.router.navigate([
              '/veedor/mesas',
            ]),
          700,
        );
      }

    } catch (error) {
      console.error(
        '❌ ERROR AL GUARDAR ACTA:',
        error,
      );

      this.mensajeError =
        this.mensaje(
          error,
          'No se pudo guardar el acta. Revisa la conexión e inténtalo nuevamente.',
        );

      this.cdr.detectChanges();

    } finally {
      this.guardando = false;

      this.cdr.detectChanges();
    }
  }

  private entero(
    value: unknown,
  ): number {
    const parsed =
      Number(value);

    return Number.isSafeInteger(
      parsed,
    ) && parsed >= 0
      ? parsed
      : 0;
  }

  private mensaje(
    error: unknown,
    fallback: string,
  ): string {
    return error instanceof Error &&
      error.message
      ? error.message
      : fallback;
  }
}