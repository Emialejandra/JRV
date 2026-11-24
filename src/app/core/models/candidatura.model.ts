export type Dignidad = 'alcaldia' | 'prefectura';

export interface Candidatura {
  id: number;
  organizacion_id: number;
  nombres: string;
  apellidos: string;
  dignidad: Dignidad;
  numero_lista?: string;
  foto_url?: string;
  activo: boolean;
  created_at?: string;
}