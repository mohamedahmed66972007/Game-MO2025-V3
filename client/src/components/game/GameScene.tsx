import { useEffect, useState } from "react";
import * as THREE from "three";
import { Canvas } from "@react-three/fiber";
import { KeyboardControls, Text, RoundedBox } from "@react-three/drei";
import { FirstPersonControls, Controls } from "./FirstPersonControls";
import { NumberPanel } from "./NumberPanel";
import { DisplayPanel } from "./DisplayPanel";
import { FeedbackPanel } from "./FeedbackPanel";
import { AttemptsHistory } from "./AttemptsHistory";
import { CurrentGuessDisplay } from "./CurrentGuessDisplay";
import { Crosshair } from "../ui/Crosshair";
import { useNumberGame } from "@/lib/stores/useNumberGame";

function BackWallStatus() {
  return null;
}

function PendingWinStatus() {
  const pendingWin = useNumberGame((state) => state.multiplayer.pendingWin);
  const pendingWinMessage = useNumberGame((state) => state.multiplayer.pendingWinMessage);
  const mode = useNumberGame((state) => state.mode);
  const [opacity, setOpacity] = useState(1);

  useEffect(() => {
    if (!pendingWin) return;
    const interval = setInterval(() => {
      setOpacity((prev) => prev === 1 ? 0.3 : 1);
    }, 600);
    return () => clearInterval(interval);
  }, [pendingWin]);

  if (mode !== "multiplayer" || !pendingWin) return null;

  return (
    <group position={[0, 1, -7]}>
      {/* Glowing rounded box background */}
      <RoundedBox
        args={[6.5, 3.5, 0.15]}
        radius={0.4}
        smoothness={6}
      >
        <meshStandardMaterial 
          color="#10b981"
          emissive="#10b981"
          emissiveIntensity={opacity * 0.5}
          metalness={0.3}
          roughness={0.3}
        />
      </RoundedBox>
      
      {/* Text on top */}
      <Text
        position={[0, 0, 0.1]}
        fontSize={0.55}
        color="#ffffff"
        anchorX="center"
        anchorY="middle"
        fontWeight="bold"
        maxWidth={5.8}
        anchorZ={0.5}
        lineHeight={1.8}
      >
        {pendingWinMessage}
      </Text>
    </group>
  );
}

function Scene({ onLockChange, isPointerLocked = false }: { onLockChange?: (locked: boolean) => void; isPointerLocked?: boolean }) {
  useEffect(() => {
    const handlePointerLockChange = () => {
      const isLocked = document.pointerLockElement !== null;
      onLockChange?.(isLocked);
    };

    document.addEventListener("pointerlockchange", handlePointerLockChange);
    return () => {
      document.removeEventListener("pointerlockchange", handlePointerLockChange);
    };
  }, [onLockChange]);

  return (
    <>
      {/* خلفية بيضاء فاتحة */}
      <color attach="background" args={["#f8f9fa"]} />
      
      {/* إضاءة محيطة ناعمة */}
      <ambientLight intensity={2.0} />
      
      {/* إضاءة رئيسية من الأعلى */}
      <directionalLight 
        position={[0, 10, 0]} 
        intensity={3.5} 
        color="#ffffff"
        castShadow
      />
      
      {/* إضاءة جانبية لإظهار الانعكاسات */}
      <pointLight position={[8, 3, 0]} intensity={1.5} color="#ffedd5" />
      <pointLight position={[-8, 3, 0]} intensity={1.5} color="#dbeafe" />
      <pointLight position={[0, 3, 8]} intensity={1.2} color="#ffffff" />
      <pointLight position={[0, 3, -8]} intensity={1.2} color="#ffffff" />
      
      {/* أرضية بيضاء مع انعكاس */}
      <mesh 
        position={[0, 0, 0]} 
        rotation={[-Math.PI / 2, 0, 0]}
        receiveShadow
      >
        <planeGeometry args={[30, 30]} />
        <meshStandardMaterial 
          color="#ffffff" 
          metalness={0.2}
          roughness={0.05}
          envMapIntensity={1}
        />
      </mesh>

      {/* الحائط الأمامي (الذي يواجه اللاعب) - سيحتوي على لوحة الأرقام */}
      <mesh position={[0, 4, -13]} receiveShadow>
        <boxGeometry args={[27, 8, 0.5]} />
        <meshStandardMaterial 
          color="#e0e7ff" 
          metalness={0.2}
          roughness={0.4}
        />
      </mesh>

      {/* الحائط الخلفي */}
      <mesh position={[0, 4, 13]} receiveShadow>
        <boxGeometry args={[27, 8, 0.5]} />
        <meshStandardMaterial 
          color="#e0e7ff" 
          metalness={0.2}
          roughness={0.4}
        />
      </mesh>

      {/* الحائط الأيمن */}
      <mesh position={[13, 4, 0]} rotation={[0, Math.PI / 2, 0]} receiveShadow>
        <boxGeometry args={[27, 8, 0.5]} />
        <meshStandardMaterial 
          color="#e0e7ff" 
          metalness={0.2}
          roughness={0.4}
        />
      </mesh>

      {/* الحائط الأيسر */}
      <mesh position={[-13, 4, 0]} rotation={[0, Math.PI / 2, 0]} receiveShadow>
        <boxGeometry args={[27, 8, 0.5]} />
        <meshStandardMaterial 
          color="#e0e7ff" 
          metalness={0.2}
          roughness={0.4}
        />
      </mesh>

      {/* السقف */}
      <mesh position={[0, 8, 0]} rotation={[Math.PI / 2, 0, 0]} receiveShadow>
        <planeGeometry args={[27, 27]} />
        <meshStandardMaterial 
          color="#fafafa" 
          metalness={0.1}
          roughness={0.4}
        />
      </mesh>

      <NumberPanel isPointerLocked={isPointerLocked} />
      <FeedbackPanel />
      <AttemptsHistory />
      <CurrentGuessDisplay />
      <BackWallStatus />
      
      <FirstPersonControls />
    </>
  );
}

