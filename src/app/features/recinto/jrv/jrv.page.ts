import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';

import {
  IonHeader,
  IonToolbar,
  IonTitle,
  IonContent,
  IonButton,
  IonInput,
  IonSelect,
  IonSelectOption,
  IonItem,
  IonCard,
  IonCardHeader,
  IonCardTitle,
  IonCardContent,
  IonSpinner,
  IonText,
  IonBadge,
  IonLabel,
  IonNote, IonIcon
} from '@ionic/angular';

import { JrvService } from '../../../core/services/jrv.service';
import {
  Jrv,
  TipoJrv,
  EstadoJrv
} from '../../../core/models/jrv.model';

@Component({
  selector: 'app-jrv',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    IonHeader,
    IonToolbar,
    IonTitle,
    IonContent,
    IonButton,
    IonInput,
    IonSelect,
    IonSelectOption,
    IonItem,
    IonCard,
    IonCardHeader,
    IonCardTitle,
    IonCardContent,
    IonSpinner,
    IonText,
    IonNote,
    IonBadge,
    IonLabel, IonIcon
  ],
  templateUrl: './jrv.page.html',
  styleUrls: ['./jrv.page.scss']
})
export class JrvPage implements OnInit {
  volverDashboard() {
    this.router.navigateByUrl('/recinto/dashboard');
  }

  jrv: Jrv[] = [];

  recintoId: number | null = null;

  cargando = false;
  guardando = false;

  mensajeError = '';
  mensajeExito = '';

  mostrarFormulario = false;
  editando = false;

  jrvSeleccionada: Jrv | null = null;

  nuevaJrv: {
    numero: number | null;
    codigo: string;
    tipo: TipoJrv;
    estado: EstadoJrv;
  } = {
      numero: null,
      codigo: '',
      tipo: 'general',
      estado: 'pendiente'
    };

  constructor(
    private jrvService: JrvService,
    private cdr: ChangeDetectorRef,
    private router: Router
  ) { }

  async ngOnInit(): Promise<void> {
    await this.cargarJrv();
  }

  async cargarJrv(): Promise<void> {

    console.log(' JRV: iniciando carga');

    this.cargando = true;
    this.mensajeError = '';

    this.cdr.detectChanges();

    try {

      console.log('🔵 JRV: buscando recinto asignado...');

      this.recintoId =
        await this.jrvService.obtenerRecintoAsignado();

      console.log('🟢 JRV: recinto encontrado:', this.recintoId);

      if (this.recintoId === null) {
        throw new Error('No se encontró el recinto asignado.');
      }

      console.log('🔵 JRV: buscando JRV del recinto:', this.recintoId);

      const resultado =
        await this.jrvService.obtenerJrvPorRecinto(this.recintoId);

      this.jrv = [...resultado];

      console.log(' JRV: datos recibidos:', this.jrv);
      console.log(' JRV: cantidad:', this.jrv.length);

    } catch (error: any) {

      console.error(' JRV: error:', error);

      this.mensajeError =
        error?.message || 'No se pudieron cargar las JRV.';

    } finally {

      this.cargando = false;

      this.cdr.detectChanges();

      console.log(' JRV: carga finalizada');
    }
  }

  abrirFormulario(): void {

    this.mensajeError = '';
    this.mensajeExito = '';

    this.editando = false;
    this.jrvSeleccionada = null;

    this.nuevaJrv = {
      numero: null,
      codigo: '',
      tipo: 'general',
      estado: 'pendiente'
    };

    this.mostrarFormulario = true;
  }

  cancelarFormulario(): void {

    this.mostrarFormulario = false;
    this.editando = false;
    this.jrvSeleccionada = null;

    this.mensajeError = '';
  }

  editarJrv(jrv: Jrv): void {

    this.mensajeError = '';
    this.mensajeExito = '';

    this.editando = true;
    this.jrvSeleccionada = jrv;

    this.nuevaJrv = {
      numero: jrv.numero,
      codigo: jrv.codigo || '',
      tipo: jrv.tipo,
      estado: jrv.estado
    };

    this.mostrarFormulario = true;
  }

  async guardarJrv(): Promise<void> {

    this.mensajeError = '';
    this.mensajeExito = '';

    if (!this.recintoId) {
      this.mensajeError =
        'No se encontró el recinto asignado.';
      return;
    }

    if (
      this.nuevaJrv.numero === null ||
      this.nuevaJrv.numero <= 0
    ) {
      this.mensajeError =
        'Ingrese un número de JRV válido.';
      return;
    }

    this.guardando = true;

    try {

      if (this.editando && this.jrvSeleccionada) {

        await this.jrvService.actualizarJrv(
          this.jrvSeleccionada.id,
          {
            numero: this.nuevaJrv.numero,
            codigo: this.nuevaJrv.codigo || undefined,
            tipo: this.nuevaJrv.tipo,
            estado: this.nuevaJrv.estado
          }
        );

        this.mensajeExito =
          'JRV actualizada correctamente.';

      } else {

        const existe =
          this.jrv.some(
            item =>
              item.numero === this.nuevaJrv.numero
          );

        if (existe) {
          this.mensajeError =
            'Ya existe una JRV con ese número en este recinto.';
          return;
        }

        await this.jrvService.crearJrv({
          recinto_id: this.recintoId,
          numero: this.nuevaJrv.numero,
          codigo: this.nuevaJrv.codigo || undefined,
          tipo: this.nuevaJrv.tipo,
          estado: this.nuevaJrv.estado
        });

        this.mensajeExito =
          'JRV registrada correctamente.';
      }

      this.mostrarFormulario = false;
      this.editando = false;
      this.jrvSeleccionada = null;

      await this.cargarJrv();

    } catch (error: any) {

      console.error('Error guardando JRV:', error);

      if (
        error.code === '23505'
      ) {
        this.mensajeError =
          'Ya existe una JRV con ese número en este recinto.';
      } else {
        this.mensajeError =
          error.message ||
          'No se pudo guardar la JRV.';
      }

    } finally {

      this.guardando = false;

    }
  }

  async eliminarJrv(jrv: Jrv): Promise<void> {

    const confirmar =
      window.confirm(
        `¿Está seguro de eliminar la JRV ${jrv.numero}?`
      );

    if (!confirmar) {
      return;
    }

    this.mensajeError = '';
    this.mensajeExito = '';

    try {

      await this.jrvService.eliminarJrv(jrv.id);

      this.mensajeExito =
        'JRV eliminada correctamente.';

      await this.cargarJrv();

    } catch (error: any) {

      console.error('Error eliminando JRV:', error);

      this.mensajeError =
        error.message ||
        'No se pudo eliminar la JRV.';
    }
  }

  obtenerColorEstado(estado: EstadoJrv): string {

    switch (estado) {

      case 'asignada':
        return 'warning';

      case 'procesada':
        return 'success';

      case 'cerrada':
        return 'medium';

      default:
        return 'primary';
    }
  }

  obtenerTextoEstado(estado: EstadoJrv): string {

    switch (estado) {

      case 'asignada':
        return 'Asignada';

      case 'procesada':
        return 'Procesada';

      case 'cerrada':
        return 'Cerrada';

      default:
        return 'Pendiente';
    }
  }

  obtenerTextoTipo(tipo: TipoJrv): string {

    return tipo === 'preferente'
      ? 'Preferente'
      : 'General';
  }
}