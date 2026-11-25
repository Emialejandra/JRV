
import { Component, inject } from '@angular/core';
import { IonApp, IonRouterOutlet, IonIcon } from '@ionic/angular';
import { addIcons } from 'ionicons';
import { moonOutline, sunnyOutline } from 'ionicons/icons';
import { ActasPendientesService } from './core/services/actas-pendientes.service';
import { ThemeService } from './core/services/theme.service';

@Component({
  selector: 'app-root',
  templateUrl: 'app.component.html',
  imports: [IonApp, IonRouterOutlet, IonIcon],
})
export class AppComponent {
  private readonly actasPendientes = inject(ActasPendientesService);
  protected readonly tema = inject(ThemeService);

  constructor() {
    addIcons({ moonOutline, sunnyOutline });
  }
}
