import { ChangeDetectorRef, Component, OnInit, ElementRef, ViewChild } from '@angular/core';
import * as L from 'leaflet';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

import {
  IonHeader,
  IonToolbar,
  IonTitle,
  IonContent,
  IonSearchbar,
  IonItem,
  IonLabel,
  IonSelect,
  IonSelectOption,
  IonCard,
  IonCardHeader,
  IonCardTitle,
  IonCardContent,
  IonBadge,
  IonSpinner,
  IonText,
  IonNote,
  IonInput,
  IonButton,
} from '@ionic/angular';

import { Recinto } from '../../../core/models/recinto.model';
import { Provincia } from '../../../core/models/provincia.model';
import { Canton } from '../../../core/models/canton.model';
import { Parroquia } from '../../../core/models/parroquia.model';

import { RecintosService } from '../../../core/services/recintos.service';
import { TerritorioService } from '../../../core/services/territorio.service';

@Component({
  selector: 'app-recintos-provincial',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    IonHeader,
    IonToolbar,
    IonTitle,
    IonContent,
    IonSearchbar,
    IonItem,
    IonLabel,
    IonSelect,
    IonSelectOption,
    IonCard,
    IonCardHeader,
    IonCardTitle,
    IonCardContent,
    IonBadge,
    IonSpinner,
    IonText,
    IonNote,
    IonInput,
    IonButton,
  ],
  templateUrl: './recintos.page.html',
  styleUrls: ['./recintos.page.scss'],
})
export class RecintosPage implements OnInit {

  @ViewChild('mapaUbicacion') mapaUbicacion?: ElementRef<HTMLDivElement>;

  mostrarMapa = false;

  private mapa: L.Map | null = null;
  private marcador: L.CircleMarker | null = null;

  provincias: Provincia[] = [];
  cantones: Canton[] = [];
  parroquias: Parroquia[] = [];

  recintos: Recinto[] = [];

  busqueda = '';

  provinciaSeleccionada: number | null = null;
  cantonSeleccionado: number | null = null;
  parroquiaSeleccionada: number | null = null;

  cargando = false;
  cargandoTerritorio = false;
  guardando = false;

  mostrarFormulario = false;
  mensajeError = '';
  mensajeExito = '';

  // Datos del nuevo recinto
  nuevoRecinto = {
    nombre: '',
    direccion: '',
    referencia: '',
    parroquia_id: null as number | null,
    capacidad_jrv: null as number | null,
    latitud: null as number | null,
    longitud: null as number | null,
  };

  constructor(
    private recintosService: RecintosService,
    private territorioService: TerritorioService,
    private readonly cdr: ChangeDetectorRef,
  ) { }

  async ngOnInit(): Promise<void> {
    await this.cargarDatosIniciales();
  }

  // ==========================================
  // CARGAR INFORMACIÓN INICIAL
  // ==========================================

  async cargarDatosIniciales(): Promise<void> {
    this.cargando = true;
    this.mensajeError = '';
    this.cdr.detectChanges();

    console.log('Iniciando carga de recintos...');

    try {
      const provincias = await this.territorioService.obtenerProvincias();

      this.provincias = provincias as Provincia[];

      console.log('Provincias:', this.provincias);

      const respuestaRecintos = await this.recintosService.obtenerRecintos();

      console.log('Respuesta de Supabase:', respuestaRecintos);

      if (respuestaRecintos.error) {
        throw respuestaRecintos.error;
      }

      this.recintos = (respuestaRecintos.data ?? []) as Recinto[];

      console.log('Recintos:', this.recintos);
      console.log('Total de recintos:', this.recintos.length);
    } catch (error: any) {
      console.error('Error cargando información:', error);
      this.mensajeError = error.message || 'No se pudo cargar la información.';
    } finally {
      this.cargando = false;
      this.cdr.detectChanges();

      console.log('Estado final de cargando:', this.cargando);
      console.log('Carga finalizada.');
    }
  }

  // FILTROS TERRITORIALES

