import { create } from "zustand";

export type ChallengeType = "guess" | "memory" | "direction";
export type ChallengeCategory = "memory" | "reaction";
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
  showingScanner: boolean;
  showingSuccess: boolean;
}

export type DirectionType = "right" | "left" | "up" | "down" | "notRight" | "notLeft" | "notUp" | "notDown" | "nothing";
export type ColorDirection = "green" | "yellow" | "blue" | "red";
export type ColorPosition = {
  yellow: 'left' | 'right' | 'top' | 'bottom';
  green: 'left' | 'right' | 'top' | 'bottom';
  blue: 'left' | 'right' | 'top' | 'bottom';
  red: 'left' | 'right' | 'top' | 'bottom';
};

interface DirectionChallenge {
  currentDirection: DirectionType | null;
  currentColor: ColorDirection | null;
  useColors: boolean;
  colorPositions: ColorPosition | null;
  score: number;
  errors: number;
  maxErrors: number;
  timePerRound: number;
  roundStartTime: number | null;
  isWaiting: boolean;
  gameTime: number;
  totalRounds: number;
  currentRound: number;
}

interface ChallengesState {
  maxAttempts: number;
  attempts: ChallengeAttempt[];
  selectedChallenge: ChallengeType | null;
  currentPhase: ChallengePhase;
  hint: Hint | null;
  
  guessChallenge: GuessChallenge;
  memoryChallenge: MemoryChallenge;
  directionChallenge: DirectionChallenge;

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
  memorySetScanner: (showing: boolean) => void;
  memorySetSuccess: (showing: boolean) => void;

  directionStartGame: () => void;
  directionNextRound: () => void;
  directionHandleInput: (input: "right" | "left" | "up" | "down" | "none") => boolean;
  directionTimeOut: () => void;
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

const generateRandomDirection = (): { direction: DirectionType; color: ColorDirection | null; useColors: boolean } => {
  const useColors = Math.random() > 0.6;
  const simpleDirections: DirectionType[] = ["right", "left", "up", "down"];
  const allDirections: DirectionType[] = ["right", "left", "up", "down", "notRight", "notLeft", "notUp", "notDown", "nothing"];
  const colors: ColorDirection[] = ["green", "yellow", "blue", "red"];
  
  if (useColors) {
    const direction = simpleDirections[Math.floor(Math.random() * simpleDirections.length)];
    const color = colors[Math.floor(Math.random() * colors.length)];
    return { direction, color, useColors: true };
  }
  
  const direction = allDirections[Math.floor(Math.random() * allDirections.length)];
  return { direction, color: null, useColors: false };
};

const generateColorPositions = (): ColorPosition => {
  const positions: ('left' | 'right' | 'top' | 'bottom')[] = ['left', 'right', 'top', 'bottom'];
  const shuffled = [...positions].sort(() => Math.random() - 0.5);
  return {
    yellow: shuffled[0],
    green: shuffled[1],
    blue: shuffled[2],
    red: shuffled[3],
  };
};

const positionToDirection = {
  'left': 'left' as const,
  'right': 'right' as const,
  'top': 'up' as const,
  'bottom': 'down' as const,
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
    showingScanner: false,
    showingSuccess: false,
  },
  
