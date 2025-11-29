import { motion, AnimatePresence } from "framer-motion";
import { useState } from "react";
import { useCards, Card, CardType, CARD_DEFINITIONS } from "@/lib/stores/useCards";
import { X, Target, Sparkles } from "lucide-react";

interface CardComponentProps {
  card: Card;
  onUse: (cardId: string, targetPlayerId?: string) => void;
  isSelectable: boolean;
  otherPlayers?: { id: string; name: string }[];
  disabled?: boolean;
}

function CardComponent({ card, onUse, isSelectable, otherPlayers = [], disabled }: CardComponentProps) {
  const [showTargetSelector, setShowTargetSelector] = useState(false);
  const [isFlipped, setIsFlipped] = useState(false);

  const needsTarget = card.type === "freeze" || card.type === "swap";

  const handleClick = () => {
    if (disabled || !isSelectable) return;

    if (needsTarget && otherPlayers.length > 0) {
      setShowTargetSelector(true);
    } else {
      onUse(card.id);
    }
  };

  const handleTargetSelect = (targetId: string) => {
    onUse(card.id, targetId);
    setShowTargetSelector(false);
  };

  return (
    <>
      <motion.div
        className={`relative cursor-pointer select-none ${disabled ? "opacity-50 cursor-not-allowed" : ""}`}
        initial={{ scale: 0, rotateY: 180 }}
        animate={{ scale: 1, rotateY: isFlipped ? 180 : 0 }}
        exit={{ scale: 0, rotateY: -180 }}
        whileHover={!disabled ? { scale: 1.05, y: -5 } : {}}
        whileTap={!disabled ? { scale: 0.95 } : {}}
        onClick={handleClick}
        transition={{ type: "spring", stiffness: 300, damping: 20 }}
      >
        <div className={`w-20 h-28 sm:w-24 sm:h-32 rounded-xl bg-gradient-to-br ${card.color} shadow-lg border-2 border-white/30 overflow-hidden`}>
          <div className="absolute inset-0 bg-gradient-to-t from-black/40 to-transparent" />
          
          <div className="absolute inset-0 flex flex-col items-center justify-center p-2 text-white">
            <motion.span 
              className="text-2xl sm:text-3xl mb-1"
              animate={{ 
                scale: [1, 1.2, 1],
                rotate: [0, 5, -5, 0] 
              }}
              transition={{ 
                duration: 2, 
                repeat: Infinity, 
                ease: "easeInOut" 
              }}
            >
              {card.icon}
            </motion.span>
            <span className="text-xs sm:text-sm font-bold text-center leading-tight drop-shadow-lg">
              {card.nameAr}
            </span>
          </div>

          <motion.div
            className="absolute inset-0 bg-white/20"
            initial={{ x: "-100%", opacity: 0 }}
            whileHover={{ x: "100%", opacity: 1 }}
            transition={{ duration: 0.5 }}
          />
        </div>

        {needsTarget && (
          <div className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 rounded-full flex items-center justify-center shadow-lg">
            <Target className="w-3 h-3 text-white" />
          </div>
        )}
      </motion.div>

      <AnimatePresence>
        {showTargetSelector && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 flex items-center justify-center z-50"
            onClick={() => setShowTargetSelector(false)}
          >
            <motion.div
              initial={{ scale: 0.8, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.8, y: 20 }}
              className="bg-white rounded-2xl p-6 shadow-2xl max-w-sm w-full mx-4"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-xl font-bold text-gray-800">اختر هدفك</h3>
                <button
                  onClick={() => setShowTargetSelector(false)}
                  className="p-2 hover:bg-gray-100 rounded-full transition-colors"
                >
                  <X className="w-5 h-5 text-gray-600" />
                </button>
              </div>

              <div className="space-y-2">
                {otherPlayers.map((player) => (
                  <button
                    key={player.id}
                    onClick={() => handleTargetSelect(player.id)}
                    className="w-full p-4 bg-gradient-to-r from-blue-500 to-purple-500 hover:from-blue-600 hover:to-purple-600 text-white font-bold rounded-xl transition-all"
                  >
                    {player.name}
                  </button>
                ))}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}

interface CardHandProps {
  playerId: string;
  onUseCard: (cardId: string, targetPlayerId?: string) => void;
  otherPlayers?: { id: string; name: string }[];
  disabled?: boolean;
}

export function CardHand({ playerId, onUseCard, otherPlayers = [], disabled }: CardHandProps) {
  const { playerCards } = useCards();
  const playerData = playerCards.find((p) => p.playerId === playerId);

  if (!playerData || playerData.cards.length === 0) {
    return null;
  }

  return (
    <motion.div
      className="fixed bottom-4 left-1/2 -translate-x-1/2 z-40"
      initial={{ y: 100 }}
      animate={{ y: 0 }}
      transition={{ type: "spring", stiffness: 300, damping: 25 }}
    >
      <div className="bg-slate-900/80 backdrop-blur-xl rounded-2xl p-3 shadow-2xl border border-white/10">
        <div className="flex items-center gap-2 mb-2">
          <Sparkles className="w-4 h-4 text-yellow-400" />
          <span className="text-white/80 text-xs font-medium">بطاقاتك</span>
        </div>
        <div className="flex gap-2 sm:gap-3">
          <AnimatePresence mode="popLayout">
            {playerData.cards.map((card, index) => (
              <motion.div
                key={card.id}
                initial={{ opacity: 0, y: 50, rotateZ: -10 }}
                animate={{ 
                  opacity: 1, 
                  y: 0, 
                  rotateZ: (index - (playerData.cards.length - 1) / 2) * 5 
                }}
                exit={{ opacity: 0, y: 50, scale: 0.5 }}
                transition={{ delay: index * 0.1 }}
              >
                <CardComponent
                  card={card}
                  onUse={onUseCard}
                  isSelectable={true}
                  otherPlayers={otherPlayers}
                  disabled={disabled}
                />
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      </div>
    </motion.div>
  );
}

interface CardEffectDisplayProps {
  playerId: string;
}

export function CardEffectDisplay({ playerId }: CardEffectDisplayProps) {
  const { playerCards, removeExpiredEffects } = useCards();
  const playerData = playerCards.find((p) => p.playerId === playerId);

  if (!playerData || playerData.activeEffects.length === 0) {
    return null;
  }

  return (
    <div className="fixed top-20 right-4 z-40 space-y-2">
      <AnimatePresence>
        {playerData.activeEffects.map((effect, index) => {
          const cardDef = CARD_DEFINITIONS.find((c) => c.type === effect.cardType);
          if (!cardDef) return null;

          const remainingTime = Math.max(0, Math.ceil((effect.expiresAt - Date.now()) / 1000));

          return (
            <motion.div
              key={`${effect.cardType}_${effect.expiresAt}`}
              initial={{ x: 100, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              exit={{ x: 100, opacity: 0 }}
              className={`bg-gradient-to-r ${cardDef.color} rounded-xl p-3 shadow-lg flex items-center gap-3 text-white`}
            >
              <span className="text-2xl">{cardDef.icon}</span>
              <div>
                <span className="font-bold text-sm block">{cardDef.nameAr}</span>
                <span className="text-xs opacity-80">{remainingTime}s</span>
              </div>
            </motion.div>
          );
        })}
      </AnimatePresence>
    </div>
  );
}

interface CardUsedAnimationProps {
  cardType: CardType;
  userName: string;
  targetName?: string;
  onComplete: () => void;
}

export function CardUsedAnimation({ cardType, userName, targetName, onComplete }: CardUsedAnimationProps) {
  const cardDef = CARD_DEFINITIONS.find((c) => c.type === cardType);

  if (!cardDef) return null;

  return (
    <motion.div
      className="fixed inset-0 z-50 flex items-center justify-center pointer-events-none"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      onAnimationComplete={() => {
        setTimeout(onComplete, 1500);
      }}
    >
      <motion.div
        className={`bg-gradient-to-br ${cardDef.color} rounded-3xl p-8 shadow-2xl text-white text-center`}
        initial={{ scale: 0, rotate: -180 }}
        animate={{ scale: 1, rotate: 0 }}
        exit={{ scale: 0, rotate: 180 }}
        transition={{ type: "spring", stiffness: 300, damping: 20 }}
      >
        <motion.span
          className="text-6xl block mb-4"
          animate={{ 
            scale: [1, 1.3, 1],
            rotate: [0, 10, -10, 0] 
          }}
          transition={{ 
            duration: 0.5, 
            repeat: 2,
            ease: "easeInOut" 
          }}
        >
          {cardDef.icon}
        </motion.span>
        <h2 className="text-2xl font-bold mb-2">{cardDef.nameAr}</h2>
        <p className="text-lg opacity-90">
          {userName}
          {targetName && (
            <>
              <span className="mx-2">←</span>
              {targetName}
            </>
          )}
        </p>
      </motion.div>
    </motion.div>
  );
}

interface CardDrawAnimationProps {
  card: Card;
  onComplete: () => void;
}

export function CardDrawAnimation({ card, onComplete }: CardDrawAnimationProps) {
  return (
    <motion.div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/30"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      onClick={onComplete}
    >
      <motion.div
        className={`w-40 h-56 rounded-2xl bg-gradient-to-br ${card.color} shadow-2xl border-4 border-white/40 flex flex-col items-center justify-center p-4 text-white cursor-pointer`}
        initial={{ scale: 0, rotateY: 180, y: 100 }}
        animate={{ scale: 1, rotateY: 0, y: 0 }}
        exit={{ scale: 0, y: 100 }}
        transition={{ type: "spring", stiffness: 200, damping: 15 }}
        whileHover={{ scale: 1.05 }}
      >
        <motion.span
          className="text-5xl mb-4"
          animate={{ 
            scale: [1, 1.3, 1],
            rotate: [0, 15, -15, 0] 
          }}
          transition={{ 
            duration: 1, 
            repeat: Infinity,
            ease: "easeInOut" 
          }}
        >
          {card.icon}
        </motion.span>
        <h3 className="text-xl font-bold text-center mb-2">{card.nameAr}</h3>
        <p className="text-sm text-center opacity-90">{card.descriptionAr}</p>
        
        <motion.div
          className="absolute inset-0 bg-gradient-to-r from-white/0 via-white/30 to-white/0"
          initial={{ x: "-100%" }}
          animate={{ x: "200%" }}
          transition={{ 
            duration: 1.5, 
            repeat: Infinity,
            ease: "linear" 
          }}
        />
      </motion.div>
    </motion.div>
  );
}

export { CardComponent };