  async cambiarProvincia(valor: number | null): Promise<void> {
    this.provinciaSeleccionada = valor == null ? null : Number(valor);

    this.cantonSeleccionado = null;
    this.parroquiaSeleccionada = null;

    this.cantones = [];
    this.parroquias = [];

    this.mensajeError = '';

    if (this.provinciaSeleccionada === null) {
      return;
    }

    this.cargandoTerritorio = true;
    this.cdr.detectChanges();

    try {
      this.cantones = (await this.territorioService.obtenerCantones(this.provinciaSeleccionada)) as Canton[];

      const resultados = await Promise.all(
        this.cantones.map((canton) => this.territorioService.obtenerParroquias(canton.id)),
      );

      this.parroquias = resultados.flat() as Parroquia[];
    } catch (error: any) {
      console.error('Error al cargar territorio:', error);

      this.mensajeError = error?.message || 'No fue posible cargar los filtros territoriales.';
    } finally {
      this.cargandoTerritorio = false;
      this.cdr.detectChanges();
    }
  }

  cambiarCanton(valor: number | null): void {
    this.cantonSeleccionado = valor == null ? null : Number(valor);

    this.parroquiaSeleccionada = null;
  }

  cambiarParroquia(valor: number | null): void {
    this.parroquiaSeleccionada = valor == null ? null : Number(valor);
  }

  // ==========================================
  // FILTROS Y RESULTADOS
  // ==========================================

  get parroquiasDisponibles(): Parroquia[] {
    if (this.cantonSeleccionado === null) {
      return [];
    }

    return this.parroquias.filter((parroquia) => Number(parroquia.canton_id) === this.cantonSeleccionado);
  }

  get recintosFiltrados(): Recinto[] {
    let resultado = [...this.recintos];

    if (this.provinciaSeleccionada !== null) {
      const idsParroquias = new Set(this.parroquias.map((parroquia) => Number(parroquia.id)));

      resultado = resultado.filter((recinto) => idsParroquias.has(Number(recinto.parroquia_id)));
    }

    if (this.cantonSeleccionado !== null) {
      const idsParroquias = new Set(this.parroquiasDisponibles.map((parroquia) => Number(parroquia.id)));

      resultado = resultado.filter((recinto) => idsParroquias.has(Number(recinto.parroquia_id)));
    }

    if (this.parroquiaSeleccionada !== null) {
      resultado = resultado.filter((recinto) => Number(recinto.parroquia_id) === this.parroquiaSeleccionada);
    }

    const texto = this.busqueda.trim().toLowerCase();

    if (texto) {
      resultado = resultado.filter((recinto) => {
        const contenido = [recinto.nombre, recinto.direccion ?? '', recinto.referencia ?? ''].join(' ').toLowerCase();

        return contenido.includes(texto);
      });
    }

    return resultado;
  }

  // ==========================================
  // SELECTOR DE UBICACIÓN EN EL MAPA
  // ==========================================

  abrirSelectorUbicacion(): void {
    this.mostrarMapa = true;
    this.cdr.detectChanges();

    setTimeout(() => {
      if (!this.mapa) {
        this.inicializarMapa();
      }

      setTimeout(() => {
        this.mapa?.invalidateSize(true);
      }, 300);
    }, 200);
  }

