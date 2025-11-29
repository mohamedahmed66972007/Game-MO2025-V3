import { create } from "zustand";

export type CardType = 
  | "revealNumber"    // إظهار رقم ومكانه
  | "burnNumber"      // حرق رقم (رقم غير موجود)
  | "revealParity"    // إظهار زوجي/فردي لخانتين
  | "freeze"          // تجميد الخصم 30 ثانية
  | "shield"          // درع الدفاع
  | "blindMode";      // تعطيل عرض الأرقام الزرقاء (30 ثانية)

export type CardIconType = "eye" | "x-circle" | "hash" | "snowflake" | "shield" | "eye-off";

export interface Card {
  id: string;
  type: CardType;
  name: string;
  nameAr: string;
  description: string;
  descriptionAr: string;
  icon: CardIconType;
  color: string;
  isUsed: boolean;
  cooldown: number;
}

export interface ParityInfo {
  position: number;
  isEven: boolean;
}

export interface ActiveCardEffect {
  cardType: CardType;
  targetPlayerId?: string;
  expiresAt: number;
  value?: number | string | number[] | ParityInfo[];
}

export interface PlayerCards {
  playerId: string;
  cards: Card[];
  activeEffects: ActiveCardEffect[];
}

interface CardState {
  cardsEnabled: boolean;
  playerCards: PlayerCards[];
  
  enableCards: () => void;
  disableCards: () => void;
  
  initializePlayerCards: (playerId: string) => void;
  awardWinnerCard: (playerId: string) => Card | null;
  drawCard: (playerId: string) => Card | null;
  useCard: (playerId: string, cardId: string, targetPlayerId?: string, secretNumber?: number[]) => boolean;
  
  addActiveEffect: (playerId: string, effect: ActiveCardEffect) => void;
  removeExpiredEffects: () => void;
  hasActiveEffect: (playerId: string, cardType: CardType) => boolean;
  getActiveEffect: (playerId: string, cardType: CardType) => ActiveCardEffect | null;
  
  resetCards: () => void;
  getPlayerCards: (playerId: string) => Card[];
}

const CARD_DEFINITIONS: Omit<Card, "id" | "isUsed" | "cooldown">[] = [
  {
    type: "revealNumber",
    name: "Reveal Number",
    nameAr: "إظهار رقم",
    description: "Reveals one digit and its exact position in the secret number",
    descriptionAr: "يكشف رقم واحد ومكانه الصحيح في الكود السري",
    icon: "eye",
    color: "from-purple-500 to-purple-700",
  },
  {
    type: "burnNumber",
    name: "Burn Number",
    nameAr: "حرق رقم",
    description: "Shows a number that is NOT in the secret code",
    descriptionAr: "يظهر رقم غير موجود نهائياً في الكود السري",
    icon: "x-circle",
    color: "from-red-500 to-red-700",
  },
  {
    type: "revealParity",
    name: "Reveal Parity",
    nameAr: "كشف الزوجي والفردي",
    description: "Shows if two positions have even or odd numbers",
    descriptionAr: "يظهر إذا كانت خانتين تحتوي على أرقام زوجية أو فردية",
    icon: "hash",
    color: "from-green-500 to-green-700",
  },
  {
    type: "freeze",
    name: "Freeze",
    nameAr: "تجميد الخصم",
    description: "Freeze opponent for 30 seconds - they cannot guess",
    descriptionAr: "تجميد الخصم لمدة 30 ثانية - لا يمكنه التخمين",
    icon: "snowflake",
    color: "from-cyan-500 to-cyan-700",
  },
  {
    type: "shield",
    name: "Shield",
    nameAr: "درع الدفاع",
    description: "Blocks the next attack card used against you",
    descriptionAr: "يبطل مفعول البطاقة القادمة التي تُستخدم ضدك",
    icon: "shield",
    color: "from-blue-500 to-blue-700",
  },
  {
    type: "blindMode",
    name: "Blind Mode",
    nameAr: "تعطيل العرض",
    description: "For 30 seconds, opponent only sees green indicators (correct position) but not blue (correct number wrong position)",
    descriptionAr: "لمدة 30 ثانية، الخصم يرى فقط الأرقام الخضراء (المكان الصحيح) ولا يرى الزرقاء (الرقم صحيح بمكان خاطئ)",
    icon: "eye-off",
    color: "from-orange-500 to-orange-700",
  },
];

