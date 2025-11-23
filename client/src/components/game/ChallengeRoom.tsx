import { useEffect, useRef, useState } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import { Text, RoundedBox, KeyboardControls } from "@react-three/drei";
import { FirstPersonControls, Controls } from "./FirstPersonControls";
import { useChallenge } from "@/lib/stores/useChallenge";
import * as THREE from "three";
import { useThree } from "@react-three/fiber";
import { Crosshair } from "../ui/Crosshair";

const BUTTON_COLORS = [
  { name: "أحمر", color: "#ef4444", sound: 261.63 },
  { name: "أزرق", color: "#3b82f6", sound: 293.66 },
  { name: "أخضر", color: "#22c55e", sound: 329.63 },
  { name: "أصفر", color: "#eab308", sound: 349.23 },
  { name: "بنفسجي", color: "#a855f7", sound: 392.00 },
  { name: "برتقالي", color: "#f97316", sound: 440.00 },
  { name: "وردي", color: "#ec4899", sound: 493.88 },
  { name: "سماوي", color: "#06b6d4", sound: 523.25 },
];

function ColorButton({
  index,
  color,
  position,
  isActive,
  isHovered,
}: {
  index: number;
  color: string;
  position: [number, number, number];
  isActive: boolean;
  isHovered: boolean;
}) {
  const meshRef = useRef<THREE.Mesh>(null);
  const lightRef = useRef<THREE.PointLight>(null);

  useFrame((state) => {
    if (meshRef.current && !isActive) {
      const time = state.clock.getElapsedTime();
      meshRef.current.position.y = Math.sin(time * 2 + index) * 0.1;
    }
    
    if (lightRef.current) {
      lightRef.current.intensity = isActive ? 12 : isHovered ? 0.2 : 0.05;
    }
  });

  useEffect(() => {
    if (isActive && meshRef.current) {
      const material = meshRef.current.material as THREE.MeshStandardMaterial;
      material.emissiveIntensity = 8;
      
      const timeout = setTimeout(() => {
        material.emissiveIntensity = isHovered ? 0.1 : 0;
      }, 500);
      
      return () => clearTimeout(timeout);
    }
  }, [isActive, isHovered]);

  return (
    <group position={position}>
      {/* إضاءة نقطية من الكرة */}
      <pointLight
        ref={lightRef}
        position={[0, 0, 0]}
        color={color}
        intensity={isActive ? 12 : isHovered ? 0.2 : 0.05}
        distance={8}
        decay={2}
      />
      
      <mesh
        ref={meshRef}
        userData={{ buttonIndex: index, isButton: true }}
      >
        <sphereGeometry args={[0.6, 32, 32]} />
        <meshStandardMaterial
          color={color}
          emissive={color}
          emissiveIntensity={isActive ? 8 : isHovered ? 0.1 : 0}
          metalness={0.5}
          roughness={0.3}
        />
      </mesh>
    </group>
  );
}

function RaycastInteraction({ onButtonClick, onHoverButton, onExitClick }: { 
  onButtonClick: (index: number) => void;
  onHoverButton: (index: number | null) => void;
  onExitClick: () => void;
}) {
  const { camera, scene } = useThree();
  const raycaster = useRef(new THREE.Raycaster());
  const lastClickTimeRef = useRef(0);

  useFrame(() => {
    raycaster.current.setFromCamera(new THREE.Vector2(0, 0), camera);
    const intersects = raycaster.current.intersectObjects(scene.children, true);
    
    let foundButton = false;
    for (const intersect of intersects) {
      if (intersect.object.userData.isButton) {
        onHoverButton(intersect.object.userData.buttonIndex);
        foundButton = true;
        break;
      }
      if (intersect.object.userData.isExitButton) {
        onHoverButton(-1);
        foundButton = true;
        break;
      }
    }
    
    if (!foundButton) {
      onHoverButton(null);
    }
  });

  useEffect(() => {
    const handlePointerDown = () => {
      const now = Date.now();
      if (now - lastClickTimeRef.current < 300) return;
      lastClickTimeRef.current = now;
      
      raycaster.current.setFromCamera(new THREE.Vector2(0, 0), camera);
      const intersects = raycaster.current.intersectObjects(scene.children, true);
      
      for (const intersect of intersects) {
        if (intersect.object.userData.isExitButton) {
          onExitClick();
          break;
        }
        if (intersect.object.userData.isButton) {
          const buttonIndex = intersect.object.userData.buttonIndex;
          onButtonClick(buttonIndex);
          break;
        }
      }
    };

    window.addEventListener('pointerdown', handlePointerDown);
    return () => window.removeEventListener('pointerdown', handlePointerDown);
  }, [camera, scene, onButtonClick, onExitClick]);

  return null;
}

