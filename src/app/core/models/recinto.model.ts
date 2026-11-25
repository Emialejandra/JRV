export interface Recinto {
  id?: number;
  parroquia_id: number;
  nombre: string;
  direccion?: string;
  referencia?: string;
  latitud?: number;
  longitud?: number;
  capacidad_jrv?: number;
  activo: boolean;
  provincia_id?: number;
  canton?: { id: number; nombre: string } | null;
  parroquia?: { id: number; nombre: string; canton_id: number } | null;
  created_at?: string;
}
