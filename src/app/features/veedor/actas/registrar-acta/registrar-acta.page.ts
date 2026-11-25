import { CommonModule } from '@angular/common';
import { Component, OnInit, inject } from '@angular/core';
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
  IonCardSubtitle,
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
import { ActasService, type CandidaturaParaActa } from '../../../../core/services/actas';
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
    IonCardSubtitle,
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
  templateUrl: './registrar-acta.page.html',
  styleUrls: ['./registrar-acta.page.scss'],
})
export class RegistrarActaPage implements OnInit {
  private readonly asignacionesService = inject(AsignacionesService);
  private readonly actasService = inject(ActasService);
  private readonly pendientesService = inject(ActasPendientesService);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);

  asignaciones: Asignacion[] = [];
  jrvId: number | null = null;
  dignidad: Dignidad = 'alcaldia';

  candidaturas: CandidaturaParaActa[] = [];
  votos: Record<number, number> = {};

  totalVotos = 0;
  votosBlancos = 0;
  votosNulos = 0;
  totalVotantes = 0;
  blancos: number | null = 0;
  nulos: number | null = 0;
  sufragantes: number | null = null;
  archivo: File | null = null;
  vistaPrevia: string | null = null;
  fotoLegible = false;
  coordenadas: { latitud: number; longitud: number } | null = null;
  observaciones = '';
  cargandoCandidaturas = false;
  obteniendoGps = false;
  guardando = false;
  mensajeError = '';
  mensajeExito = '';
  guardadoLocal = false;

  get cuadraTotal(): boolean {
    return this.sufragantes !== null && this.sufragantes >= 0 && this.totalVotos === this.sufragantes;
  }

  get puedeGuardar(): boolean {
    return (
      !this.guardadoLocal &&
      !!this.jrvId &&
      this.candidaturas.length === 5 &&
      !!this.archivo &&
      this.fotoLegible &&
      this.cuadraTotal
    );
  }

  async ngOnInit(): Promise<void> {
    try {
      this.asignaciones = (await this.asignacionesService.obtenerMisAsignaciones()).filter(
        (item) => item.jrv_id !== null && item.jrv_id !== undefined,
      );
      const requestedId = Number(this.route.snapshot.queryParamMap.get('jrvId'));
      this.jrvId =
        this.asignaciones.find((item) => item.jrv_id === requestedId)?.jrv_id ?? this.asignaciones[0]?.jrv_id ?? null;
      await this.cargarCandidaturas();
    } catch (error) {
      this.mensajeError = this.mensaje(error, 'No se pudieron cargar tus mesas asignadas.');
    }
  }

  async cargarCandidaturas(): Promise<void> {
    this.cargandoCandidaturas = true;
    this.mensajeError = '';
    try {
      this.candidaturas = await this.actasService.obtenerCandidaturas(this.dignidad);

      console.log('=== REGISTRAR ACTA ===');
      console.log('Candidaturas en la página:', this.candidaturas);
      console.log('Cantidad en la página:', this.candidaturas.length);

      this.votos = Object.fromEntries(
        this.candidaturas.map((item) => [item.id, 0])
      );
      this.actualizarTotal();
    } catch (error) {
      this.mensajeError = this.mensaje(error, 'No se pudieron cargar las candidaturas.');
      this.candidaturas = [];
    } finally {
      this.cargandoCandidaturas = false;
    }
  }

  seleccionarFoto(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0] ?? null;
    if (!file) return;
    if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type) || file.size > 10 * 1024 * 1024) {
      this.mensajeError = 'Elige una imagen JPG, PNG o WebP de máximo 10 MB.';
      input.value = '';
      return;
    }
    this.archivo = file;
    this.fotoLegible = false;
    this.vistaPrevia = URL.createObjectURL(file);
    this.mensajeError = '';
  }

  actualizarVoto(candidaturaId: number, valor: string | number | null | undefined): void {
    const numero = Number(valor ?? 0);

    this.votos[candidaturaId] = Number.isFinite(numero) && numero >= 0
      ? Math.floor(numero)
      : 0;

    this.actualizarTotal();
  }

  actualizarTotal(): void {
    this.totalVotos =
      Object.values(this.votos).reduce<number>((sum, value) => sum + this.entero(value), 0) +
      this.entero(this.blancos) +
      this.entero(this.nulos);
  }

  async capturarUbicacion(): Promise<void> {
    this.mensajeError = '';
    if (!navigator.geolocation) {
      this.mensajeError = 'Este dispositivo no ofrece geolocalización.';
      return;
    }
    this.obteniendoGps = true;
    try {
      const position = await new Promise<GeolocationPosition>((resolve, reject) =>
        navigator.geolocation.getCurrentPosition(resolve, reject, {
          enableHighAccuracy: true,
          timeout: 15000,
          maximumAge: 0,
        }),
      );
      this.coordenadas = { latitud: position.coords.latitude, longitud: position.coords.longitude };
    } catch {
      this.mensajeError = 'No se pudo obtener la ubicación. Revisa los permisos de ubicación e inténtalo de nuevo.';
    } finally {
      this.obteniendoGps = false;
    }
  }

  async guardar(): Promise<void> {
    this.mensajeError = '';
    this.mensajeExito = '';
    this.guardadoLocal = false;
    this.actualizarTotal();
    if (!this.puedeGuardar || !this.jrvId || !this.archivo) {
      this.mensajeError = 'Completa los votos, verifica el total, adjunta la foto y confirma que sea legible.';
      return;
    }
    if (
      Object.values(this.votos).some((value) => !Number.isSafeInteger(Number(value)) || Number(value) < 0) ||
      !Number.isSafeInteger(Number(this.blancos)) ||
      Number(this.blancos) < 0 ||
      !Number.isSafeInteger(Number(this.nulos)) ||
      Number(this.nulos) < 0 ||
      !Number.isSafeInteger(Number(this.sufragantes))
    ) {
      this.mensajeError = 'Los votos y sufragantes deben ser números enteros no negativos.';
      return;
    }

    this.guardando = true;
    try {
      const clientId = crypto.randomUUID();
      const data = {
        jrv_id: this.jrvId,
        dignidad: this.dignidad,
        client_id: clientId,
        votos: this.candidaturas.map((item) => ({
          candidatura_id: item.id,
          cantidad_votos: Number(this.votos[item.id] ?? 0),
        })),
        total_votos_blancos: Number(this.blancos),
        total_votos_nulos: Number(this.nulos),
        total_votantes: Number(this.sufragantes),
        latitud: this.coordenadas?.latitud ?? null,
        longitud: this.coordenadas?.longitud ?? null,
        observaciones: this.observaciones.trim() || null,
      };
      if (!navigator.onLine) {
        await this.pendientesService.encolar({
          client_id: clientId,
          data,
          foto: this.archivo,
          nombre_archivo: this.archivo.name,
          tipo_archivo: this.archivo.type,
          creada_en: new Date().toISOString(),
        });
        this.guardadoLocal = true;
        this.mensajeExito = 'Acta guardada en este dispositivo. Se sincronizará al recuperar la conexión.';
      } else {
        const foto = await this.actasService.subirFotografia(this.jrvId, this.dignidad, this.archivo);
        await this.actasService.registrarActa({ ...data, fotografia_path: foto.path });
        this.mensajeExito = 'Acta registrada correctamente.';
        window.setTimeout(() => void this.router.navigate(['/veedor/mesas']), 700);
      }
    } catch (error) {
      this.mensajeError = this.mensaje(error, 'No se pudo guardar el acta. Revisa la conexión e inténtalo nuevamente.');
    } finally {
      this.guardando = false;
    }
  }

  private entero(value: unknown): number {
    const parsed = Number(value);
    return Number.isSafeInteger(parsed) && parsed >= 0 ? parsed : 0;
  }

  private mensaje(error: unknown, fallback: string): string {
    return error instanceof Error && error.message ? error.message : fallback;
  }
}
