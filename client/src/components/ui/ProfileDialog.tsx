import { useState } from "react";
import { X, Eye, EyeOff, Save, User } from "lucide-react";
import { useAccount, updateAccount } from "@/lib/stores/useAccount";
import { toast } from "sonner";

interface ProfileDialogProps {
  isOpen: boolean;
  onClose: () => void;
}

export function ProfileDialog({ isOpen, onClose }: ProfileDialogProps) {
  const { account, setAccount } = useAccount();
  const [displayName, setDisplayName] = useState(account?.displayName || "");
  const [username, setUsername] = useState(account?.username || "");
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");

  if (!isOpen || !account) return null;

  const handleSave = async () => {
    setError("");
    
    if (!displayName.trim()) {
      setError("الاسم الظاهر مطلوب");
      return;
    }

    if (!username.trim()) {
      setError("اسم المستخدم مطلوب");
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

    if (newPassword && newPassword.length < 4) {
      setError("كلمة المرور الجديدة يجب أن تكون 4 أحرف على الأقل");
      return;
    }

    if (newPassword && !currentPassword) {
      setError("أدخل كلمة المرور الحالية لتغيير كلمة المرور");
      return;
    }

    setIsLoading(true);

    try {
      const updates: any = {};
      
      if (displayName !== account.displayName) {
        updates.displayName = displayName.trim();
      }
      
      if (username !== account.username) {
        updates.username = username.trim();
      }
      
      if (newPassword) {
        updates.currentPassword = currentPassword;
        updates.newPassword = newPassword;
      }

      if (Object.keys(updates).length === 0) {
        toast.info("لم يتم إجراء أي تغييرات");
        onClose();
        return;
      }

      const updatedAccount = await updateAccount(account.id, updates);
      setAccount(updatedAccount);
      toast.success("تم تحديث الملف الشخصي بنجاح");
      setCurrentPassword("");
      setNewPassword("");
      onClose();
    } catch (err: any) {
      setError(err.message || "حدث خطأ أثناء التحديث");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 flex items-center justify-center bg-black/50 z-50 p-4" dir="rtl">
      <div className="bg-white rounded-2xl shadow-2xl p-6 max-w-md w-full space-y-6 animate-in fade-in zoom-in duration-200">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-bold text-gray-800 flex items-center gap-2">
            <User className="w-5 h-5" />
            تعديل الملف الشخصي
          </h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>

        <div className="w-20 h-20 mx-auto bg-gradient-to-br from-blue-500 to-purple-500 rounded-full flex items-center justify-center text-white font-bold text-3xl shadow-lg">
          {displayName.charAt(0) || account.displayName.charAt(0)}
        </div>

        <div className="space-y-4">
          <div>
            <label className="block text-sm font-bold text-gray-700 mb-2">
              الاسم الظاهر
            </label>
            <input
              type="text"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              placeholder="اسمك الذي يظهر للآخرين"
              className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:outline-none focus:border-blue-500"
              maxLength={50}
            />
          </div>

          <div>
            <label className="block text-sm font-bold text-gray-700 mb-2">
              اسم المستخدم
            </label>
            <input
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value.replace(/[^a-zA-Z0-9_]/g, ""))}
              placeholder="اسم تسجيل الدخول"
              className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:outline-none focus:border-blue-500 font-mono"
              dir="ltr"
              maxLength={30}
            />
            <p className="text-xs text-gray-500 mt-1">
              أحرف إنجليزية وأرقام فقط
            </p>
          </div>

          <div className="border-t pt-4">
            <p className="text-sm font-bold text-gray-700 mb-3">تغيير كلمة المرور (اختياري)</p>
            
            <div className="space-y-3">
              <div className="relative">
                <input
                  type={showCurrentPassword ? "text" : "password"}
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  placeholder="كلمة المرور الحالية"
                  className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:outline-none focus:border-blue-500 pl-12"
                  dir="ltr"
                />
                <button
                  type="button"
                  onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                  className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                >
                  {showCurrentPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                </button>
              </div>

              <div className="relative">
                <input
                  type={showNewPassword ? "text" : "password"}
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="كلمة المرور الجديدة"
                  className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:outline-none focus:border-blue-500 pl-12"
                  dir="ltr"
                />
                <button
                  type="button"
                  onClick={() => setShowNewPassword(!showNewPassword)}
                  className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                >
                  {showNewPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                </button>
              </div>
            </div>
          </div>

          {error && (
            <p className="text-red-500 text-sm text-center">{error}</p>
          )}

          <button
            onClick={handleSave}
            disabled={isLoading}
            className="w-full bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 disabled:from-gray-400 disabled:to-gray-500 text-white font-bold py-3 px-6 rounded-xl shadow-lg transition-all duration-200 flex items-center justify-center gap-2"
          >
            <Save className="w-5 h-5" />
            {isLoading ? "جاري الحفظ..." : "حفظ التغييرات"}
          </button>
        </div>
      </div>
    </div>
  );
}
