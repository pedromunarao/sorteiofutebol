export type Position = 'ZAG' | 'ATA' | 'MEIA' | 'ESTRELAS';

export interface Player {
  id: string;
  name: string;
  position: Position;
  rating: number;
}

export interface Team {
  name: string;
  players: Player[];
  averageRating: number;
}