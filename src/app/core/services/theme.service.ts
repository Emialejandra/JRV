import { Injectable, signal } from '@angular/core';

const STORAGE_KEY = 'jrv-theme';

@Injectable({ providedIn: 'root' })
export class ThemeService {
  readonly oscuro = signal(false);

  constructor() {
    let guardado: string | null = null;
    try {
      guardado = localStorage.getItem(STORAGE_KEY);
    } catch {}
    const prefiereOscuro = window.matchMedia?.('(prefers-color-scheme: dark)').matches ?? false;
    this.aplicar(guardado ? guardado === 'dark' : prefiereOscuro);
  }

  alternar(): void {
    this.aplicar(!this.oscuro());
    try {
      localStorage.setItem(STORAGE_KEY, this.oscuro() ? 'dark' : 'light');
    } catch {}
  }

  private aplicar(oscuro: boolean): void {
    this.oscuro.set(oscuro);
    document.documentElement.classList.toggle('ion-palette-dark', oscuro);
  }
}
