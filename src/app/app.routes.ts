import type { Routes } from '@angular/router';
import { authGuard } from './core/guards/auth.guards';
import { roleGuard } from './core/guards/role.guard';

export const routes: Routes = [

  // Página pública
  {
    path: 'home',
    loadComponent: () =>
      import('./home/home.page').then((m) => m.HomePage),
  },

  // Autenticación
  {
    path: 'login',
    loadComponent: () =>
      import('./features/auth/login/login.page')
        .then((m) => m.LoginPage),
  },

  {
    path: 'recuperar-password',
    loadComponent: () =>
      import('./features/auth/recuperar-password/recuperar-password.page')
        .then((m) => m.RecuperarPasswordPage),
  },

  {
    path: 'cambio-password',
    canActivate: [authGuard],
    loadComponent: () =>
      import('./features/auth/cambio-password/cambio-password.page')
        .then((m) => m.CambioPasswordPage),
  },

  // Área provincial
  {
    path: 'provincial',
    canActivate: [authGuard, roleGuard],
    data: {
      roles: [
        'administrador',
        'coordinador_provincial'
      ]
    },
    children: [
      {
        path: 'dashboard',
        loadComponent: () =>
          import('./features/provincial/dashboard/dashboard.page')
            .then((m) => m.DashboardPage),
      },
      {
        path: 'recintos',
        loadComponent: () =>
          import('./features/provincial/recintos/recintos.page')
            .then((m) => m.RecintosPage),
      },
      {
        path: 'coordinadores',
        loadComponent: () =>
          import('./features/provincial/coordinadores/coordinadores.page')
            .then((m) => m.CoordinadoresPage),
      },
    ],
  },

  // Área del coordinador de recinto
  {
    path: 'recinto',
    canActivate: [authGuard, roleGuard],
    data: {
      roles: [
        'coordinador_recinto'
      ]
    },
    children: [
      // Estas páginas todavía las implementaremos.
      {
        path: 'dashboard',
        loadComponent: () =>
          import('./features/recinto/dashboard/dashboard.page')
            .then((m) => m.DashboardPage),
      },
      {
        path: 'jrv',
        loadComponent: () =>
          import('./features/recinto/jrv/jrv.page')
            .then((m) => m.JrvPage),
      },
      {
        path: 'veedores',
        loadComponent: () =>
          import('./features/recinto/veedores/veedores.page')
            .then((m) => m.VeedoresPage),
      },
    ],
  },

  // Área del veedor
  {
    path: 'veedor',
    canActivate: [authGuard, roleGuard],
    data: {
      roles: [
        'veedor'
      ]
    },
    children: [
      {
        path: 'mesas',
        loadComponent: () =>
          import('./features/veedor/mesas/mesas.page')
            .then((m) => m.MesasPage),
      },
      {
        path: 'actas/registrar',
        loadComponent: () =>
          import('./features/veedor/actas/registrar-acta/registrar-acta.page')
            .then((m) => m.RegistrarActaPage),
      },
      {
        path: 'actas/detalle',
        loadComponent: () =>
          import('./features/veedor/actas/detalle-acta/detalle-acta.page')
            .then((m) => m.DetalleActaPage),
      },
    ],
  },

  // Acceso denegado
  {
    path: 'acceso-denegado',
    loadComponent: () =>
      import('./home/home.page').then((m) => m.HomePage),
  },

  // Ruta por defecto
  {
    path: '',
    redirectTo: 'home',
    pathMatch: 'full',
  },

  {
    path: '**',
    redirectTo: 'home',
  },
];