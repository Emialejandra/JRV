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
import { PerfilesService } from '../../../core/services/perfiles.service';

@Component({
  selector: 'app-cambio-password',
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
  templateUrl: './cambio-password.page.html',
  styleUrls: ['./cambio-password.page.scss']
})
export class CambioPasswordPage {

    formulario: FormGroup;
    cargando = false;
    mensajeError = '';
    mensajeExito = '';

    constructor(
        private fb: FormBuilder,
        private authService: AuthService,
        private perfilesService: PerfilesService,
        private router: Router
    ) {
        this.formulario = this.fb.group({
            password: ['', [
                Validators.required,
                Validators.minLength(8)
            ]],

            confirmarPassword: ['', [
                Validators.required
            ]]
        });
    }

    async cambiarPassword() {
        this.mensajeError = '';
        this.mensajeExito = '';

        if (this.formulario.invalid) {
            this.formulario.markAllAsTouched();
            return;
        }

        const password =
            this.formulario.get('password')?.value;

        const confirmarPassword =
            this.formulario.get('confirmarPassword')?.value;

        if (password !== confirmarPassword) {
            this.mensajeError = 'Las contraseñas no coinciden.';
            return;
        }

        this.cargando = true;

        try {
            await this.authService.cambiarPassword(password);

            this.mensajeExito =
                'Contraseña actualizada correctamente.';

            const perfil =
                await this.perfilesService.obtenerMiPerfil();

            if (!perfil) {
                throw new Error(
                    'No se pudo obtener el perfil del usuario.'
                );
            }

            await this.router.navigateByUrl(
                this.obtenerRutaPorRol(perfil.rol),
                { replaceUrl: true }
            );

        } catch (error: any) {

            console.error(
                'Error al cambiar contraseña:',
                error
            );

            this.mensajeError =
                error?.message ||
                'No fue posible cambiar la contraseña.';

        } finally {
            this.cargando = false;
        }
    }

    private obtenerRutaPorRol(rol: string): string {

        switch (rol) {

            case 'administrador':
            case 'coordinador_provincial':
                return '/provincial/dashboard';

            case 'coordinador_recinto':
                return '/recinto/dashboard';

            case 'veedor':
                return '/veedor/mesas';

            default:
                return '/acceso-denegado';
        }
    }
}