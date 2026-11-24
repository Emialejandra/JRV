export interface Organizacion {
  id: number;
  nombre: string;
  sigla?: string;
  numero_lista?: string;
  logo_url?: string;
  activo: boolean;
  created_at?: string;
}