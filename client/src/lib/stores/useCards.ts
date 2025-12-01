import { create } from "zustand";

export type CardType = 
  | "revealNumber"    // إظهار رقم ومكانه
  | "burnNumber"      // حرق رقم (رقم غير موجود)
  | "revealParity"    // إظهار زوجي/فردي لجميع الخانات
  | "freeze"          // تجميد الخصم
  | "shield";         // درع الدفاع

// إعدادات البطاقات
export interface CardSettings {
  revealNumberShowPosition: boolean; // true = إظهار في الخانات، false = إشعار فقط
  burnNumberCount: number; // عدد الأرقام المحروقة (افتراضي 1)
  revealParitySlots: number; // عدد الخانات المكشوفة (افتراضي = عدد الأرقام)
  freezeDuration: number; // مدة التجميد بالثواني (افتراضي 30)
  shieldDuration: number; // مدة الدرع بالثواني (افتراضي 120)
  roundDuration: number; // مدة الجولة بالدقائق (افتراضي 5)
}

const DEFAULT_CARD_SETTINGS: CardSettings = {
  revealNumberShowPosition: true,
  burnNumberCount: 1,
  revealParitySlots: 4,
  freezeDuration: 30,
  shieldDuration: 120,
  roundDuration: 5,
};

export type CardIconType = "eye" | "x-circle" | "hash" | "snowflake" | "shield";

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
  sourcePlayerId?: string;
  sourcePlayerName?: string;
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
  cardSettings: CardSettings;
  revealedDigits: { position: number; digit: number }[]; // الأرقام المكشوفة الثابتة في الخانات
  burnedNumbers: number[]; // الأرقام المحروقة
  
  enableCards: () => void;
  disableCards: () => void;
  setCardSettings: (settings: Partial<CardSettings>) => void;
  
  initializePlayerCards: (playerId: string) => void;
  awardWinnerCard: (playerId: string, allowedTypes?: CardType[]) => Card | null;
  drawCard: (playerId: string, allowedTypes?: CardType[]) => Card | null;
  useCard: (playerId: string, cardId: string, targetPlayerId?: string, secretNumber?: number[], numDigits?: number) => boolean;
  
  addActiveEffect: (playerId: string, effect: ActiveCardEffect) => void;
  removeExpiredEffects: () => void;
  hasActiveEffect: (playerId: string, cardType: CardType) => boolean;
  getActiveEffect: (playerId: string, cardType: CardType) => ActiveCardEffect | null;
  clearAllActiveEffects: () => void; // تنظيف جميع التأثيرات
  
  addRevealedDigit: (position: number, digit: number) => void;
  removeRevealedDigit: (position: number) => void;
  addBurnedNumber: (num: number) => void;
  clearRevealedAndBurned: () => void;
  
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
];

