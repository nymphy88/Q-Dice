
export enum GamePhase {
  BETTING = 'BETTING',
  PLAYER_TURN = 'PLAYER_TURN',
  DEALER_TURN = 'DEALER_TURN',
  QUANTUM_CHOICE = 'QUANTUM_CHOICE',
  QUANTUM_ROLLING = 'QUANTUM_ROLLING',
  RESULT = 'RESULT'
}

export type DieResult = 1 | 2 | 3 | 4 | 5 | 6;

export interface GameState {
  phase: GamePhase;
  playerDice: DieResult[];
  dealerDice: DieResult[];
  balance: number;
  currentBet: number;
  survivorBonus: number;
  message: string;
  dealerThinking: boolean;
  isQuantumGambleActive: boolean;
  isCounterActive: boolean; // Tracks if "Counter" was pre-selected
}

export interface DealerCommentary {
  text: string;
  mood: 'taunt' | 'surprised' | 'neutral' | 'aggressive';
}
