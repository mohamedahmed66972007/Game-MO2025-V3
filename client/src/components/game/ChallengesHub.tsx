import { useChallenges, type ChallengeType, type ChallengeCategory } from "@/lib/stores/useChallenges";
import { ArrowLeft, Brain, Target, Zap, Calculator } from "lucide-react";
import { GuessChallenge } from "./challenges/GuessChallenge";
import { MemoryChallenge } from "./challenges/MemoryChallenge";
import { DirectionChallenge } from "./challenges/DirectionChallenge";
import { RainDropsChallenge } from "./challenges/RainDropsChallenge";

interface ChallengeInfo {
  id: ChallengeType;
  name: string;
  description: string;
  icon: typeof Brain;
  color: string;
  borderColor: string;
  category: ChallengeCategory;
}

const challengeInfo: Record<ChallengeType, ChallengeInfo> = {
  guess: {
    id: "guess",
    name: "تحدي تسلسل الأضواء",
    description: "تذكر التسلسل الصحيح من الألوان وأعده",
    icon: Brain,
    color: "from-blue-500 to-blue-600",
    borderColor: "border-blue-500",
    category: "memory",
  },
  memory: {
    id: "memory",
    name: "لوحة الذاكرة",
    description: "تذكر المربعات المضيئة واضغط عليها",
    icon: Target,
    color: "from-purple-500 to-purple-600",
    borderColor: "border-purple-500",
    category: "memory",
  },
  direction: {
    id: "direction",
    name: "ترتيب الاتجاهات",
    description: "حرك المكعب حسب الاتجاه المطلوب بسرعة",
    icon: Zap,
    color: "from-orange-500 to-orange-600",
    borderColor: "border-orange-500",
    category: "reaction",
  },
  raindrops: {
    id: "raindrops",
    name: "حبات المطر",
    description: "حل المسائل الحسابية قبل أن تصل الحبات للأسفل",
    icon: Calculator,
    color: "from-cyan-500 to-blue-600",
    borderColor: "border-cyan-500",
    category: "math",
  },
};

const categories: { id: ChallengeCategory; name: string; icon: typeof Brain }[] = [
  { id: "memory", name: "الذاكرة", icon: Brain },
  { id: "reaction", name: "رد الفعل", icon: Zap },
  { id: "math", name: "الرياضيات", icon: Calculator },
];

