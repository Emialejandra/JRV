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
    selector: 'app-login',
    templateUrl: './login.page.html',
    styleUrls: ['./login.page.scss'],
    standalone: true,
    imports: [
        CommonModule,
        IonHeader,
        IonToolbar,
        IonTitle,
        IonContent,
        IonButton,
        IonInput,
        IonItem,
        IonText,
        IonSpinner,
        ReactiveFormsModule
    ]
})
export class LoginPage {

    formulario: FormGroup;
    cargando = false;
    mensajeError = '';

    constructor(
        private fb: FormBuilder,
        private authService: AuthService,
        private perfilesService: PerfilesService,
        private router: Router
    ) {
        this.formulario = this.fb.group({
            cedula: ['', [
                Validators.required,
                Validators.pattern(/^\d{10}$/)
            ]],

            password: ['', [
                Validators.required,
                Validators.minLength(6)
            ]]
        });
    }

    async iniciarSesion() {

        this.mensajeError = '';

        if (this.formulario.invalid) {
            this.formulario.markAllAsTouched();
            return;
        }

        this.cargando = true;

        try {

            const { user } = await this.authService.iniciarSesion(
                this.formulario.value.cedula,
                this.formulario.value.password
            );

            if (!user) {
                throw new Error(
                    'No se pudo obtener el usuario autenticado.'
                );
            }

            const perfil =
                await this.perfilesService.obtenerMiPerfil();

            if (!perfil) {
                await this.authService.cerrarSesion();

                throw new Error(
                    'No existe un perfil asociado al usuario.'
                );
            }

            if (!perfil.activo) {
                await this.authService.cerrarSesion();

                throw new Error(
                    'El usuario se encuentra inactivo.'
                );
            }

            if (perfil.primer_acceso) {

                await this.router.navigateByUrl(
                    '/cambio-password',
                    { replaceUrl: true }
                );

                return;
            }

            await this.router.navigateByUrl(
                this.obtenerRutaPorRol(perfil.rol),
                { replaceUrl: true }
            );

        } catch (error: any) {

            console.error(
                'Error al iniciar sesión:',
                error
            );

            this.mensajeError =
                error?.message ||
                'No fue posible iniciar sesión. Verifica tus credenciales.';

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

    irARecuperarPassword() {
        this.router.navigate(['/recuperar-password']);
    }
}