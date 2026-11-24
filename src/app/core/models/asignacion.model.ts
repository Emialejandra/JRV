export type TipoAsignacion =
  | 'coordinador_provincial'
  | 'coordinador_recinto'
  | 'veedor';

export interface Asignacion {
  id: number;
  perfil_id: string;
  provincia_id?: number;
  recinto_id?: number;
  jrv_id?: number;
  tipo_asignacion: TipoAsignacion;
  fecha_asignacion: string;
  activo: boolean;
  created_at?: string;
  updated_at?: string;
}