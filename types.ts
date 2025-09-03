
export enum GameState {
  SELECTING_DIFFICULTY = 'SELECTING_DIFFICULTY',
  PLAYING = 'PLAYING',
  GAME_OVER = 'GAME_OVER',
}

export interface Difficulty {
  name: string;
  threshold: number;
  multiplier: number;
}

export interface GameAttempt {
  previousWord: string;
  newWord: string;
  similarity: number;
  success: boolean;
  requiredThreshold: number;
  points: number;
}
