export interface Recinto {
  id?: number;
  parroquia_id: number;
  nombre: string;
  direccion?: string;
  referencia?: string;
  latitud?: number;
  longitud?: number;
  capacidad_jrv?: number;
  cne_zona?: string | null;
  cne_cda?: boolean | null;
  juntas_femeninas?: number | null;
  juntas_masculinas?: number | null;
  electores?: number | null;
  dificil_acceso?: boolean | null;
  sin_conectividad?: boolean | null;
  activo: boolean;
  provincia_id?: number;
  canton?: { id: number; nombre: string } | null;
  parroquia?: { id: number; nombre: string; canton_id: number } | null;
  created_at?: string;
}