export function ChallengesHub({ onExit }: { onExit: () => void }) {
  const {
    selectedChallenge,
    currentPhase,
    selectChallenge,
    startChallenge,
    resetToMenu,
    getRemainingAttempts,
    hasWonAnyChallenge,
    canPlayChallenge,
  } = useChallenges();

  if (selectedChallenge && currentPhase !== "menu") {
    if (currentPhase === "playing") {
      return (
        <div className="fixed inset-0 bg-slate-950 flex items-center justify-center">
          {selectedChallenge === "guess" && <GuessChallenge />}
          {selectedChallenge === "memory" && <MemoryChallenge />}
          {selectedChallenge === "direction" && <DirectionChallenge />}
          {selectedChallenge === "raindrops" && <RainDropsChallenge />}
        </div>
      );
    }
  }

  if (currentPhase === "won" || currentPhase === "lost") {
    return (
      <div className="fixed inset-0 bg-slate-950 flex items-center justify-center p-6">
        <div
          className={`w-full max-w-md bg-slate-900/90 backdrop-blur-xl rounded-3xl shadow-2xl border-2 ${
            currentPhase === "won" ? "border-green-500/30" : "border-red-500/30"
          } p-8 text-center space-y-6`}
        >
          <div className="text-8xl animate-bounce">
            {currentPhase === "won" ? "🎉" : "😢"}
          </div>
          <h2
            className={`text-4xl font-bold ${
              currentPhase === "won" ? "text-green-400" : "text-red-400"
            }`}
          >
            {currentPhase === "won" ? "مبروك! فزت" : "للأسف! خسرت"}
          </h2>
          <p className="text-gray-300 text-lg">
            {currentPhase === "won"
              ? "لقد أكملت التحدي بنجاح!"
              : "حاول مرة أخرى"}
          </p>
          {currentPhase === "won" && (
            <p className="text-green-300 font-semibold">سيظهر لك التلميح الآن</p>
          )}
          <div className="flex flex-col gap-3">
            {currentPhase === "won" && (
              <button
                onClick={() => {
                  resetToMenu();
                  onExit();
                }}
                className="w-full bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white font-bold py-4 px-6 rounded-xl transition-all shadow-lg"
              >
                العودة للعبة
              </button>
            )}
            {currentPhase === "lost" && (
              <>
                {getRemainingAttempts() > 0 && (
                  <button
                    onClick={() => resetToMenu()}
                    className="w-full bg-gradient-to-r from-gray-600 to-gray-700 hover:from-gray-700 hover:to-gray-800 text-white font-bold py-4 px-6 rounded-xl transition-all shadow-lg"
                  >
                    اختيار تحدي آخر
                  </button>
                )}
                <button
                  onClick={() => {
                    resetToMenu();
                    onExit();
                  }}
                  className="w-full bg-gradient-to-r from-red-600 to-red-700 hover:from-red-700 hover:to-red-800 text-white font-bold py-4 px-6 rounded-xl transition-all shadow-lg"
                >
                  العودة للعبة
                </button>
              </>
            )}
          </div>
        </div>
      </div>
    );
  }

  const remainingAttempts = getRemainingAttempts();
  const hasWon = hasWonAnyChallenge();

  const getChallengesByCategory = (categoryId: ChallengeCategory) => {
    return Object.values(challengeInfo).filter(c => c.category === categoryId);
  };

  return (
    <div className="fixed inset-0 bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex items-center justify-center p-6 overflow-y-auto">
      <div className="w-full max-w-6xl my-auto">
        <div className="flex items-center justify-between mb-8">
          <button
            onClick={onExit}
            className="flex items-center gap-2 bg-slate-800/80 hover:bg-slate-700/80 text-white px-6 py-3 rounded-xl transition-all shadow-lg"
          >
            <ArrowLeft className="w-5 h-5" />
            <span className="font-bold">العودة</span>
          </button>

          <div className="bg-slate-800/80 backdrop-blur-xl px-8 py-4 rounded-2xl shadow-lg">
            <div className="flex items-center gap-3">
              <svg
                className="w-6 h-6 text-yellow-400"
                fill="currentColor"
                viewBox="0 0 20 20"
              >
                <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
              </svg>
              <span className="text-2xl font-bold text-white">
                {remainingAttempts} / 3
              </span>
              <span className="text-gray-300">فرص متبقية</span>
            </div>
          </div>
        </div>

        <div className="mb-8 text-center">
          <h1 className="text-5xl font-bold text-white mb-3">التحديات</h1>
          <p className="text-gray-300 text-lg">
            {hasWon
              ? "لقد فزت بأحد التحديات! لا يمكنك لعب المزيد"
              : remainingAttempts === 0
              ? "لقد استنفذت جميع فرصك"
              : "اختر تحديًا واحدًا للفوز بالتلميح"}
          </p>
        </div>

        {categories.map((category) => {
          const categoryChallenges = getChallengesByCategory(category.id);
          if (categoryChallenges.length === 0) return null;

          return (
            <div key={category.id} className="mb-8">
              <div className="flex items-center gap-3 mb-4">
                <category.icon className="w-6 h-6 text-white" />
                <h2 className="text-2xl font-bold text-white">{category.name}</h2>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {categoryChallenges.map((challenge) => {
                  const canPlay = canPlayChallenge(challenge.id);
                  const Icon = challenge.icon;
                  
                  return (
                    <div
                      key={challenge.id}
                      className={`bg-slate-800/50 backdrop-blur-xl rounded-2xl border-2 ${
                        challenge.borderColor
                      } p-6 transition-all transform ${
                        canPlay && !hasWon
                          ? "hover:scale-105 cursor-pointer shadow-xl"
                          : "opacity-50 cursor-not-allowed"
                      }`}
                      onClick={() => {
                        if (canPlay && !hasWon) {
                          selectChallenge(challenge.id);
                          startChallenge();
                        }
                      }}
                    >
                      <div
                        className={`w-20 h-20 bg-gradient-to-br ${challenge.color} rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-lg`}
                      >
                        <Icon className="w-10 h-10 text-white" />
                      </div>

                      <h3 className="text-2xl font-bold text-white mb-2 text-center">
                        {challenge.name}
                      </h3>

                      <p className="text-gray-300 text-center mb-4">
                        {challenge.description}
                      </p>

                      <button
                        disabled={!canPlay || hasWon}
                        className={`w-full py-3 rounded-xl font-bold transition-all shadow-lg ${
                          canPlay && !hasWon
                            ? `bg-gradient-to-r ${challenge.color} text-white hover:shadow-2xl`
                            : "bg-gray-700 text-gray-400 cursor-not-allowed"
                        }`}
                      >
                        {hasWon
                          ? "فزت بالفعل"
                          : !canPlay
                          ? "لا يمكن اللعب"
                          : "ابدأ التحدي"}
                      </button>
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
