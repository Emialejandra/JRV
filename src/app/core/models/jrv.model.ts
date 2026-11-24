export type TipoJrv = 'general' | 'preferente';

export type EstadoJrv =
  | 'pendiente'
  | 'asignada'
  | 'procesada'
  | 'cerrada';

export interface Jrv {
  id: number;
  recinto_id: number;
  numero: number;
  codigo?: string;
  tipo: TipoJrv;
  estado: EstadoJrv;
  created_at?: string;
}