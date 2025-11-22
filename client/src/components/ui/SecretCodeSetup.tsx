import { useState } from "react";
import { Button } from "./button";
import { Card, CardContent, CardHeader, CardTitle } from "./card";
import { useNumberGame } from "@/lib/stores/useNumberGame";
import { send } from "@/lib/websocket";

export function SecretCodeSetup() {
  const { multiplayer, setMySecretCode } = useNumberGame();
  const [code, setCode] = useState<number[]>([]);
  const numDigits = multiplayer.settings.numDigits;

  const handleDigitClick = (digit: number) => {
    if (code.length < numDigits) {
      setCode([...code, digit]);
    }
  };

  const handleDelete = () => {
    if (code.length > 0) {
      setCode(code.slice(0, -1));
    }
  };

  const handleConfirm = () => {
    if (code.length === numDigits && multiplayer.opponentId) {
      setMySecretCode(code);
      setCode([]);
      send({
        type: "set_secret_code",
        opponentId: multiplayer.opponentId,
        code,
      });
    }
  };

  const displayText = code.map((d) => d.toString()).join("  ");
  const emptySlots = numDigits - code.length;
  const emptyText = "_  ".repeat(emptySlots);

  return (
    <div className="fixed inset-0 flex items-center justify-center bg-gradient-to-br from-blue-50 via-white to-purple-50 z-50" dir="ltr">
      <Card className="w-full max-w-md mx-4 bg-white shadow-xl border border-gray-200 rounded-2xl relative overflow-hidden">
        <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-blue-500 via-purple-500 to-pink-500"></div>
        
        <CardHeader className="text-center pb-2 pt-6">
          <div className="mb-4 flex justify-center">
            <div className="w-16 h-16 bg-gradient-to-br from-blue-500 to-blue-600 rounded-2xl flex items-center justify-center shadow-lg">
              <span className="text-3xl">🔒</span>
            </div>
          </div>
          <CardTitle className="text-center text-gray-800 text-3xl font-bold mb-2">
            اختر الرقم السري
          </CardTitle>
          <p className="text-center text-gray-600 text-base">
            اختر <span className="text-blue-600 font-bold">{numDigits} أرقام</span> ليخمنها خصمك
          </p>
        </CardHeader>
        
        <CardContent className="space-y-5 p-6">
          <div className="bg-gradient-to-r from-blue-50 to-purple-50 p-4 rounded-xl border-2 border-blue-200">
            <p className="text-blue-700 text-4xl font-mono tracking-[0.3em] text-center font-bold">
              {displayText}{emptyText}
            </p>
          </div>

          <div className="grid grid-cols-3 gap-2 mb-3">
            {[1, 2, 3].map((digit) => (
              <Button
                key={digit}
                onClick={() => handleDigitClick(digit)}
                disabled={code.length >= numDigits}
                className="bg-gradient-to-br from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 disabled:from-gray-300 disabled:to-gray-400 disabled:opacity-50 text-white text-xl h-14 rounded-lg shadow-md transform hover:scale-105 transition-all duration-200 font-bold"
              >
                {digit}
              </Button>
            ))}
          </div>

          <div className="grid grid-cols-3 gap-2 mb-3">
            {[4, 5, 6].map((digit) => (
              <Button
                key={digit}
                onClick={() => handleDigitClick(digit)}
                disabled={code.length >= numDigits}
                className="bg-gradient-to-br from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 disabled:from-gray-300 disabled:to-gray-400 disabled:opacity-50 text-white text-xl h-14 rounded-lg shadow-md transform hover:scale-105 transition-all duration-200 font-bold"
              >
                {digit}
              </Button>
            ))}
          </div>

          <div className="grid grid-cols-3 gap-2 mb-3">
            {[7, 8, 9].map((digit) => (
              <Button
                key={digit}
                onClick={() => handleDigitClick(digit)}
                disabled={code.length >= numDigits}
                className="bg-gradient-to-br from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 disabled:from-gray-300 disabled:to-gray-400 disabled:opacity-50 text-white text-xl h-14 rounded-lg shadow-md transform hover:scale-105 transition-all duration-200 font-bold"
              >
                {digit}
              </Button>
            ))}
          </div>

          <div className="grid grid-cols-3 gap-2">
            <Button
              onClick={handleDelete}
              disabled={code.length === 0}
              className="bg-gradient-to-r from-red-500 to-red-600 hover:from-red-600 hover:to-red-700 disabled:from-gray-300 disabled:to-gray-400 disabled:opacity-50 text-white font-semibold h-14 rounded-lg shadow-md transform hover:scale-105 transition-all duration-200"
            >
              <span className="mr-2">🗑️</span>
              حذف
            </Button>
            <Button
              onClick={() => handleDigitClick(0)}
              disabled={code.length >= numDigits}
              className="bg-gradient-to-br from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 disabled:from-gray-300 disabled:to-gray-400 disabled:opacity-50 text-white text-xl h-14 rounded-lg shadow-md transform hover:scale-105 transition-all duration-200 font-bold"
            >
              0
            </Button>
            <Button
              onClick={handleConfirm}
              disabled={code.length !== numDigits}
              className="bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 disabled:from-gray-300 disabled:to-gray-400 disabled:opacity-50 text-white font-semibold h-14 rounded-lg shadow-md transform hover:scale-105 transition-all duration-200"
            >
              <span className="mr-2">✓</span>
              تأكيد
            </Button>
          </div>

          {multiplayer.mySecretCode.length === numDigits && (
            <div className="bg-gradient-to-br from-blue-50 to-cyan-50 p-5 rounded-xl border-2 border-blue-200 shadow-md animate-pulse">
              <div className="flex items-center justify-center mb-2">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
              </div>
              <p className="text-blue-700 text-center font-semibold text-lg">
                في انتظار الخصم...
              </p>
              <p className="text-blue-600 text-center text-sm mt-2">
                يرجى الانتظار حتى يدخل خصمك رقمه السري
              </p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
