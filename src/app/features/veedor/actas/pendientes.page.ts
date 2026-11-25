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
  templateUrl: './pendientes.page.html',
  styleUrls: ['./pendientes.page.scss'],
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
