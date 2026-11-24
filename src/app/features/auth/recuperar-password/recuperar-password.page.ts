import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import {
  FormBuilder,
  FormGroup,
  ReactiveFormsModule,
  Validators
} from '@angular/forms';
import {
  IonHeader,
  IonToolbar,
  IonTitle,
  IonContent,
  IonButton,
  IonInput,
  IonItem,
  IonText,
  IonSpinner
} from '@ionic/angular';
import { Router } from '@angular/router';

import { AuthService } from '../../../core/services/auth.service';

@Component({
  selector: 'app-recuperar-password',
  standalone: true,
  imports: [
    IonHeader,
    IonToolbar,
    IonTitle,
    IonContent,
    IonButton,
    IonInput,
    IonItem,
    IonText,
    IonSpinner,
    ReactiveFormsModule,
    CommonModule
  ],
  templateUrl: './recuperar-password.page.html',
  styleUrls: ['./recuperar-password.page.scss']
})
export class RecuperarPasswordPage {

  formulario: FormGroup;
  cargando = false;
  mensajeError = '';
  mensajeExito = '';

  constructor(
    private fb: FormBuilder,
    private authService: AuthService,
    private router: Router
  ) {
    this.formulario = this.fb.group({
      email: ['', [
        Validators.required,
        Validators.email
      ]]
    });
  }

  async recuperarPassword() {

    this.mensajeError = '';
    this.mensajeExito = '';

    if (this.formulario.invalid) {
      this.formulario.markAllAsTouched();
      return;
    }

    this.cargando = true;

    try {

      await this.authService.enviarRecuperacionPassword(
        this.formulario.value.email
      );

      this.mensajeExito =
        'Se ha enviado un enlace de recuperación al correo indicado.';

    } catch (error: any) {

      console.error(
        'Error al recuperar contraseña:',
        error
      );

      this.mensajeError =
        error?.message ||
        'No fue posible enviar el correo de recuperación.';

    } finally {
      this.cargando = false;
    }
  }

  volverLogin() {
    this.router.navigate(['/login']);
  }
}