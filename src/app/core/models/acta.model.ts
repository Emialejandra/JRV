export type EstadoActa =
  | 'registrada'
  | 'validada'
  | 'observada'
  | 'rechazada';

export interface Acta {
  id: number;
  jrv_id: number;
  registrado_por: string;

  fotografia_url?: string;

  fecha_registro: string;

  latitud?: number;
  longitud?: number;

  total_votos_validos: number;
  total_votos_blancos: number;
  total_votos_nulos: number;
  total_votantes: number;

  observaciones?: string;

  estado: EstadoActa;

  created_at?: string;
  updated_at?: string;
}