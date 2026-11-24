export interface Recinto {
  id: number;
  parroquia_id: number;
  nombre: string;
  direccion?: string;
  referencia?: string;
  latitud?: number;
  longitud?: number;
  capacidad_jrv?: number;
  activo: boolean;
  created_at?: string;
}