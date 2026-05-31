import { Check, MessageCircle } from "lucide-react";
import { useNavigate } from "react-router-dom";

interface Props {
  onClose: () => void;
}

export default function RequestSentModal({ onClose }: Props) {
  const navigate = useNavigate();

  return (
    <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4" onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm p-8 text-center" onClick={(e) => e.stopPropagation()}>
        <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
          <Check className="w-8 h-8 text-green-600" />
        </div>
        <h3 className="text-xl font-bold text-gray-900 mb-2">Request Sent!</h3>
        <p className="text-sm text-gray-500 mb-6">
          Your booking request has been sent to the landlord. You'll be notified when they respond. A chat has also been opened for direct communication.
        </p>
        <div className="flex flex-col gap-3">
          <button
            onClick={() => { onClose(); navigate("/chat"); }}
            className="flex items-center justify-center gap-2 px-4 py-2.5 bg-[#A989C8] text-white rounded-xl text-sm font-bold hover:bg-[#9678b5] transition"
          >
            <MessageCircle size={16} /> Chat with Landlord
          </button>
          <button
            onClick={onClose}
            className="text-sm text-gray-500 hover:text-gray-700 font-medium"
          >
            Continue browsing
          </button>
        </div>
      </div>
    </div>
  );
}
