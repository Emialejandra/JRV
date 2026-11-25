export type Rol =
  | 'administrador'
  | 'coordinador_provincial'
  | 'coordinador_recinto'
  | 'veedor';

export interface Perfil {
  id: string;
  nombres: string;
  apellidos: string;
  cedula: string;
  telefono?: string;
  rol: Rol;
  activo: boolean;
  primer_acceso: boolean;
  created_at?: string;
  updated_at?: string;
  email?: string;
}