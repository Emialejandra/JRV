import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';
import { IonButton, IonContent, IonHeader, IonTitle, IonToolbar } from '@ionic/angular';

@Component({
  standalone: true,
  imports: [RouterLink, IonButton, IonContent, IonHeader, IonTitle, IonToolbar],
  template: `
    <ion-header
      ><ion-toolbar color="primary"><ion-title>Acceso restringido</ion-title></ion-toolbar></ion-header
    >
    <ion-content class="ion-padding">
      <main>
        <span class="mark">!</span>
        <h1>No tienes acceso a esta sección</h1>
        <p>Inicia sesión con una cuenta autorizada para continuar o vuelve a la página principal.</p>
        <ion-button expand="block" routerLink="/login">Ir al inicio de sesión</ion-button>
      </main>
    </ion-content>
  `,
  styles: [
    `
      main {
        max-width: 420px;
        margin: 14vh auto 0;
        text-align: center;
        padding: 28px 20px;
        background: #fff;
        border: 1px solid #e7edf4;
        border-radius: 24px;
        box-shadow: 0 16px 42px #16386314;
      }
      .mark {
        margin: auto auto 18px;
        width: 52px;
        height: 52px;
        display: grid;
        place-items: center;
        border-radius: 17px;
        background: #fff2e8;
        color: #a75121;
        font-size: 24px;
        font-weight: 800;
      }
      h1 {
        font-size: 24px;
        font-weight: 800;
        color: #172b4d;
      }
      p {
        font-size: 14px;
        color: #718096;
        line-height: 1.6;
        margin-bottom: 24px;
      }
      ion-button {
        --border-radius: 12px;
        min-height: 48px;
        font-weight: 700;
      }
    `,
  ],
})
export class AccesoDenegadoPage {}
