import { useState } from "react";
import { User, UserPlus, LogIn, X, Eye, EyeOff } from "lucide-react";
import { useAccount, createAccount, loginAccount } from "@/lib/stores/useAccount";
import { toast } from "sonner";

interface AccountDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

export function AccountDialog({ isOpen, onClose, onSuccess }: AccountDialogProps) {
  const { setAccount } = useAccount();
  const [mode, setMode] = useState<"login" | "create">("login");
  const [displayName, setDisplayName] = useState("");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");

  if (!isOpen) return null;

  const handleLogin = async () => {
    if (!username.trim()) {
      setError("أدخل اسم المستخدم");
      return;
    }
    if (!password.trim()) {
      setError("أدخل كلمة المرور");
      return;
    }

    setIsLoading(true);
    setError("");

    try {
      const account = await loginAccount(username.trim(), password);
      setAccount(account);
      toast.success(`مرحباً ${account.displayName}!`);
      resetForm();
      onSuccess?.();
      onClose();
    } catch (err: any) {
      setError(err.message || "حدث خطأ أثناء تسجيل الدخول");
    } finally {
      setIsLoading(false);
    }
  };

  const handleCreate = async () => {
    if (!displayName.trim()) {
      setError("أدخل الاسم");
      return;
    }
    if (!username.trim()) {
      setError("أدخل اسم المستخدم");
      return;
    }
    if (!password.trim()) {
      setError("أدخل كلمة المرور");
      return;
    }

    if (username.length < 3) {
      setError("اسم المستخدم يجب أن يكون 3 أحرف على الأقل");
      return;
    }

    if (!/^[a-zA-Z0-9_]+$/.test(username)) {
      setError("اسم المستخدم يجب أن يحتوي على أحرف إنجليزية وأرقام فقط");
      return;
    }

    if (password.length < 4) {
      setError("كلمة المرور يجب أن تكون 4 أحرف على الأقل");
      return;
    }

    setIsLoading(true);
    setError("");

    try {
      const account = await createAccount(displayName.trim(), username.trim(), password);
      toast.success(`تم إنشاء الحساب بنجاح! مرحباً ${account.displayName}`);
      resetForm();
      onSuccess?.();
      onClose();
    } catch (err: any) {
      setError(err.message || "حدث خطأ أثناء إنشاء الحساب");
    } finally {
      setIsLoading(false);
    }
  };

  const resetForm = () => {
    setDisplayName("");
    setUsername("");
    setPassword("");
    setError("");
    setShowPassword(false);
  };

  const handleModeChange = (newMode: "login" | "create") => {
    setMode(newMode);
    setError("");
  };

  return (
    <div className="fixed inset-0 flex items-center justify-center bg-black/50 z-50 p-4" dir="rtl">
      <div className="bg-white rounded-2xl shadow-2xl p-6 max-w-md w-full space-y-6 animate-in fade-in zoom-in duration-200">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-bold text-gray-800">
            {mode === "login" ? "تسجيل الدخول" : "إنشاء حساب جديد"}
          </h2>
          <button
            onClick={() => { resetForm(); onClose(); }}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>

        <div className="flex gap-2">
          <button
            onClick={() => handleModeChange("login")}
            className={`flex-1 py-2 px-4 rounded-lg font-semibold transition-colors flex items-center justify-center gap-2 ${
              mode === "login"
                ? "bg-blue-500 text-white"
                : "bg-gray-100 text-gray-700 hover:bg-gray-200"
            }`}
          >
            <LogIn className="w-4 h-4" />
            دخول
          </button>
          <button
            onClick={() => handleModeChange("create")}
            className={`flex-1 py-2 px-4 rounded-lg font-semibold transition-colors flex items-center justify-center gap-2 ${
              mode === "create"
                ? "bg-blue-500 text-white"
                : "bg-gray-100 text-gray-700 hover:bg-gray-200"
            }`}
          >
            <UserPlus className="w-4 h-4" />
            حساب جديد
          </button>
        </div>

        <div className="space-y-4">
          {mode === "create" && (
            <div>
              <label className="block text-sm font-bold text-gray-700 mb-2">
                الاسم الظاهر
              </label>
              <input
                type="text"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                placeholder="مثال: محمد أحمد"
                className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:outline-none focus:border-blue-500"
                maxLength={50}
              />
            </div>
          )}

          <div>
            <label className="block text-sm font-bold text-gray-700 mb-2">
              اسم المستخدم
            </label>
            <input
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value.replace(/[^a-zA-Z0-9_]/g, ""))}
              placeholder="مثال: mohamed_123"
              className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:outline-none focus:border-blue-500 font-mono"
              dir="ltr"
              maxLength={30}
            />
            {mode === "create" && (
              <p className="text-xs text-gray-500 mt-1">
                أحرف إنجليزية وأرقام فقط
              </p>
            )}
          </div>

          <div>
            <label className="block text-sm font-bold text-gray-700 mb-2">
              كلمة المرور
            </label>
            <div className="relative">
              <input
                type={showPassword ? "text" : "password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="أدخل كلمة المرور"
                className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:outline-none focus:border-blue-500 pl-12"
                dir="ltr"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
              >
                {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
              </button>
            </div>
            {mode === "create" && (
              <p className="text-xs text-gray-500 mt-1">
                4 أحرف على الأقل
              </p>
            )}
          </div>

          {error && (
            <p className="text-red-500 text-sm text-center">{error}</p>
          )}

          <button
            onClick={mode === "login" ? handleLogin : handleCreate}
            disabled={isLoading}
            className="w-full bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 disabled:from-gray-400 disabled:to-gray-500 text-white font-bold py-3 px-6 rounded-xl shadow-lg transition-all duration-200"
          >
            {isLoading ? "جاري التحميل..." : mode === "login" ? "دخول" : "إنشاء حساب"}
          </button>
        </div>

        <p className="text-center text-sm text-gray-500">
          الحساب يتيح لك إضافة أصدقاء ودعوتهم للغرف
        </p>
      </div>
    </div>
  );
}
