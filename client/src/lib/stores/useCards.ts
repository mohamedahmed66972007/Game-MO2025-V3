import { create } from "zustand";

export type CardType = 
  | "peek"           
  | "extraTime"      
  | "shield"         
  | "swap"           
  | "freeze"         
  | "doublePoints";  

export interface Card {
  id: string;
  type: CardType;
  name: string;
  nameAr: string;
  description: string;
  descriptionAr: string;
  icon: string;
  color: string;
  isUsed: boolean;
  cooldown: number;
}

export interface ActiveCardEffect {
  cardType: CardType;
  targetPlayerId?: string;
  expiresAt: number;
  value?: number | string;
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
  drawCard: (playerId: string) => Card | null;
  useCard: (playerId: string, cardId: string, targetPlayerId?: string) => boolean;
  
  addActiveEffect: (playerId: string, effect: ActiveCardEffect) => void;
  removeExpiredEffects: () => void;
  hasActiveEffect: (playerId: string, cardType: CardType) => boolean;
  getActiveEffect: (playerId: string, cardType: CardType) => ActiveCardEffect | null;
  
  resetCards: () => void;
}

const CARD_DEFINITIONS: Omit<Card, "id" | "isUsed" | "cooldown">[] = [
  {
    type: "peek",
    name: "Peek",
    nameAr: "تلميح",
    description: "Reveal one digit of the secret number",
    descriptionAr: "كشف رقم واحد من الرقم السري",
    icon: "👁️",
    color: "from-purple-500 to-purple-700",
  },
  {
    type: "extraTime",
    name: "Extra Time",
    nameAr: "وقت إضافي",
    description: "Add 30 seconds to your timer",
    descriptionAr: "أضف 30 ثانية لوقتك",
    icon: "⏱️",
    color: "from-green-500 to-green-700",
  },
  {
    type: "shield",
    name: "Shield",
    nameAr: "درع",
    description: "Block the next card used against you",
    descriptionAr: "حجب البطاقة القادمة ضدك",
    icon: "🛡️",
    color: "from-blue-500 to-blue-700",
  },
  {
    type: "swap",
    name: "Swap",
    nameAr: "تبديل",
    description: "Swap your progress with another player",
    descriptionAr: "تبديل تقدمك مع لاعب آخر",
    icon: "🔄",
    color: "from-orange-500 to-orange-700",
  },
  {
    type: "freeze",
    name: "Freeze",
    nameAr: "تجميد",
    description: "Freeze opponent's input for 10 seconds",
    descriptionAr: "تجميد إدخال الخصم لـ 10 ثواني",
    icon: "❄️",
    color: "from-cyan-500 to-cyan-700",
  },
  {
    type: "doublePoints",
    name: "Double Points",
    nameAr: "نقاط مضاعفة",
    description: "Double your score for the next correct guess",
    descriptionAr: "مضاعفة نقاطك للتخمين الصحيح التالي",
    icon: "✨",
    color: "from-yellow-500 to-yellow-700",
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

function createInitialCards(): Card[] {
  const cards: Card[] = [];
  for (let i = 0; i < 3; i++) {
    cards.push(createRandomCard());
  }
  return cards;
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
            cards: createInitialCards(),
            activeEffects: [],
          },
        ],
      });
    }
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

  useCard: (playerId: string, cardId: string, targetPlayerId?: string) => {
    const { playerCards } = get();
    const playerIndex = playerCards.findIndex((p) => p.playerId === playerId);
    
    if (playerIndex === -1) return false;
    
    const cardIndex = playerCards[playerIndex].cards.findIndex((c) => c.id === cardId);
    if (cardIndex === -1) return false;
    
    const card = playerCards[playerIndex].cards[cardIndex];
    if (card.isUsed || card.cooldown > 0) return false;
    
    const targetPlayer = targetPlayerId 
      ? playerCards.find((p) => p.playerId === targetPlayerId) 
      : null;
    if (targetPlayerId && targetPlayer?.activeEffects.some((e) => e.cardType === "shield")) {
      const targetIndex = playerCards.findIndex((p) => p.playerId === targetPlayerId);
      if (targetIndex !== -1) {
        const updatedPlayerCards = [...playerCards];
        updatedPlayerCards[targetIndex] = {
          ...updatedPlayerCards[targetIndex],
          activeEffects: updatedPlayerCards[targetIndex].activeEffects.filter(
            (e) => e.cardType !== "shield"
          ),
        };
        
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
    updatedPlayerCards[playerIndex] = {
      ...updatedPlayerCards[playerIndex],
      cards: updatedPlayerCards[playerIndex].cards.filter((c) => c.id !== cardId),
    };
    
    let effectDuration = 0;
    let effectValue: number | string | undefined;
    
    switch (card.type) {
      case "peek":
        effectDuration = 5000;
        effectValue = Math.floor(Math.random() * 4);
        break;
      case "extraTime":
        effectDuration = 1000;
        effectValue = 30;
        break;
      case "shield":
        effectDuration = 60000;
        break;
      case "swap":
        effectDuration = 1000;
        break;
      case "freeze":
        effectDuration = 10000;
        break;
      case "doublePoints":
        effectDuration = 60000;
        break;
    }
    
    const newEffect: ActiveCardEffect = {
      cardType: card.type,
      targetPlayerId,
      expiresAt: Date.now() + effectDuration,
      value: effectValue,
    };
    
    const effectTargetId = ["freeze", "swap"].includes(card.type) && targetPlayerId 
      ? targetPlayerId 
      : playerId;
    
    const effectTargetIndex = playerCards.findIndex((p) => p.playerId === effectTargetId);
    if (effectTargetIndex !== -1) {
      updatedPlayerCards[effectTargetIndex] = {
        ...updatedPlayerCards[effectTargetIndex],
        activeEffects: [...updatedPlayerCards[effectTargetIndex].activeEffects, newEffect],
      };
    }
    
    set({ playerCards: updatedPlayerCards });
    console.log(`[Cards] Card ${card.type} used by ${playerId} on ${targetPlayerId || "self"}`);
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

  resetCards: () => {
    set({
      cardsEnabled: false,
      playerCards: [],
    });
  },
}));

export { useCards, CARD_DEFINITIONS };
