export type Position = 'ZAG' | 'ATA' | 'MEIA' | 'ESTRELAS';

export interface Player {
  id: string;
  name: string;
  position: Position;
  rating: number;
}

export interface Team {
  includes(draggedPlayer: Player): unknown;
  name: string;
  players: Player[];
  averageRating: number;
}