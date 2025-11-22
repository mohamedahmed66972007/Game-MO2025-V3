export function Crosshair() {
  return (
    <div className="fixed inset-0 flex items-center justify-center pointer-events-none z-50">
      <div className="w-3 h-3 bg-white rounded-full border-2 border-black shadow-lg" />
    </div>
  );
}
