import { Component, inject } from '@angular/core';
import {
  IonApp,
  IonRouterOutlet,
  IonIcon,
} from '@ionic/angular';

import { Router } from '@angular/router';

import { App } from '@capacitor/app';

import { addIcons } from 'ionicons';
import {
  moonOutline,
  sunnyOutline,
} from 'ionicons/icons';

import { ActasPendientesService } from './core/services/actas-pendientes.service';
import { ThemeService } from './core/services/theme.service';

@Component({
  selector: 'app-root',
  templateUrl: 'app.component.html',
  imports: [
    IonApp,
    IonRouterOutlet,
    IonIcon,
  ],
})
export class AppComponent {
  private readonly actasPendientes =
    inject(ActasPendientesService);

  private readonly router =
    inject(Router);

  protected readonly tema =
    inject(ThemeService);

  constructor() {
    addIcons({
      moonOutline,
      sunnyOutline,
    });

    this.configurarDeepLinks();
  }

  private configurarDeepLinks(): void {
    App.addListener(
      'appUrlOpen',
      async ({ url }) => {
        console.log(
          ' ENLACE RECIBIDO POR LA APP:',
          url,
        );

        try {
          const parsedUrl =
            new URL(url);

          console.log(
            ' HOST:',
            parsedUrl.host,
          );

          console.log(
            ' PATH:',
            parsedUrl.pathname,
          );

          console.log(
            ' SEARCH:',
            parsedUrl.search,
          );

          console.log(
            ' HASH:',
            parsedUrl.hash,
          );

          if (
            parsedUrl.host === 'auth' &&
            parsedUrl.pathname === '/callback'
          ) {
            const queryParams =
              parsedUrl.searchParams;

            const code =
              queryParams.get('code');

            if (code) {
              console.log(
                ' Código de autenticación recibido.',
              );

              // El procesamiento de la sesión
              // se realizará desde el servicio
              // de Supabase.
              await this.router.navigate(
                ['/cambio-password'],
                {
                  queryParams: {
                    code,
                  },
                },
              );

              return;
            }

            await this.router.navigate([
              '/home',
            ]);
          }
        } catch (error) {
          console.error(
            ' Error procesando Deep Link:',
            error,
          );
        }
      },
    );
  }
}