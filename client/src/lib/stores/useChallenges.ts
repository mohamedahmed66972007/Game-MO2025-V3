import { create } from "zustand";

export type ChallengeType = "guess" | "memory" | "reaction";
export type ChallengePhase = "menu" | "playing" | "won" | "lost";
export type HintType = "digit" | "description";

export interface Hint {
  type: HintType;
  value: string | number;
  position?: number;
}

interface ChallengeAttempt {
  challengeId: ChallengeType;
  success: boolean;
  timestamp: number;
}

interface GuessChallenge {
  sequence: number[];
  playerSequence: number[];
  currentLevel: number;
  isShowingSequence: boolean;
}

interface MemoryChallenge {
  currentLevel: number;
  gridSize: number;
  flashedCells: number[];
  selectedCells: number[];
  isShowingCells: boolean;
}

interface ReactionChallenge {
  timeRemaining: number;
  score: number;
  errors: number;
  currentTarget: number | null;
  gridSize: number;
  speed: number;
}

interface ChallengesState {
  maxAttempts: number;
  attempts: ChallengeAttempt[];
  selectedChallenge: ChallengeType | null;
  currentPhase: ChallengePhase;
  hint: Hint | null;
  
  guessChallenge: GuessChallenge;
  memoryChallenge: MemoryChallenge;
  reactionChallenge: ReactionChallenge;

  selectChallenge: (challengeId: ChallengeType) => void;
  startChallenge: () => void;
  completeChallenge: (success: boolean) => void;
  resetToMenu: () => void;
  resetChallengesHub: () => void;
  getRemainingAttempts: () => number;
  hasWonAnyChallenge: () => boolean;
  canPlayChallenge: (challengeId: ChallengeType) => boolean;
  generateHint: (secretCode: number[]) => void;

  guessAddToSequence: (buttonIndex: number) => void;
  guessNextLevel: () => void;
  guessSetShowingSequence: (showing: boolean) => void;

  memoryFlashCells: (cells: number[]) => void;
  memorySelectCell: (cell: number) => void;
  memoryCheckSelection: () => boolean;
  memoryNextLevel: () => void;

  reactionStartGame: () => void;
  reactionClickCell: (cell: number) => void;
  reactionUpdateTimer: () => void;
  reactionSpawnTarget: () => void;
}

const generateSequence = (level: number): number[] => {
  const length = 3 + level;
  return Array.from({ length }, () => Math.floor(Math.random() * 8));
};

const generateRandomHint = (secretCode: number[]): Hint => {
  const numDigits = secretCode.length;
  const hintChoice = Math.random();
  
  if (hintChoice < 0.4) {
    const position = Math.floor(Math.random() * numDigits);
    const digit = secretCode[position];
    return {
      type: "digit",
      value: digit,
      position,
    };
  } else if (hintChoice < 0.7) {
    const position = Math.floor(Math.random() * numDigits);
    const digit = secretCode[position];
    const isEven = digit % 2 === 0;
    const parity = isEven ? 'زوجي' : 'فردي';
    
    return {
      type: "description",
      value: `الخانة ${position + 1} رقم ${parity}`,
    };
  } else {
    const positions = [];
    const availablePositions = Array.from({ length: numDigits }, (_, i) => i);
    
    const pos1Index = Math.floor(Math.random() * availablePositions.length);
    const pos1 = availablePositions[pos1Index];
    availablePositions.splice(pos1Index, 1);
    
    const pos2Index = Math.floor(Math.random() * availablePositions.length);
    const pos2 = availablePositions[pos2Index];
    
    const digit1 = secretCode[pos1];
    const digit2 = secretCode[pos2];
    const parity1 = digit1 % 2 === 0 ? 'زوجي' : 'فردي';
    const parity2 = digit2 % 2 === 0 ? 'زوجي' : 'فردي';
    
    const hint1 = `الخانة ${pos1 + 1} رقم ${parity1}`;
    const hint2 = `الخانة ${pos2 + 1} رقم ${parity2}`;
    
    return {
      type: "description",
      value: `${hint1} و ${hint2}`,
    };
  }
};

