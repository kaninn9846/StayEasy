import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { AlertCircle, MessageCircle, RefreshCw } from 'lucide-react';
import PublicNavbar from '../../components/Navbar/PublicNavbar';
import Footer from '../../components/Footer';
import { createPaymentFailureInquiry } from '../../services/api';

export default function PaymentFailed() {
  const { bookingId } = useParams<{ bookingId: string }>();
  const navigate = useNavigate();
  const [reason] = useState('Payment was cancelled or declined');

  useEffect(() => {
    if (bookingId) {
      createPaymentFailureInquiry(Number(bookingId)).catch(() => {});
    }
  }, [bookingId]);

  const handleChat = async () => {
    navigate("/chat");
  };

  const handleRetry = () => {
    navigate(`/payment/${bookingId}`);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 flex flex-col">
      <PublicNavbar />
      <main className="flex-grow flex items-center justify-center p-6">
        <div className="bg-white rounded-3xl shadow-2xl w-full max-w-md p-8 text-center">
          <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <AlertCircle className="w-8 h-8 text-red-500" />
          </div>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Payment Failed</h2>
          <p className="text-gray-500 text-sm mb-2">{reason}</p>
          <p className="text-gray-400 text-xs mb-6">
            We couldn't process your payment at the moment. Your booking inquiry has been saved. You can contact the landlord directly and complete the payment later.
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
      </main>
      <Footer />
    </div>
  );
}