  directionChallenge: {
    currentDirection: null,
    currentColor: null,
    useColors: false,
    colorPositions: null,
    score: 0,
    errors: 0,
    maxErrors: 3,
    timePerRound: 2500,
    roundStartTime: null,
    isWaiting: false,
    gameTime: 60,
    totalRounds: 25,
    currentRound: 0,
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
          showingScanner: false,
          showingSuccess: false,
        },
      });
    } else if (selectedChallenge === "direction") {
      get().directionStartGame();
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
    const { hint, attempts } = get();
    const hasWon = attempts.some(a => a.success);
    
    set({
      maxAttempts: 3,
      attempts: [],
      selectedChallenge: null,
      currentPhase: "menu",
      hint: hasWon ? hint : null,
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
        showingScanner: false,
        showingSuccess: false,
      },
      directionChallenge: {
        currentDirection: null,
        currentColor: null,
        useColors: false,
        colorPositions: null,
        score: 0,
        errors: 0,
        maxErrors: 3,
        timePerRound: 500,
        roundStartTime: null,
        isWaiting: false,
        gameTime: 60,
        totalRounds: 30,
        currentRound: 0,
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
    const { attempts, hasWonAnyChallenge, getRemainingAttempts } = get();
    
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
        showingScanner: false,
        showingSuccess: false,
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
        showingScanner: false,
        showingSuccess: false,
      },
    });
  },

  memorySetScanner: (showing) => {
    const { memoryChallenge } = get();
    set({
      memoryChallenge: {
        ...memoryChallenge,
        showingScanner: showing,
      },
    });
  },

  memorySetSuccess: (showing) => {
    const { memoryChallenge } = get();
    set({
      memoryChallenge: {
        ...memoryChallenge,
        showingSuccess: showing,
      },
    });
  },

  directionStartGame: () => {
    const { direction, color, useColors } = generateRandomDirection();
    const colorPositions = useColors ? generateColorPositions() : null;
    set({
      directionChallenge: {
        currentDirection: direction,
        currentColor: color,
        useColors,
        colorPositions,
        score: 0,
        errors: 0,
        maxErrors: 3,
        timePerRound: 1700,
        roundStartTime: Date.now(),
        isWaiting: false,
        gameTime: 60,
        totalRounds: 25,
        currentRound: 1,
      },
    });
  },

  directionNextRound: () => {
    const { directionChallenge } = get();
    const newRound = directionChallenge.currentRound + 1;
    
    if (newRound > directionChallenge.totalRounds) {
      get().completeChallenge(true);
      return;
    }

    const { direction, color, useColors } = generateRandomDirection();
    const colorPositions = useColors ? generateColorPositions() : null;
    set({
      directionChallenge: {
        ...directionChallenge,
        currentDirection: direction,
        currentColor: color,
        useColors,
        colorPositions,
        roundStartTime: Date.now(),
        isWaiting: false,
        currentRound: newRound,
      },
    });
  },

  directionHandleInput: (input) => {
    const { directionChallenge } = get();
    const { currentDirection, currentColor, useColors, colorPositions, errors, maxErrors } = directionChallenge;
    
    if (!currentDirection) return false;

    let expectedInput: "right" | "left" | "up" | "down" | "none";
    let isCorrect = false;
    
    if (currentDirection === "nothing") {
      expectedInput = "none";
      isCorrect = input === "none";
    } else if (useColors && currentColor && colorPositions) {
      const position = colorPositions[currentColor];
      expectedInput = positionToDirection[position];
      isCorrect = input === expectedInput;
    } else if (currentDirection === "right") {
      isCorrect = input === "right";
    } else if (currentDirection === "left") {
      isCorrect = input === "left";
    } else if (currentDirection === "up") {
      isCorrect = input === "up";
    } else if (currentDirection === "down") {
      isCorrect = input === "down";
    } else if (currentDirection === "notRight") {
      isCorrect = input !== "right" && input !== "none";
    } else if (currentDirection === "notLeft") {
      isCorrect = input !== "left" && input !== "none";
    } else if (currentDirection === "notUp") {
      isCorrect = input !== "up" && input !== "none";
    } else if (currentDirection === "notDown") {
      isCorrect = input !== "down" && input !== "none";
    }

    if (isCorrect) {
      set({
        directionChallenge: {
          ...directionChallenge,
          score: directionChallenge.score + 1,
        },
      });
      return true;
    } else {
      const newErrors = errors + 1;
      if (newErrors >= maxErrors) {
        get().completeChallenge(false);
      } else {
        set({
          directionChallenge: {
            ...directionChallenge,
            errors: newErrors,
          },
        });
      }
      return false;
    }
  },

  directionTimeOut: () => {
    const { directionChallenge } = get();
    const { currentDirection, errors, maxErrors } = directionChallenge;
    
    if (currentDirection === "nothing") {
      set({
        directionChallenge: {
          ...directionChallenge,
          score: directionChallenge.score + 1,
        },
      });
      return;
    }
    
    const newErrors = errors + 1;
    if (newErrors >= maxErrors) {
      get().completeChallenge(false);
    } else {
      set({
        directionChallenge: {
          ...directionChallenge,
          errors: newErrors,
        },
      });
    }
  },
}));