  private inicializarMapa(): void {
    const elemento = this.mapaUbicacion?.nativeElement;

    if (!elemento) {
      console.error('No se encontró el contenedor del mapa.');
      return;
    }

    const latitudInicial = this.nuevoRecinto.latitud ?? -0.1807;
    const longitudInicial = this.nuevoRecinto.longitud ?? -78.4678;

    this.mapa = L.map(elemento, {
      center: [latitudInicial, longitudInicial],
      zoom: 15,
      zoomControl: true,
      scrollWheelZoom: true,
    });

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '&copy; OpenStreetMap contributors',
      maxZoom: 19,
    }).addTo(this.mapa);

    if (
      this.nuevoRecinto.latitud !== null &&
      this.nuevoRecinto.longitud !== null
    ) {
      this.actualizarMarcador(
        this.nuevoRecinto.latitud,
        this.nuevoRecinto.longitud
      );
    }

    this.mapa.on('click', (evento: L.LeafletMouseEvent) => {
      const latitud = Number(evento.latlng.lat.toFixed(7));
      const longitud = Number(evento.latlng.lng.toFixed(7));

      this.nuevoRecinto.latitud = latitud;
      this.nuevoRecinto.longitud = longitud;

      this.actualizarMarcador(latitud, longitud);

      this.cdr.detectChanges();
    });

    setTimeout(() => {
      this.mapa?.invalidateSize(true);
    }, 300);
  }

  private actualizarMarcador(latitud: number, longitud: number): void {
    if (!this.mapa) {
      return;
    }

    if (this.marcador) {
      this.marcador.setLatLng([latitud, longitud]);
    } else {
      this.marcador = L.circleMarker([latitud, longitud], {
        radius: 9,
        color: '#ffffff',
        weight: 3,
        fillColor: '#3880ff',
        fillOpacity: 1,
      }).addTo(this.mapa);
    }

    this.marcador.bindPopup('Ubicación seleccionada').openPopup();
  }

  cerrarSelectorUbicacion(): void {
    this.mostrarMapa = false;

    this.mapa?.remove();
    this.mapa = null;
    this.marcador = null;
  }
  // ==========================================
  // FORMULARIO DE REGISTRO
  // ==========================================

  abrirFormulario(): void {
    this.mostrarFormulario = true;
    this.mensajeError = '';
    this.mensajeExito = '';
  }

  cancelarFormulario(): void {
    this.mostrarFormulario = false;

    this.nuevoRecinto = {
      nombre: '',
      direccion: '',
      referencia: '',
      parroquia_id: null,
      capacidad_jrv: null,
      latitud: null,
      longitud: null,
    };
  }

  async guardarRecinto(): Promise<void> {
    this.mensajeError = '';
    this.mensajeExito = '';

    if (!this.nuevoRecinto.nombre.trim()) {
      this.mensajeError = 'Ingresa el nombre del recinto.';
      return;
    }

    if (this.nuevoRecinto.parroquia_id === null) {
      this.mensajeError = 'Selecciona una parroquia.';
      return;
    }

    if (
      !Number.isInteger(this.nuevoRecinto.capacidad_jrv) ||
      this.nuevoRecinto.capacidad_jrv === null ||
      this.nuevoRecinto.capacidad_jrv < 1 ||
      this.nuevoRecinto.capacidad_jrv > 500
    ) {
      this.mensajeError = 'Ingresa una cantidad de JRV entre 1 y 500.';
      return;
    }

    if (
      this.nuevoRecinto.latitud === null ||
      this.nuevoRecinto.longitud === null
    ) {
      this.mensajeError = 'Selecciona la ubicación del recinto en el mapa.';
      return;
    }

    if (this.provinciaSeleccionada === null || this.cantonSeleccionado === null) {
      this.mensajeError = 'Selecciona primero la provincia y el cantón.';
      return;
    }

    this.guardando = true;
    this.cdr.detectChanges();

    try {
      const recinto: Recinto = {
        nombre: this.nuevoRecinto.nombre.trim(),
        parroquia_id: Number(this.nuevoRecinto.parroquia_id),
        direccion: this.nuevoRecinto.direccion.trim(),
        referencia: this.nuevoRecinto.referencia.trim(),
        capacidad_jrv: this.nuevoRecinto.capacidad_jrv,
        latitud: this.nuevoRecinto.latitud ?? undefined,
        longitud: this.nuevoRecinto.longitud ?? undefined,
        activo: true,
      };

      const respuesta = await this.recintosService.crearRecinto(recinto);

      if (respuesta.error) {
        throw respuesta.error;
      }

      this.mensajeExito = 'Recinto registrado correctamente.';

      this.cancelarFormulario();

      // Actualizar listado
      await this.cargarDatosIniciales();
    } catch (error: any) {
      console.error('Error al registrar recinto:', error);

      this.mensajeError = error?.message || 'No fue posible registrar el recinto. Verifica los permisos.';
    } finally {
      this.guardando = false;
      this.cdr.detectChanges();
    }
  }

  obtenerNombreProvincia(provinciaId?: number): string {
    return this.provincias.find((provincia) => Number(provincia.id) === Number(provinciaId))?.nombre ?? 'Provincia';
  }
}