function generateUniqueId(): string {
  return `card_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

const ALL_CARD_TYPES: CardType[] = ["revealNumber", "burnNumber", "revealParity", "freeze", "shield"];

function createRandomCard(allowedTypes?: CardType[]): Card {
  let availableDefinitions = CARD_DEFINITIONS;
  
  const typesToUse = (allowedTypes && allowedTypes.length > 0) ? allowedTypes : ALL_CARD_TYPES;
  availableDefinitions = CARD_DEFINITIONS.filter(def => typesToUse.includes(def.type));
  
  if (availableDefinitions.length === 0) {
    availableDefinitions = CARD_DEFINITIONS;
    console.warn("[Cards] No allowed card types found, falling back to all types");
  }
  
  const randomDef = availableDefinitions[Math.floor(Math.random() * availableDefinitions.length)];
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
  cardSettings: { ...DEFAULT_CARD_SETTINGS },
  revealedDigits: [],
  burnedNumbers: [],

  enableCards: () => set({ cardsEnabled: true }),
  disableCards: () => set({ cardsEnabled: false }),
  setCardSettings: (settings) => set((state) => ({ 
    cardSettings: { ...state.cardSettings, ...settings } 
  })),

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

  awardWinnerCard: (playerId: string, allowedTypes?: CardType[]) => {
    const { playerCards, cardsEnabled } = get();
    if (!cardsEnabled) {
      console.log("[Cards] Cards not enabled, skipping award");
      return null;
    }
    
    const effectiveAllowedTypes = (allowedTypes && allowedTypes.length > 0) ? allowedTypes : ALL_CARD_TYPES;
    console.log(`[Cards] Awarding card from types: ${effectiveAllowedTypes.join(", ")}`);
    
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
    
    const newCard = createRandomCard(effectiveAllowedTypes);
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

  drawCard: (playerId: string, allowedTypes?: CardType[]) => {
    const { playerCards } = get();
    const playerIndex = playerCards.findIndex((p) => p.playerId === playerId);
    
    if (playerIndex === -1) return null;
    
    const effectiveAllowedTypes = (allowedTypes && allowedTypes.length > 0) ? allowedTypes : ALL_CARD_TYPES;
    const newCard = createRandomCard(effectiveAllowedTypes);
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

  useCard: (playerId: string, cardId: string, targetPlayerId?: string, secretNumber?: number[], numDigits?: number) => {
    const { playerCards, cardSettings, revealedDigits, burnedNumbers } = get();
    const playerIndex = playerCards.findIndex((p) => p.playerId === playerId);
    
    if (playerIndex === -1) return false;
    
    const cardIndex = playerCards[playerIndex].cards.findIndex((c) => c.id === cardId);
    if (cardIndex === -1) return false;
    
    const card = playerCards[playerIndex].cards[cardIndex];
    if (card.isUsed || card.cooldown > 0) return false;
    
    // Check if target has shield for attack cards (only if shield was activated BEFORE the attack)
    const attackCards: CardType[] = ["freeze"];
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
        // Reveal one random position and its value (excluding already revealed positions)
        if (secretNumber && secretNumber.length > 0) {
          const alreadyRevealedPositions = revealedDigits.map(r => r.position);
          const availablePositions = Array.from({ length: secretNumber.length }, (_, i) => i)
            .filter(pos => !alreadyRevealedPositions.includes(pos));
          
          if (availablePositions.length > 0) {
            const randomPos = availablePositions[Math.floor(Math.random() * availablePositions.length)];
            effectValue = [randomPos, secretNumber[randomPos]];
            effectDuration = 600000; // Show for 10 minutes (effectively permanent for the round)
            
            // إضافة الرقم المكشوف للخانات إذا كان الإعداد مفعل
            if (cardSettings.revealNumberShowPosition) {
              get().addRevealedDigit(randomPos, secretNumber[randomPos]);
            }
          }
        }
        break;
        
      case "burnNumber":
        // Find numbers that are NOT in the secret (based on settings)
        if (secretNumber) {
          const possibleNumbers = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9];
          const alreadyBurned = burnedNumbers;
          const notInSecret = possibleNumbers.filter(n => 
            !secretNumber.includes(n) && !alreadyBurned.includes(n)
          );
          
          if (notInSecret.length > 0) {
            const burnCount = Math.min(cardSettings.burnNumberCount, notInSecret.length);
            const burnedNums: number[] = [];
            
            for (let i = 0; i < burnCount; i++) {
              const idx = Math.floor(Math.random() * (notInSecret.length - i));
              const num = notInSecret.splice(idx, 1)[0];
              burnedNums.push(num);
              get().addBurnedNumber(num);
            }
            
            effectValue = burnedNums.length === 1 ? burnedNums[0] : burnedNums;
            effectDuration = 600000;
          }
        }
        break;
        
      case "revealParity":
        // Reveal even/odd for ALL positions (based on settings)
        if (secretNumber && secretNumber.length >= 1) {
          const slotsToReveal = Math.min(
            cardSettings.revealParitySlots || secretNumber.length, 
            secretNumber.length
          );
          const positions: ParityInfo[] = [];
          
          // إظهار جميع الخانات بالترتيب
          for (let i = 0; i < slotsToReveal; i++) {
            positions.push({
              position: i,
              isEven: secretNumber[i] % 2 === 0
            });
          }
          
          effectValue = positions;
          effectDuration = 600000;
        }
        break;
        
      case "freeze":
        effectDuration = cardSettings.freezeDuration * 1000;
        break;
        
      case "shield":
        effectDuration = cardSettings.shieldDuration * 1000;
        break;
    }
    
    // بطاقة إظهار رقم مع إظهار في الخانة لا تحتاج لتأثير نشط (مؤقت)
    // الرقم يظهر بشكل دائم في الخانة عبر revealedDigits
    const skipActiveEffect = card.type === "revealNumber" && cardSettings.revealNumberShowPosition;
    
    if (!skipActiveEffect && effectDuration > 0) {
      const newEffect: ActiveCardEffect = {
        cardType: card.type,
        targetPlayerId,
        sourcePlayerId: playerId,
        expiresAt: Date.now() + effectDuration,
        value: effectValue,
      };
      
      // For attack cards (freeze), apply to target
      // For self cards (shield, reveal), apply to self
      const effectTargetId = ["freeze"].includes(card.type) && targetPlayerId 
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

  getPlayerCards: (playerId: string) => {
    const { playerCards } = get();
    const player = playerCards.find((p) => p.playerId === playerId);
    return player?.cards || [];
  },

  clearAllActiveEffects: () => {
    const { playerCards } = get();
    const updatedPlayerCards = playerCards.map((player) => ({
      ...player,
      activeEffects: [],
    }));
    set({ playerCards: updatedPlayerCards });
    console.log("[Cards] Cleared all active effects");
  },

  addRevealedDigit: (position: number, digit: number) => {
    const { revealedDigits } = get();
    // لا تضيف نفس الموضع مرتين
    if (!revealedDigits.some(r => r.position === position)) {
      set({ revealedDigits: [...revealedDigits, { position, digit }] });
      console.log(`[Cards] Added revealed digit: position ${position}, digit ${digit}`);
    }
  },

  removeRevealedDigit: (position: number) => {
    const { revealedDigits } = get();
    set({ revealedDigits: revealedDigits.filter(r => r.position !== position) });
    console.log(`[Cards] Removed revealed digit at position ${position}`);
  },

  addBurnedNumber: (num: number) => {
    const { burnedNumbers } = get();
    if (!burnedNumbers.includes(num)) {
      set({ burnedNumbers: [...burnedNumbers, num] });
      console.log(`[Cards] Added burned number: ${num}`);
    }
  },

  clearRevealedAndBurned: () => {
    set({ revealedDigits: [], burnedNumbers: [] });
    console.log("[Cards] Cleared revealed digits and burned numbers");
  },

  resetCards: () => {
    set({
      cardsEnabled: false,
      playerCards: [],
      revealedDigits: [],
      burnedNumbers: [],
      cardSettings: { ...DEFAULT_CARD_SETTINGS },
    });
    console.log("[Cards] Full reset completed");
  },
}));

export { useCards, CARD_DEFINITIONS, ALL_CARD_TYPES, DEFAULT_CARD_SETTINGS };
