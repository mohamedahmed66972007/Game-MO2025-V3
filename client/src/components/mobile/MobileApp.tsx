import { useEffect } from "react";
import { useNumberGame } from "@/lib/stores/useNumberGame";
import { useAudio } from "@/lib/stores/useAudio";
import { MobileMenu } from "./MobileMenu";
import { MobileSingleplayer } from "./MobileSingleplayer";
import { MobileMultiplayer } from "./MobileMultiplayer";

export function MobileApp() {
  const { mode } = useNumberGame();
  const { setSuccessSound } = useAudio();

  useEffect(() => {
    const successAudio = new Audio("/sounds/success.mp3");
    successAudio.load();
    setSuccessSound(successAudio);
  }, [setSuccessSound]);

  return (
    <div dir="rtl" className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50">
      {mode === "menu" && <MobileMenu />}
      {mode === "singleplayer" && <MobileSingleplayer />}
      {mode === "multiplayer" && <MobileMultiplayer />}
    </div>
  );
}