export const useChallenges = create<ChallengesState>()((set, get) => ({
  maxAttempts: 3,
  attempts: [],
  selectedChallenge: null,
  currentPhase: "menu",
  hint: null,
  
  guessChallenge: {
    sequence: [],
    playerSequence: [],
    currentLevel: 0,
    isShowingSequence: false,
  },
  
  memoryChallenge: {
    currentLevel: 1,
    gridSize: 3,
    flashedCells: [],
    selectedCells: [],
    isShowingCells: false,
  },
  
  reactionChallenge: {
    timeRemaining: 45,
    score: 0,
    errors: 0,
    currentTarget: null,
    gridSize: 5,
    speed: 2000,
  },

  selectChallenge: (challengeId) => {
    set({ selectedChallenge: challengeId });
  },

  startChallenge: () => {
    const { selectedChallenge } = get();
    if (!selectedChallenge) return;

    set({ currentPhase: "playing" });

    if (selectedChallenge === "guess") {
      const sequence = generateSequence(0);
      set({
        guessChallenge: {
          sequence,
          playerSequence: [],
          currentLevel: 0,
          isShowingSequence: true,
        },
      });
    } else if (selectedChallenge === "memory") {
      set({
        memoryChallenge: {
          currentLevel: 1,
          gridSize: 3,
          flashedCells: [],
          selectedCells: [],
          isShowingCells: false,
        },
      });
    } else if (selectedChallenge === "reaction") {
      set({
        reactionChallenge: {
          timeRemaining: 45,
          score: 0,
          errors: 0,
          currentTarget: null,
          gridSize: 5,
          speed: 2000,
        },
      });
    }
  },

  completeChallenge: (success) => {
    const { selectedChallenge, attempts } = get();
    if (!selectedChallenge) return;

    const newAttempt: ChallengeAttempt = {
      challengeId: selectedChallenge,
      success,
      timestamp: Date.now(),
    };

    set({
      attempts: [...attempts, newAttempt],
      currentPhase: success ? "won" : "lost",
    });
  },

  resetToMenu: () => {
    set({
      selectedChallenge: null,
      currentPhase: "menu",
    });
  },

  resetChallengesHub: () => {
    set({
      maxAttempts: 3,
      attempts: [],
      selectedChallenge: null,
      currentPhase: "menu",
      hint: null,
      guessChallenge: {
        sequence: [],
        playerSequence: [],
        currentLevel: 0,
        isShowingSequence: false,
      },
      memoryChallenge: {
        currentLevel: 1,
        gridSize: 3,
        flashedCells: [],
        selectedCells: [],
        isShowingCells: false,
      },
      reactionChallenge: {
        timeRemaining: 45,
        score: 0,
        errors: 0,
        currentTarget: null,
        gridSize: 5,
        speed: 2000,
      },
    });
  },

  getRemainingAttempts: () => {
    const { attempts, maxAttempts } = get();
    return maxAttempts - attempts.filter(a => !a.success).length;
  },

  hasWonAnyChallenge: () => {
    const { attempts } = get();
    return attempts.some(a => a.success);
  },

  canPlayChallenge: (challengeId) => {
    const { attempts, maxAttempts, hasWonAnyChallenge, getRemainingAttempts } = get();
    
    if (hasWonAnyChallenge()) return false;
    
    if (getRemainingAttempts() <= 0) return false;
    
    const hasWon = attempts.some(a => a.challengeId === challengeId && a.success);
    if (hasWon) return false;
    
    return true;
  },

  generateHint: (secretCode) => {
    const hint = generateRandomHint(secretCode);
    set({ hint });
  },

  guessAddToSequence: (buttonIndex) => {
    const { guessChallenge } = get();
    const { playerSequence, sequence, currentLevel } = guessChallenge;

    const newPlayerSequence = [...playerSequence, buttonIndex];
    const currentIndex = playerSequence.length;

    if (sequence[currentIndex] !== buttonIndex) {
      get().completeChallenge(false);
      return;
    }

    set({
      guessChallenge: {
        ...guessChallenge,
        playerSequence: newPlayerSequence,
      },
    });

    if (newPlayerSequence.length === sequence.length) {
      const nextLevelNum = currentLevel + 1;
      if (nextLevelNum >= 5) {
        setTimeout(() => {
          get().completeChallenge(true);
        }, 500);
      } else {
        setTimeout(() => {
          get().guessNextLevel();
        }, 1000);
      }
    }
  },

  guessNextLevel: () => {
    const { guessChallenge } = get();
    const newLevel = guessChallenge.currentLevel + 1;
    const newSequence = generateSequence(newLevel);

    set({
      guessChallenge: {
        ...guessChallenge,
        currentLevel: newLevel,
        sequence: newSequence,
        playerSequence: [],
        isShowingSequence: true,
      },
    });
  },

  guessSetShowingSequence: (showing) => {
    const { guessChallenge } = get();
    set({
      guessChallenge: {
        ...guessChallenge,
        isShowingSequence: showing,
      },
    });
  },

  memoryFlashCells: (cells) => {
    const { memoryChallenge } = get();
    set({
      memoryChallenge: {
        ...memoryChallenge,
        flashedCells: cells,
        selectedCells: [],
        isShowingCells: true,
      },
    });
  },

  memorySelectCell: (cell) => {
    const { memoryChallenge } = get();
    if (memoryChallenge.selectedCells.includes(cell)) return;

    set({
      memoryChallenge: {
        ...memoryChallenge,
        selectedCells: [...memoryChallenge.selectedCells, cell],
      },
    });
  },

  memoryCheckSelection: () => {
    const { memoryChallenge } = get();
    const { flashedCells, selectedCells } = memoryChallenge;

    if (selectedCells.length !== flashedCells.length) return false;

    for (const cell of selectedCells) {
      if (!flashedCells.includes(cell)) {
        get().completeChallenge(false);
        return false;
      }
    }

    return true;
  },

  memoryNextLevel: () => {
    const { memoryChallenge } = get();
    const newLevel = memoryChallenge.currentLevel + 1;

    if (newLevel > 5) {
      get().completeChallenge(true);
      return;
    }

    set({
      memoryChallenge: {
        ...memoryChallenge,
        currentLevel: newLevel,
        gridSize: 5,
        flashedCells: [],
        selectedCells: [],
        isShowingCells: false,
      },
    });
  },

  reactionStartGame: () => {
    set({
      reactionChallenge: {
        timeRemaining: 45,
        score: 0,
        errors: 0,
        currentTarget: null,
        gridSize: 5,
        speed: 1500,
      },
    });
  },

  reactionClickCell: (cell) => {
    const { reactionChallenge } = get();
    if (reactionChallenge.currentTarget === cell) {
      set({
        reactionChallenge: {
          ...reactionChallenge,
          score: reactionChallenge.score + 1,
          currentTarget: null,
        },
      });
    } else {
      const newErrors = reactionChallenge.errors + 1;
      if (newErrors >= 5) {
        get().completeChallenge(false);
      } else {
        set({
          reactionChallenge: {
            ...reactionChallenge,
            errors: newErrors,
          },
        });
      }
    }
  },

  reactionUpdateTimer: () => {
    const { reactionChallenge } = get();
    const newTime = reactionChallenge.timeRemaining - 1;

    if (newTime <= 0) {
      const totalSpawns = Math.floor(45 / (reactionChallenge.speed / 1000));
      const maxAllowedMisses = 5;
      const minScore = totalSpawns - maxAllowedMisses;
      
      if (reactionChallenge.errors < 5 && reactionChallenge.score >= minScore) {
        get().completeChallenge(true);
      } else {
        get().completeChallenge(false);
      }
    } else {
      set({
        reactionChallenge: {
          ...reactionChallenge,
          timeRemaining: newTime,
        },
      });
    }
  },

  reactionSpawnTarget: () => {
    const { reactionChallenge } = get();
    const totalCells = reactionChallenge.gridSize * reactionChallenge.gridSize;
    const randomCell = Math.floor(Math.random() * totalCells);

    set({
      reactionChallenge: {
        ...reactionChallenge,
        currentTarget: randomCell,
      },
    });
  },
}));