function generateUniqueId(): string {
  return `card_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

function createRandomCard(): Card {
  const randomDef = CARD_DEFINITIONS[Math.floor(Math.random() * CARD_DEFINITIONS.length)];
  return {
    ...randomDef,
    id: generateUniqueId(),
    isUsed: false,
    cooldown: 0,
  };
}

const useCards = create<CardState>((set, get) => ({
  cardsEnabled: false,
  playerCards: [],

  enableCards: () => set({ cardsEnabled: true }),
  disableCards: () => set({ cardsEnabled: false }),

  initializePlayerCards: (playerId: string) => {
    const { playerCards } = get();
    const existingPlayer = playerCards.find((p) => p.playerId === playerId);
    
    if (!existingPlayer) {
      set({
        playerCards: [
          ...playerCards,
          {
            playerId,
            cards: [],
            activeEffects: [],
          },
        ],
      });
      console.log(`[Cards] Initialized player ${playerId} with empty cards`);
    }
  },

  awardWinnerCard: (playerId: string) => {
    const { playerCards, cardsEnabled } = get();
    if (!cardsEnabled) {
      console.log("[Cards] Cards not enabled, skipping award");
      return null;
    }
    
    let playerIndex = playerCards.findIndex((p) => p.playerId === playerId);
    
    if (playerIndex === -1) {
      set({
        playerCards: [
          ...playerCards,
          {
            playerId,
            cards: [],
            activeEffects: [],
          },
        ],
      });
      playerIndex = playerCards.length;
    }
    
    const newCard = createRandomCard();
    const currentCards = get().playerCards;
    const updatedPlayerCards = [...currentCards];
    const pIndex = updatedPlayerCards.findIndex((p) => p.playerId === playerId);
    
    if (pIndex !== -1 && updatedPlayerCards[pIndex].cards.length < 5) {
      updatedPlayerCards[pIndex] = {
        ...updatedPlayerCards[pIndex],
        cards: [...updatedPlayerCards[pIndex].cards, newCard],
      };
      set({ playerCards: updatedPlayerCards });
      console.log(`[Cards] Awarded winner card to ${playerId}:`, newCard.nameAr);
      return newCard;
    }
    
    return null;
  },

  drawCard: (playerId: string) => {
    const { playerCards } = get();
    const playerIndex = playerCards.findIndex((p) => p.playerId === playerId);
    
    if (playerIndex === -1) return null;
    
    const newCard = createRandomCard();
    const updatedPlayerCards = [...playerCards];
    
    if (updatedPlayerCards[playerIndex].cards.length < 5) {
      updatedPlayerCards[playerIndex] = {
        ...updatedPlayerCards[playerIndex],
        cards: [...updatedPlayerCards[playerIndex].cards, newCard],
      };
      set({ playerCards: updatedPlayerCards });
      return newCard;
    }
    
    return null;
  },

  useCard: (playerId: string, cardId: string, targetPlayerId?: string, secretNumber?: number[]) => {
    const { playerCards } = get();
    const playerIndex = playerCards.findIndex((p) => p.playerId === playerId);
    
    if (playerIndex === -1) return false;
    
    const cardIndex = playerCards[playerIndex].cards.findIndex((c) => c.id === cardId);
    if (cardIndex === -1) return false;
    
    const card = playerCards[playerIndex].cards[cardIndex];
    if (card.isUsed || card.cooldown > 0) return false;
    
    // Check if target has shield for attack cards
    const attackCards: CardType[] = ["freeze", "blindMode"];
    const targetPlayer = targetPlayerId 
      ? playerCards.find((p) => p.playerId === targetPlayerId) 
      : null;
    
    if (targetPlayerId && attackCards.includes(card.type) && targetPlayer?.activeEffects.some((e) => e.cardType === "shield" && e.expiresAt > Date.now())) {
      // Shield blocks the attack
      const targetIndex = playerCards.findIndex((p) => p.playerId === targetPlayerId);
      if (targetIndex !== -1) {
        const updatedPlayerCards = [...playerCards];
        // Remove shield effect from target
        updatedPlayerCards[targetIndex] = {
          ...updatedPlayerCards[targetIndex],
          activeEffects: updatedPlayerCards[targetIndex].activeEffects.filter(
            (e) => e.cardType !== "shield"
          ),
        };
        
        // Remove card from attacker
        updatedPlayerCards[playerIndex] = {
          ...updatedPlayerCards[playerIndex],
          cards: updatedPlayerCards[playerIndex].cards.filter((c) => c.id !== cardId),
        };
        
        set({ playerCards: updatedPlayerCards });
        console.log(`[Cards] Card ${card.type} blocked by shield!`);
        return false;
      }
    }
    
    const updatedPlayerCards = [...playerCards];
    // Remove the card after use
    updatedPlayerCards[playerIndex] = {
      ...updatedPlayerCards[playerIndex],
      cards: updatedPlayerCards[playerIndex].cards.filter((c) => c.id !== cardId),
    };
    
    let effectDuration = 0;
    let effectValue: number | string | number[] | ParityInfo[] | undefined;
    
    switch (card.type) {
      case "revealNumber":
        // Reveal one random position and its value
        if (secretNumber && secretNumber.length > 0) {
          const randomPos = Math.floor(Math.random() * secretNumber.length);
          effectValue = [randomPos, secretNumber[randomPos]];
          effectDuration = 60000; // Show for 60 seconds
        }
        break;
        
      case "burnNumber":
        // Find a number that's NOT in the secret
        if (secretNumber) {
          const possibleNumbers = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9];
          const notInSecret = possibleNumbers.filter(n => !secretNumber.includes(n));
          if (notInSecret.length > 0) {
            effectValue = notInSecret[Math.floor(Math.random() * notInSecret.length)];
            effectDuration = 60000;
          }
        }
        break;
        
      case "revealParity":
        // Reveal even/odd for 2 random positions
        if (secretNumber && secretNumber.length >= 2) {
          const positions = [];
          const usedPositions: number[] = [];
          for (let i = 0; i < 2 && i < secretNumber.length; i++) {
            let pos;
            do {
              pos = Math.floor(Math.random() * secretNumber.length);
            } while (usedPositions.includes(pos));
            usedPositions.push(pos);
            positions.push({
              position: pos,
              isEven: secretNumber[pos] % 2 === 0
            });
          }
          effectValue = positions;
          effectDuration = 60000;
        }
        break;
        
      case "freeze":
        effectDuration = 30000; // 30 seconds freeze
        break;
        
      case "shield":
        effectDuration = 120000; // Shield lasts 2 minutes
        break;
        
      case "blindMode":
        effectDuration = 30000; // 30 seconds blind mode
        break;
    }
    
    const newEffect: ActiveCardEffect = {
      cardType: card.type,
      targetPlayerId,
      expiresAt: Date.now() + effectDuration,
      value: effectValue,
    };
    
    // For attack cards (freeze, blindMode), apply to target
    // For self cards (shield, reveal), apply to self
    const effectTargetId = ["freeze", "blindMode"].includes(card.type) && targetPlayerId 
      ? targetPlayerId 
      : playerId;
    
    let effectTargetIndex = updatedPlayerCards.findIndex((p) => p.playerId === effectTargetId);
    
    // If target player doesn't exist in playerCards, add them first
    if (effectTargetIndex === -1) {
      updatedPlayerCards.push({
        playerId: effectTargetId,
        cards: [],
        activeEffects: [],
      });
      effectTargetIndex = updatedPlayerCards.length - 1;
      console.log(`[Cards] Initialized target player ${effectTargetId} for effect`);
    }
    
    updatedPlayerCards[effectTargetIndex] = {
      ...updatedPlayerCards[effectTargetIndex],
      activeEffects: [...updatedPlayerCards[effectTargetIndex].activeEffects, newEffect],
    };
    
    set({ playerCards: updatedPlayerCards });
    console.log(`[Cards] Card ${card.type} used by ${playerId} on ${targetPlayerId || "self"}, effect applied to ${effectTargetId}`);
    return true;
  },

  addActiveEffect: (playerId: string, effect: ActiveCardEffect) => {
    const { playerCards } = get();
    const playerIndex = playerCards.findIndex((p) => p.playerId === playerId);
    
    if (playerIndex !== -1) {
      const updatedPlayerCards = [...playerCards];
      updatedPlayerCards[playerIndex] = {
        ...updatedPlayerCards[playerIndex],
        activeEffects: [...updatedPlayerCards[playerIndex].activeEffects, effect],
      };
      set({ playerCards: updatedPlayerCards });
    }
  },

  removeExpiredEffects: () => {
    const { playerCards } = get();
    const now = Date.now();
    
    const updatedPlayerCards = playerCards.map((player) => ({
      ...player,
      activeEffects: player.activeEffects.filter((e) => e.expiresAt > now),
    }));
    
    set({ playerCards: updatedPlayerCards });
  },

  hasActiveEffect: (playerId: string, cardType: CardType) => {
    const { playerCards } = get();
    const player = playerCards.find((p) => p.playerId === playerId);
    if (!player) return false;
    
    const now = Date.now();
    return player.activeEffects.some((e) => e.cardType === cardType && e.expiresAt > now);
  },

  getActiveEffect: (playerId: string, cardType: CardType) => {
    const { playerCards } = get();
    const player = playerCards.find((p) => p.playerId === playerId);
    if (!player) return null;
    
    const now = Date.now();
    return player.activeEffects.find((e) => e.cardType === cardType && e.expiresAt > now) || null;
  },

  getPlayerCards: (playerId: string) => {
    const { playerCards } = get();
    const player = playerCards.find((p) => p.playerId === playerId);
    return player?.cards || [];
  },

  resetCards: () => {
    set({
      cardsEnabled: false,
      playerCards: [],
    });
  },
}));

export { useCards, CARD_DEFINITIONS };
