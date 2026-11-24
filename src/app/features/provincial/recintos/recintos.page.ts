import { Component } from '@angular/core';
import {
  IonHeader,
  IonToolbar,
  IonTitle,
  IonContent
} from '@ionic/angular';

@Component({
  selector: 'app-recintos-provincial',
  standalone: true,
  imports: [
    IonHeader,
    IonToolbar,
    IonTitle,
    IonContent
  ],
  template: `
<ion-header>
      <ion-toolbar>
        <ion-title>Gestión de recintos</ion-title>
      </ion-toolbar>
    </ion-header>

    <ion-content class="ion-padding">
      <h2>Gestión de recintos</h2>
      <p>Módulo pendiente de implementación.</p>
    </ion-content>
  `
})
export class RecintosPage {}
