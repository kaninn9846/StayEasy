import { MessageCircle, RefreshCw, X, AlertCircle } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { createPaymentFailureInquiry } from "../../services/api";

interface Props {
  bookingId: number;
  propertyId: number;
  onClose: () => void;
}

export default function PaymentFailedModal({ bookingId, propertyId, onClose }: Props) {
  const navigate = useNavigate();

  const handleChat = async () => {
    await createPaymentFailureInquiry(bookingId);
    navigate("/chat");
  };

  const handleRetry = () => {
    navigate(`/payment/${bookingId}`);
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4 animate-fadeIn" onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="bg-white rounded-3xl shadow-2xl w-full max-w-md overflow-hidden" onClick={(e) => e.stopPropagation()}>
        <div className="relative p-8 text-center">
          <button onClick={onClose} className="absolute top-4 right-4 p-1 hover:bg-gray-100 rounded-lg"><X className="w-5 h-5 text-gray-400" /></button>
          <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <AlertCircle className="w-8 h-8 text-red-500" />
          </div>
          <h3 className="text-2xl font-bold text-gray-900 mb-2">Payment Failed</h3>
          <p className="text-gray-500 text-sm mb-6">
            We couldn't process your payment at the moment. Your booking inquiry has been saved successfully. You can contact the landlord directly and complete the payment later.
          </p>
          <div className="flex flex-col gap-3">
            <button
              onClick={handleChat}
              className="flex items-center justify-center gap-2 px-4 py-3 bg-[#A989C8] text-white rounded-xl text-sm font-bold hover:bg-[#9678b5] transition shadow-lg"
            >
              <MessageCircle size={16} /> Chat with Owner
            </button>
            <button
              onClick={handleRetry}
              className="flex items-center justify-center gap-2 px-4 py-3 bg-white border-2 border-[#A989C8] text-[#A989C8] rounded-xl text-sm font-bold hover:bg-[#F3E8FF] transition"
            >
              <RefreshCw size={16} /> Retry Payment
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
