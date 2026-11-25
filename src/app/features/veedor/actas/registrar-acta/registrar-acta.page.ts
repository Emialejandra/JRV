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
  Camera,
  CameraResultType,
  CameraSource,
} from '@capacitor/camera';
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
  templateUrl: 'registrar-acta.page.html',
  styleUrls: ['registrar-acta.page.scss'],
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