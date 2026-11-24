import { Component } from '@angular/core';
import {
  IonHeader,
  IonToolbar,
  IonTitle,
  IonContent
} from '@ionic/angular';

@Component({
  selector: 'app-coordinadores',
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
        <ion-title>Gestión de coordinadores</ion-title>
      </ion-toolbar>
    </ion-header>

    <ion-content class="ion-padding">
      <h2>Gestión de coordinadores</h2>
      <p>Módulo pendiente de implementación.</p>
    </ion-content>
  `
})
export class CoordinadoresPage {}
