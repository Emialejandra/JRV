export interface DetalleVoto {
  id: number;
  acta_id: number;
  candidatura_id: number;
  cantidad_votos: number;
  created_at?: string;
}