const keyMap = [
  { name: Controls.forward, keys: ["ArrowUp", "KeyW"] },
  { name: Controls.back, keys: ["ArrowDown", "KeyS"] },
  { name: Controls.left, keys: ["ArrowLeft", "KeyA"] },
  { name: Controls.right, keys: ["ArrowRight", "KeyD"] },
];

export function GameScene() {
  const [isLocked, setIsLocked] = useState(false);
  const pendingWin = useNumberGame((state) => state.multiplayer.pendingWin);
  const pendingWinMessage = useNumberGame((state) => state.multiplayer.pendingWinMessage);
  const opponentWonFirst = useNumberGame((state) => state.multiplayer.opponentWonFirst);
  const mode = useNumberGame((state) => state.mode);
  const [showOpponentWonAlert, setShowOpponentWonAlert] = useState(true);

  return (
    <>
      <KeyboardControls map={keyMap}>
        <Canvas
          camera={{
            position: [0, 1.6, 0],
            fov: 60,
            near: 0.1,
            far: 1000,
          }}
          gl={{
            antialias: true,
          }}
        >
          <Scene onLockChange={setIsLocked} isPointerLocked={isLocked} />
        </Canvas>
      </KeyboardControls>
      {!isLocked && (
        <div className="fixed inset-0 flex flex-col items-center justify-start pointer-events-none z-40 pt-8">
          <div className="text-white text-sm bg-black bg-opacity-50 p-4 rounded">
            <p className="mb-2">اضغط على الشاشة لقفل المؤشر</p>
          </div>
        </div>
      )}
      
      {mode === "multiplayer" && pendingWin && (
        <div className="fixed top-20 left-1/2 transform -translate-x-1/2 pointer-events-auto z-50">
          <div className="bg-gradient-to-br from-green-50 to-emerald-50 rounded-2xl p-8 shadow-2xl border-2 border-green-300 w-96 mx-4 animate-pulse">
            <h3 className="text-2xl font-bold text-green-700 mb-3 text-center">🎉 انتظر الخصم</h3>
            <p className="text-gray-800 font-semibold text-center text-lg">{pendingWinMessage}</p>
          </div>
        </div>
      )}

      {mode === "multiplayer" && opponentWonFirst && !pendingWin && showOpponentWonAlert && (
        <div className="fixed top-20 right-6 bg-gradient-to-br from-orange-50 to-red-50 rounded-2xl p-6 shadow-2xl border-2 border-orange-300 max-w-sm animate-pulse z-50">
          <div className="flex items-start justify-between mb-3">
            <div className="text-4xl">⚠️</div>
            <button
              onClick={() => setShowOpponentWonAlert(false)}
              className="p-1 hover:bg-red-100 rounded-lg transition-colors"
            >
              <svg className="w-6 h-6 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
          <h3 className="text-xl font-bold text-red-700 mb-2">تحذير!</h3>
          <p className="text-gray-800 font-semibold mb-2 text-sm">لقد خمن الخصم الرقم السري الصحيح</p>
          <p className="text-sm text-red-600 font-bold">متبق لديك فرصة واحدة لتفوز</p>
        </div>
      )}
      
      <Crosshair />
    </>
  );
}
