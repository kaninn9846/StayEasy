import { useEffect, useState } from "react";
import { MessageCircle, X } from "lucide-react";

interface ChatToastProps {
  title: string;
  body: string;
  onViewChat: () => void;
  onDismiss: () => void;
}

export default function ChatToast({ title, body, onViewChat, onDismiss }: ChatToastProps) {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    requestAnimationFrame(() => setVisible(true));
    const timer = setTimeout(() => {
      setVisible(false);
      setTimeout(onDismiss, 300);
    }, 5000);
    return () => clearTimeout(timer);
  }, [onDismiss]);

  return (
    <div
      className={`fixed bottom-6 right-6 z-50 max-w-sm w-full transition-all duration-300 ${
        visible ? "translate-y-0 opacity-100" : "translate-y-4 opacity-0"
      }`}
    >
      <div className="bg-white rounded-2xl shadow-2xl border border-gray-100 p-4 animate-fadeIn">
        <div className="flex items-start gap-3">
          <div className="w-10 h-10 rounded-full bg-[#A989C8]/10 flex items-center justify-center shrink-0">
            <MessageCircle className="w-5 h-5 text-[#A989C8]" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">New Message</p>
            <p className="text-sm font-bold text-gray-900 mt-0.5 truncate">{title}</p>
            <p className="text-sm text-gray-600 truncate mt-0.5">{body}</p>
            <div className="flex items-center gap-3 mt-3">
              <button
                onClick={() => { setVisible(false); setTimeout(onViewChat, 300); }}
                className="text-xs font-semibold text-white bg-[#A989C8] px-4 py-1.5 rounded-lg hover:bg-[#8d6aa9] transition"
              >
                View Chat
              </button>
            </div>
          </div>
          <button
            onClick={() => { setVisible(false); setTimeout(onDismiss, 300); }}
            className="p-1 hover:bg-gray-100 rounded-lg transition shrink-0"
          >
            <X className="w-4 h-4 text-gray-400" />
          </button>
        </div>
      </div>
    </div>
  );
}
