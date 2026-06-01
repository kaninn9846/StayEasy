import { useState, Fragment } from "react";
import { Lock, ArrowLeft, Loader2, ShieldCheck } from "lucide-react";
import { useNavigate } from "react-router-dom";
import API from "../../../services/api";
import EsewaPaymentModal from "./EsewaPaymentModal";

export default function Payment({ 
  onBack,
  bookingData 
}: { 
  onBack: () => void;
  bookingData?: {
    propertyId?: number;
    propertyTitle?: string;
    total_price?: number;
    check_in?: string;
    check_out?: string;
    moveInDate?: string;
    moveOutDate?: string;
  };
}) {
  const navigate = useNavigate();
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [paymentType, setPaymentType] = useState<'full' | 'partial'>('full');
  const [showEsewaModal, setShowEsewaModal] = useState(false);
  const [bookingIdForModal, setBookingIdForModal] = useState<number | null>(null);

  // Dynamic price calculations
  const totalAmount = bookingData?.total_price || 0;
  const checkIn = bookingData?.check_in || bookingData?.moveInDate || "";
  const checkOut = bookingData?.check_out || bookingData?.moveOutDate || "";
  let months = 1;
  if (checkIn && checkOut) {
    const inD = new Date(checkIn);
    const outD = new Date(checkOut);
    const diffDays = Math.ceil((outD.getTime() - inD.getTime()) / (1000 * 60 * 60 * 24));
    months = Math.max(1, Math.ceil(diffDays / 30));
  }
  const monthlyPrice = Math.round(totalAmount / months);
  const securityDeposit = Math.round(monthlyPrice); // 1 month deposit
  const serviceFee = Math.round(totalAmount * 0.05);
  const partialAmount = Math.round(monthlyPrice + securityDeposit); // first month + deposit
  const payingNow = paymentType === 'full' ? totalAmount : partialAmount;
  const grandTotal = totalAmount + securityDeposit + serviceFee;
  const remaining = Math.max(0, grandTotal - payingNow);

  const handleEsewaPayment = async () => {
    try {
      setError(null);
      setIsProcessing(true);

      console.log("📍 Booking Data received:", bookingData);

      // Validate booking data
      if (!bookingData?.propertyId) {
        setError("Missing property ID - this shouldn't happen");
        setIsProcessing(false);
        return;
      }

      if (!checkIn) {
        setError("Missing move-in date");
        setIsProcessing(false);
        return;
      }

      if (!checkOut) {
        setError("Missing move-out date");
        setIsProcessing(false);
        return;
      }

      console.log("📍 Booking to create:", {
        property: bookingData.propertyId,
        check_in: checkIn,
        check_out: checkOut,
        total_price: totalAmount,
        payment_type: paymentType,
      });

      // Create booking first, then initiate eSewa payment
      const bookingResponse = await API.post("bookings/create/", {
        property: bookingData.propertyId,
        check_in: checkIn,
        check_out: checkOut,
        total_price: totalAmount,
        payment_type: paymentType,
      });

      console.log("📍 Booking created:", bookingResponse.data);

      if (bookingResponse.data.id) {
        setBookingIdForModal(bookingResponse.data.id);
        setIsProcessing(false);
        setShowEsewaModal(true);
      }
    } catch (err: any) {
      console.error("❌ Booking creation error:", err);
      console.error("❌ Error response data:", err.response?.data);
      console.error("❌ Error status:", err.response?.status);
      
      let errorMsg = "Failed to create booking. Please try again.";
      if (err.response?.data) {
        if (typeof err.response.data === 'string') {
          errorMsg = err.response.data;
        } else if (err.response.data.detail) {
          errorMsg = err.response.data.detail;
        } else if (err.response.data.error) {
          errorMsg = err.response.data.error;
        } else if (typeof err.response.data === 'object') {
          // Get first error field
          const firstError = Object.entries(err.response.data)[0];
          if (firstError) {
            const [key, value] = firstError;
            if (Array.isArray(value)) {
              errorMsg = `${key}: ${value[0]}`;
            } else {
              errorMsg = `${key}: ${value}`;
            }
          }
        }
      }
      
      setError(errorMsg);
      setIsProcessing(false);
    }
  };

  return (
    <><div className="max-w-6xl mx-auto px-4 sm:px-6 py-6">
      {/* Back Button positioned above the payment details */}
      <button 
        onClick={onBack}
        className="flex items-center gap-2 text-gray-400 hover:text-gray-900 transition-colors font-bold text-sm mb-6 group"
      >
        <ArrowLeft size={20} className="group-hover:-translate-x-1 transition-transform" />
        BACK
      </button>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 lg:gap-8">
        {/* Left Column: Payment Form */}
        <div className="lg:col-span-7 space-y-6">
          <div className="bg-white p-4 sm:p-8 rounded-2xl border border-gray-200">
            <h2 className="text-xl sm:text-2xl font-bold text-gray-900 mb-6">Payment Method</h2>
            
            {/* Full Payment Option */}
            <div 
              onClick={() => setPaymentType('full')}
              className={`p-5 mb-4 border-2 rounded-2xl cursor-pointer transition-all ${
                paymentType === 'full' 
                  ? 'border-[#A989C8] bg-purple-50' 
                  : 'border-gray-200 bg-white hover:border-gray-300'
              }`}
            >
              <div className="flex items-center gap-3 mb-2">
                <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${
                  paymentType === 'full' ? 'border-[#A989C8] bg-[#A989C8]' : 'border-gray-300'
                }`}>
                  {paymentType === 'full' && <div className="w-2 h-2 bg-white rounded-full" />}
                </div>
                <div>
                  <p className="font-bold text-gray-900">Pay Full Amount</p>
                  <p className="text-sm text-gray-600">Pay entire rent of NPR {totalAmount.toLocaleString()} now</p>
                </div>
              </div>
            </div>

            {/* Partial Payment Option */}
            <div 
              onClick={() => setPaymentType('partial')}
              className={`p-5 border-2 rounded-2xl cursor-pointer transition-all ${
                paymentType === 'partial' 
                  ? 'border-[#A989C8] bg-purple-50' 
                  : 'border-gray-200 bg-white hover:border-gray-300'
              }`}
            >
              <div className="flex items-center gap-3 mb-2">
                <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${
                  paymentType === 'partial' ? 'border-[#A989C8] bg-[#A989C8]' : 'border-gray-300'
                }`}>
                  {paymentType === 'partial' && <div className="w-2 h-2 bg-white rounded-full" />}
                </div>
                <div>
                  <p className="font-bold text-gray-900">Partial Payment</p>
                  <p className="text-sm text-gray-600">Pay NPR {partialAmount.toLocaleString()} now (first month rent + deposit)</p>
                </div>
              </div>
            </div>

            {/* eSewa Payment Gateway Info — official eSewa green branding */}
            <div className="mt-8 p-5 bg-[#F0FDF4] border border-[#60B246] rounded-2xl">
              <div className="flex items-center gap-3 mb-3">
                <div className="w-10 h-10 bg-[#60B246] rounded-lg flex items-center justify-center text-white font-bold text-sm">
                  <svg viewBox="0 0 24 24" className="w-6 h-6 fill-white"><path d="M12 2L2 7v10l10 5 10-5V7l-10-5zM8.5 9.5c0-.828.672-1.5 1.5-1.5s1.5.672 1.5 1.5-.672 1.5-1.5 1.5S8.5 10.328 8.5 9.5zM12 16c-1.657 0-3-1.343-3-3s1.343-3 3-3 3 1.343 3 3-1.343 3-3 3z"/></svg>
                </div>
                <div>
                  <p className="font-bold text-gray-900">eSewa Payment</p>
                  <p className="text-xs text-gray-600">Nepal's trusted online payment gateway</p>
                </div>
              </div>
              <div className="flex items-center gap-2 text-xs text-gray-600 mt-3">
                <Lock size={14} className="text-[#60B246]" />
                Your payment information is encrypted and secure
              </div>
              <div className="mt-3 pt-3 border-t border-[#60B246]/30">
                <div className="flex items-center gap-2 text-xs">
                  <ShieldCheck size={14} className="text-yellow-600 shrink-0" />
                  <span className="text-yellow-700 font-medium">Sandbox Payment Environment</span>
                  <span className="text-gray-500">— No real money will be charged</span>
                </div>
              </div>
            </div>

            {/* Error Message */}
            {error && (
              <div className="mt-6 p-4 bg-red-50 border border-red-200 rounded-2xl">
                <p className="text-sm font-bold text-red-700">{error}</p>
              </div>
            )}

            {/* Action Buttons */}
            <div className="flex flex-col sm:flex-row gap-3 mt-8">
              <button 
                onClick={onBack}
                disabled={isProcessing}
                className="w-full sm:flex-1 py-4 border-2 border-gray-200 text-gray-600 font-bold rounded-2xl hover:border-gray-300 transition-colors disabled:opacity-50"
              >
                Back
              </button>
              <button 
                onClick={handleEsewaPayment}
                disabled={isProcessing}
                className="w-full sm:flex-1 py-4 bg-[#A989C8] hover:bg-[#9677b4] disabled:bg-gray-400 text-white font-bold rounded-2xl shadow-lg transition-all flex items-center justify-center gap-2"
              >
                {isProcessing ? (
                  <>
                    <Loader2 size={18} className="animate-spin" />
                    Processing...
                  </>
                ) : (
                  <>Pay Now - NPR {payingNow.toLocaleString()}</>
                )}
              </button>
            </div>
          </div>
        </div>

        {/* Right Column: Payment Summary */}
        <div className="lg:col-span-5">
          <div className="bg-white p-4 sm:p-8 rounded-2xl border border-gray-200 sticky top-6">
            <h3 className="text-lg font-bold text-gray-900 mb-6">Payment Summary</h3>
            
            {/* Breakdown */}
            <div className="space-y-4 mb-6 pb-6 border-b border-gray-200">
              <div className="flex justify-between items-center">
                <p className="text-gray-600">Rent ({months} {months === 1 ? 'month' : 'months'})</p>
                <p className="font-semibold text-gray-900">NPR {totalAmount.toLocaleString()}</p>
              </div>
              <div className="flex justify-between items-center">
                <p className="text-gray-600">Security Deposit (1 month)</p>
                <p className="font-semibold text-gray-900">NPR {securityDeposit.toLocaleString()}</p>
              </div>
              <div className="flex justify-between items-center">
                <p className="text-gray-600">Service Fee (5%)</p>
                <p className="font-semibold text-gray-900">NPR {serviceFee.toLocaleString()}</p>
              </div>
            </div>

            {/* Total */}
            <div className="flex justify-between items-center mb-6 pb-6 border-b border-gray-200">
              <p className="text-gray-900 font-bold text-lg">Grand Total</p>
              <p className="text-2xl font-bold text-gray-900">NPR {grandTotal.toLocaleString()}</p>
            </div>

            {/* Paying Now — app purple highlight */}
            <div className="bg-purple-50 border border-[#A989C8] rounded-2xl p-5 mb-4">
              <p className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-1">
                {paymentType === 'full' ? 'Full Payment' : 'Partial Payment'} — Paying now
              </p>
              <p className="text-3xl font-bold text-[#A989C8]">NPR {payingNow.toLocaleString()}</p>
            </div>

            {/* Remaining Amount */}
            {remaining > 0 && (
              <div className="bg-orange-50 border border-orange-200 rounded-2xl p-4">
                <p className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-1">Remaining balance</p>
                <p className="text-xl font-bold text-orange-600">NPR {remaining.toLocaleString()}</p>
                <p className="text-xs text-gray-500 mt-1">Due after move-in</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>

      {showEsewaModal && bookingIdForModal && (
        <EsewaPaymentModal
          isOpen={showEsewaModal}
          onClose={() => {
            setShowEsewaModal(false);
            setBookingIdForModal(null);
          }}
          bookingId={bookingIdForModal}
          propertyName={bookingData?.propertyTitle || 'Property'}
          paymentType={paymentType === 'full' ? 'Full Payment' : 'Partial Payment'}
          totalAmount={payingNow}
          onSuccess={(id, agreementId) => navigate(`/payment-success/${id}${agreementId ? `?agreement_id=${agreementId}` : ''}`)}
        />
      )}
    </>
  );
}
 