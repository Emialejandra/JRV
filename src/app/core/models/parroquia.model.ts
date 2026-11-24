export type TipoParroquia = 'urbana' | 'rural';

export interface Parroquia {
  id: number;
  canton_id: number;
  nombre: string;
  codigo?: string;
  tipo: TipoParroquia;
  created_at?: string;
}