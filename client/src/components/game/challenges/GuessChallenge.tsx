import { useEffect, useState, useRef } from "react";
import { useChallenges } from "@/lib/stores/useChallenges";
import { ArrowLeft } from "lucide-react";

const BUTTON_COLORS = [
  { color: "#ef4444", sound: 261.63 },
  { color: "#3b82f6", sound: 293.66 },
  { color: "#22c55e", sound: 329.63 },
  { color: "#eab308", sound: 349.23 },
  { color: "#a855f7", sound: 392.00 },
  { color: "#f97316", sound: 440.00 },
  { color: "#ec4899", sound: 493.88 },
  { color: "#06b6d4", sound: 523.25 },
];

export function GuessChallenge() {
  const {
    guessChallenge,
    guessAddToSequence,
    guessSetShowingSequence,
    resetToMenu,
  } = useChallenges();

  const [activeButton, setActiveButton] = useState<number | null>(null);
  const [isProcessingClick, setIsProcessingClick] = useState(false);
  const audioContextRef = useRef<AudioContext | null>(null);

  useEffect(() => {
    audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
    
    return () => {
      if (audioContextRef.current) {
        audioContextRef.current.close();
      }
    };
  }, []);

  const playSound = (frequency: number, duration: number = 0.3) => {
    if (!audioContextRef.current) return;

    const oscillator = audioContextRef.current.createOscillator();
    const gainNode = audioContextRef.current.createGain();

    oscillator.connect(gainNode);
    gainNode.connect(audioContextRef.current.destination);

    oscillator.frequency.value = frequency;
    oscillator.type = 'sine';

    gainNode.gain.setValueAtTime(0.3, audioContextRef.current.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(
      0.01,
      audioContextRef.current.currentTime + duration
    );

    oscillator.start(audioContextRef.current.currentTime);
    oscillator.stop(audioContextRef.current.currentTime + duration);
  };

  useEffect(() => {
    if (guessChallenge.isShowingSequence && guessChallenge.sequence.length > 0) {
      let index = 0;
      const delay = Math.max(600 - guessChallenge.currentLevel * 50, 300);

      const showNext = () => {
        if (index < guessChallenge.sequence.length) {
          const buttonIndex = guessChallenge.sequence[index];
          setActiveButton(buttonIndex);
          playSound(BUTTON_COLORS[buttonIndex].sound);

          setTimeout(() => {
            setActiveButton(null);
            index++;
            setTimeout(showNext, delay);
          }, 500);
        } else {
          guessSetShowingSequence(false);
        }
      };

      setTimeout(showNext, 1000);
    }
  }, [guessChallenge.isShowingSequence, guessChallenge.sequence, guessChallenge.currentLevel]);

  const handleButtonClick = (index: number, e?: React.PointerEvent) => {
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }
    if (guessChallenge.isShowingSequence || isProcessingClick) return;
    
    setIsProcessingClick(true);
    setActiveButton(index);
    playSound(BUTTON_COLORS[index].sound);
    guessAddToSequence(index);

    setTimeout(() => {
      setActiveButton(null);
      setIsProcessingClick(false);
    }, 350);
  };

  return (
    <div className="w-full h-full flex flex-col items-center justify-center p-8 bg-slate-950">
      <div className="w-full max-w-4xl flex flex-col h-full">
        <div className="flex items-center justify-between mb-8">
          <button
            onClick={resetToMenu}
            className="flex items-center gap-2 bg-slate-800/80 hover:bg-slate-700/80 text-white px-6 py-3 rounded-xl transition-all shadow-lg"
          >
            <ArrowLeft className="w-5 h-5" />
            <span className="font-bold">رجوع</span>
          </button>

          <div className="text-center">
            <h2 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-white mb-1">
              تحدي التخمين
            </h2>
            <p className="text-sm sm:text-base lg:text-lg text-gray-400">المستوى {guessChallenge.currentLevel + 1} / 5</p>
          </div>

          <div className="w-24"></div>
        </div>

        <div className="flex-1 flex flex-col items-center justify-center">
          {guessChallenge.isShowingSequence && (
            <div className="text-center mb-8">
              <p className="text-xl sm:text-2xl lg:text-3xl font-bold text-yellow-400 animate-pulse">
                راقب التسلسل...
              </p>
            </div>
          )}

          {!guessChallenge.isShowingSequence && (
            <div className="text-center mb-8">
              <p className="text-base sm:text-lg lg:text-xl text-white">
                كرر التسلسل: {guessChallenge.playerSequence.length} / {guessChallenge.sequence.length}
              </p>
            </div>
          )}

          <div className="w-full flex flex-col items-center justify-center gap-8">
            {/* Top row */}
            <div className="flex gap-2 sm:gap-3 md:gap-4 lg:gap-6 xl:gap-8">
              {BUTTON_COLORS.slice(0, 4).map((btn, index) => {
                const isActive = activeButton === index;
                const isFlashing = guessChallenge.isShowingSequence && guessChallenge.sequence.length > 0;
                
                return (
                  <button
                    key={index}
                    onPointerDown={(e) => handleButtonClick(index, e)}
                    disabled={guessChallenge.isShowingSequence || isProcessingClick}
                    className={`w-14 h-14 sm:w-20 sm:h-20 md:w-24 md:h-24 lg:w-28 lg:h-28 xl:w-32 xl:h-32 font-bold text-white transition-all transform touch-none rounded-2xl border-4 ${
                      isActive ? "scale-115 shadow-2xl border-white" : "border-opacity-40 hover:scale-105"
                    } ${guessChallenge.isShowingSequence || isProcessingClick ? "cursor-not-allowed opacity-40" : ""}`}
                    style={{
                      backgroundColor: btn.color,
                      borderColor: isActive ? "rgba(255, 255, 255, 0.8)" : `${btn.color}80`,
                      boxShadow: isActive 
                        ? `0 0 80px ${btn.color}, 0 0 120px ${btn.color}, 0 0 20px ${btn.color}, inset 0 0 15px rgba(255, 255, 255, 0.4), 0 8px 16px rgba(0, 0, 0, 0.3)` 
                        : isFlashing 
                        ? `0 0 25px ${btn.color}, 0 4px 8px rgba(0, 0, 0, 0.2)` 
                        : "0 4px 12px rgba(0, 0, 0, 0.2), inset 0 1px 0 rgba(255, 255, 255, 0.1)",
                    }}
                  >
                  </button>
                );
              })}
            </div>

            {/* Bottom row */}
            <div className="flex gap-2 sm:gap-3 md:gap-4 lg:gap-6 xl:gap-8">
              {BUTTON_COLORS.slice(4, 8).map((btn, index) => {
                const actualIndex = index + 4;
                const isActive = activeButton === actualIndex;
                const isFlashing = guessChallenge.isShowingSequence && guessChallenge.sequence.length > 0;
                
                return (
                  <button
                    key={actualIndex}
                    onPointerDown={(e) => handleButtonClick(actualIndex, e)}
                    disabled={guessChallenge.isShowingSequence || isProcessingClick}
                    className={`w-14 h-14 sm:w-20 sm:h-20 md:w-24 md:h-24 lg:w-28 lg:h-28 xl:w-32 xl:h-32 font-bold text-white transition-all transform touch-none rounded-2xl border-4 ${
                      isActive ? "scale-115 shadow-2xl border-white" : "border-opacity-40 hover:scale-105"
                    } ${guessChallenge.isShowingSequence || isProcessingClick ? "cursor-not-allowed opacity-40" : ""}`}
                    style={{
                      backgroundColor: btn.color,
                      borderColor: isActive ? "rgba(255, 255, 255, 0.8)" : `${btn.color}80`,
                      boxShadow: isActive 
                        ? `0 0 80px ${btn.color}, 0 0 120px ${btn.color}, 0 0 20px ${btn.color}, inset 0 0 15px rgba(255, 255, 255, 0.4), 0 8px 16px rgba(0, 0, 0, 0.3)` 
                        : isFlashing 
                        ? `0 0 25px ${btn.color}, 0 4px 8px rgba(0, 0, 0, 0.2)` 
                        : "0 4px 12px rgba(0, 0, 0, 0.2), inset 0 1px 0 rgba(255, 255, 255, 0.1)",
                    }}
                  >
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