function ChallengeRoomScene({ onExit, onHoverButton }: { 
  onExit: () => void;
  onHoverButton: (index: number | null) => void;
}) {
  const {
    sequence,
    playerSequence,
    currentLevel,
    phase,
    isShowingSequence,
    canInput,
    addToPlayerSequence,
    checkSequence,
    setIsShowingSequence,
    setCanInput,
  } = useChallenge();

  const [activeButton, setActiveButton] = useState<number | null>(null);
  const [hoveredButton, setHoveredButton] = useState<number | null>(null);
  const [isExitButtonHovered, setIsExitButtonHovered] = useState(false);
  const audioContextRef = useRef<AudioContext | null>(null);

  const handleHoverButton = (index: number | null) => {
    setHoveredButton(index);
    onHoverButton(index);
  };

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
    if (isShowingSequence && sequence.length > 0) {
      let index = 0;
      const delay = Math.max(600 - currentLevel * 50, 300);

      const showNext = () => {
        if (index < sequence.length) {
          const buttonIndex = sequence[index];
          if (buttonIndex !== undefined && BUTTON_COLORS[buttonIndex]) {
            setActiveButton(buttonIndex);
            playSound(BUTTON_COLORS[buttonIndex].sound);

            setTimeout(() => {
              setActiveButton(null);
              index++;
              setTimeout(showNext, delay);
            }, 500);
          }
        } else {
          setIsShowingSequence(false);
          setCanInput(true);
        }
      };

      setTimeout(showNext, 1000);
    }
  }, [isShowingSequence, sequence, currentLevel]);


  const lastClickRef = useRef<number>(-Infinity);

  const handleButtonClick = (index: number) => {
    if (!canInput || isShowingSequence) return;
    
    const now = Date.now();
    if (now - lastClickRef.current < 350) return;
    lastClickRef.current = now;
    
    setActiveButton(index);
    playSound(BUTTON_COLORS[index].sound);
    addToPlayerSequence(index);

    setTimeout(() => {
      setActiveButton(null);
    }, 300);
  };

  const buttonPositions: [number, number, number][] = [
    [-4.5, 4.5, -10],
    [-1.5, 4.5, -10],
    [1.5, 4.5, -10],
    [4.5, 4.5, -10],
    [-4.5, 2, -10],
    [-1.5, 2, -10],
    [1.5, 2, -10],
    [4.5, 2, -10],
  ];

  return (
    <>
      <color attach="background" args={["#000000"]} />
      <fog attach="fog" args={["#000000", 15, 40]} />
      
      <ambientLight intensity={0.15} />
      <hemisphereLight intensity={0.2} groundColor="#000000" />
      <pointLight position={[0, 6, 0]} intensity={0.8} color="#ffffff" />
      <pointLight position={[0, 3, -10]} intensity={0.5} color="#ffffff" />

      {/* أرضية سوداء عاكسة */}
      <mesh position={[0, 0, 0]} rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
        <planeGeometry args={[30, 30]} />
        <meshStandardMaterial 
          color="#000000" 
          metalness={1} 
          roughness={0.1}
          envMapIntensity={0.5}
        />
      </mesh>

      {/* الحائط الأمامي */}
      <mesh position={[0, 4, -13]} receiveShadow>
        <boxGeometry args={[27, 8, 0.5]} />
        <meshStandardMaterial 
          color="#000000" 
          metalness={0.9} 
          roughness={0.1}
        />
      </mesh>

      {/* الحائط الخلفي */}
      <mesh position={[0, 4, 13]} receiveShadow>
        <boxGeometry args={[27, 8, 0.5]} />
        <meshStandardMaterial 
          color="#000000" 
          metalness={0.9} 
          roughness={0.1}
        />
      </mesh>

      {/* الحائط الأيمن */}
      <mesh position={[13, 4, 0]} rotation={[0, Math.PI / 2, 0]} receiveShadow>
        <boxGeometry args={[27, 8, 0.5]} />
        <meshStandardMaterial 
          color="#000000" 
          metalness={0.9} 
          roughness={0.1}
        />
      </mesh>

      {/* الحائط الأيسر */}
      <mesh position={[-13, 4, 0]} rotation={[0, Math.PI / 2, 0]} receiveShadow>
        <boxGeometry args={[27, 8, 0.5]} />
        <meshStandardMaterial 
          color="#000000" 
          metalness={0.9} 
          roughness={0.1}
        />
      </mesh>

      {/* السقف */}
      <mesh position={[0, 8, 0]} rotation={[Math.PI / 2, 0, 0]} receiveShadow>
        <planeGeometry args={[27, 27]} />
        <meshStandardMaterial 
          color="#000000" 
          metalness={0.9} 
          roughness={0.1}
        />
      </mesh>

      {/* الأزرار الملونة - كرات طافية */}
      {BUTTON_COLORS.map((btn, index) => (
        <ColorButton
          key={index}
          index={index}
          color={btn.color}
          position={buttonPositions[index]}
          isActive={activeButton === index}
          isHovered={hoveredButton === index}
        />
      ))}

      {/* لوحة معلومات عائمة */}
      <group position={[0, 6.5, -9]}>
        <mesh>
          <planeGeometry args={[8, 1.5]} />
          <meshStandardMaterial 
            color="#000000" 
            transparent 
            opacity={0.7}
            metalness={0.5}
            roughness={0.2}
          />
        </mesh>
        <Text
          position={[0, 0.3, 0.1]}
          fontSize={0.5}
          color="#ffffff"
          anchorX="center"
          anchorY="middle"
          fontWeight="bold"
        >
          المستوى: {currentLevel + 1} / 5
        </Text>
        
        {isShowingSequence && (
          <Text
            position={[0, -0.3, 0.1]}
            fontSize={0.35}
            color="#fbbf24"
            anchorX="center"
            anchorY="middle"
          >
            راقب التسلسل...
          </Text>
        )}

        {canInput && (
          <Text
            position={[0, -0.3, 0.1]}
            fontSize={0.35}
            color="#22c55e"
            anchorX="center"
            anchorY="middle"
          >
            دورك! ({playerSequence.length} / {sequence.length})
          </Text>
        )}
      </group>

      {/* زر الخروج */}
      <group position={[-11, 2, 0]} rotation={[0, Math.PI / 2, 0]}>
        <mesh userData={{ isExitButton: true }}>
          <boxGeometry args={[2, 3.5, 0.3]} />
          <meshStandardMaterial
            color={isExitButtonHovered ? "#dc2626" : "#ef4444"}
            emissive="#ef4444"
            emissiveIntensity={isExitButtonHovered ? 1 : 0.8}
            metalness={0.5}
            roughness={0.3}
          />
        </mesh>
        <Text
          position={[0, 0, 0.2]}
          fontSize={0.4}
          color="#ffffff"
          anchorX="center"
          anchorY="middle"
        >
          خروج
        </Text>
      </group>

      <RaycastInteraction onButtonClick={handleButtonClick} onHoverButton={(index) => {
        setIsExitButtonHovered(index === -1);
        if (index !== -1) handleHoverButton(index);
      }} onExitClick={onExit} />
      
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

export function ChallengeRoom({ onExit }: { onExit: () => void }) {
  const [hoveredButton, setHoveredButton] = useState<number | null>(null);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        document.exitPointerLock?.();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, []);

  return (
    <div style={{ width: '100vw', height: '100vh', position: 'fixed', top: 0, left: 0, zIndex: 100 }}>
      <KeyboardControls map={keyMap}>
        <Canvas
          camera={{
            position: [0, 3.5, 2],
            fov: 60,
            near: 0.1,
            far: 1000,
          }}
          onCreated={({ gl }) => {
            requestAnimationFrame(() => {
              gl.domElement.requestPointerLock();
            });
          }}
        >
          <ChallengeRoomScene onExit={onExit} onHoverButton={setHoveredButton} />
        </Canvas>
      </KeyboardControls>
      
      <Crosshair isHoveringButton={hoveredButton !== null} />
    </div>
  );
}
