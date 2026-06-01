import React, { useState } from 'react';
import { X, Loader2, ShieldCheck, Lock, Eye, EyeOff, AlertCircle } from 'lucide-react';
import API from '../../../services/api';

interface EsewaPaymentModalProps {
  isOpen: boolean;
  onClose: () => void;
  bookingId: number;
  propertyName: string;
  paymentType: string;
  totalAmount: number;
  onSuccess: (bookingId: number, agreementId?: number) => void;
}

const SANDBOX_ESEWA_ID = '9806800002';
const SANDBOX_PASSWORD = 'Nepal@123';
const SANDBOX_MPIN = '1122';

const EsewaPaymentModal: React.FC<EsewaPaymentModalProps> = ({
  isOpen, onClose, bookingId, propertyName, paymentType, totalAmount, onSuccess
}) => {
  const [esewaId, setEsewaId] = useState('');
  const [password, setPassword] = useState('');
  const [mpin, setMpin] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showMpin, setShowMpin] = useState(false);
  const [step, setStep] = useState<'form' | 'processing'>('form');
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (esewaId !== SANDBOX_ESEWA_ID || password !== SANDBOX_PASSWORD || mpin !== SANDBOX_MPIN) {
      setError('Invalid eSewa test credentials');
      return;
    }

    setStep('processing');

    try {
      const initRes = await API.post('payment/esewa/initiate/', { booking_id: bookingId });
      const pd = initRes.data.payment_data;

      const verifyRes = await API.post('payment/esewa/verify/', {
        oid: pd.pid || String(bookingId),
        refId: pd.refId,
        amount: pd.amt,
        scd: pd.scd,
        signature: pd.signature,
      });

      if (verifyRes.data.success) {
        onSuccess(bookingId, verifyRes.data.agreement_id);
      } else {
        throw new Error(verifyRes.data.error || 'Payment verification failed');
      }
    } catch (err: any) {
      setError(err.response?.data?.error || err.message || 'Payment processing failed');
      setStep('form');
    }
  };

  if (!isOpen) return null;

  return (
    <>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />

        <div className="relative bg-white rounded-3xl shadow-2xl w-full max-w-md overflow-hidden animate-in fade-in zoom-in-95 duration-300">
          {step === 'processing' ? (
            <div className="p-10 text-center">
              <div className="flex justify-center mb-6">
                <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center">
                  <Loader2 className="w-10 h-10 text-[#60B246] animate-spin" />
                </div>
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-2">Processing Payment</h3>
              <p className="text-gray-500 mb-2">Verifying your eSewa credentials...</p>
              <p className="text-sm text-gray-400">Please wait, do not close this window.</p>

              <div className="mt-6 p-3 bg-yellow-50 border border-yellow-200 rounded-xl">
                <div className="flex items-center gap-2">
                  <ShieldCheck size={16} className="text-yellow-600 shrink-0" />
                  <p className="text-xs text-yellow-700 font-medium">
                    Sandbox Environment — No real money will be charged
                  </p>
                </div>
              </div>
            </div>
          ) : (
            <>
              <button
                onClick={onClose}
                className="absolute top-4 right-4 z-10 p-1.5 rounded-lg text-gray-400 hover:text-gray-700 hover:bg-gray-100 transition-colors"
              >
                <X size={20} />
              </button>

              <div className="bg-gradient-to-r from-[#60B246] to-[#4a8e35] px-8 pt-10 pb-8 text-white text-center">
                <div className="flex justify-center mb-3">
                  <div className="bg-white/20 backdrop-blur rounded-2xl px-5 py-3 inline-flex items-center gap-3">
                    <svg viewBox="0 0 40 40" className="w-8 h-8 fill-white"><path d="M20 2L4 10v20l16 8 16-8V10L20 2zm0 4l12 6v12l-12 6-12-6V12l12-6z"/></svg>
                    <span className="text-2xl font-bold tracking-tight">eSewa</span>
                  </div>
                </div>
                <p className="text-green-100 text-sm font-medium">Sandbox / Test Mode</p>
              </div>

              <form onSubmit={handleSubmit} className="p-6 space-y-5">
                <div className="bg-gray-50 border border-gray-200 rounded-2xl p-4 space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-500">Property</span>
                    <span className="font-semibold text-gray-900 text-right max-w-[60%] truncate">{propertyName}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-500">Payment</span>
                    <span className="font-semibold text-gray-900">{paymentType}</span>
                  </div>
                  <div className="flex justify-between text-sm pt-2 border-t border-gray-200">
                    <span className="text-gray-500">Amount</span>
                    <span className="font-bold text-lg text-[#60B246]">NPR {totalAmount.toLocaleString()}</span>
                  </div>
                </div>

                <div className="border-t border-gray-200 pt-4">
                  <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-4">Enter Test Credentials</p>

                  <div className="space-y-3.5">
                    <div>
                      <label className="block text-xs font-semibold text-gray-600 mb-1">eSewa ID / Mobile Number</label>
                      <input
                        type="text"
                        value={esewaId}
                        onChange={(e) => setEsewaId(e.target.value)}
                        placeholder="9806800002"
                        className="w-full px-4 py-3 border border-gray-300 rounded-xl text-sm focus:ring-2 focus:ring-[#60B246] focus:border-[#60B246] outline-none transition-all placeholder:text-gray-300"
                        required
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-gray-600 mb-1">Password</label>
                      <div className="relative">
                        <input
                          type={showPassword ? 'text' : 'password'}
                          value={password}
                          onChange={(e) => setPassword(e.target.value)}
                          placeholder="Enter password"
                          className="w-full px-4 py-3 pr-10 border border-gray-300 rounded-xl text-sm focus:ring-2 focus:ring-[#60B246] focus:border-[#60B246] outline-none transition-all placeholder:text-gray-300"
                          required
                        />
                        <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                          {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                        </button>
                      </div>
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-gray-600 mb-1">MPIN</label>
                      <div className="relative">
                        <input
                          type={showMpin ? 'text' : 'password'}
                          value={mpin}
                          onChange={(e) => setMpin(e.target.value)}
                          placeholder="Enter MPIN (4 digits)"
                          maxLength={4}
                          className="w-full px-4 py-3 pr-10 border border-gray-300 rounded-xl text-sm focus:ring-2 focus:ring-[#60B246] focus:border-[#60B246] outline-none transition-all placeholder:text-gray-300"
                          required
                        />
                        <button type="button" onClick={() => setShowMpin(!showMpin)} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                          {showMpin ? <EyeOff size={16} /> : <Eye size={16} />}
                        </button>
                      </div>
                    </div>
                  </div>
                </div>

                {error && (
                  <div className="flex items-start gap-2 p-3 bg-red-50 border border-red-200 rounded-xl">
                    <AlertCircle size={16} className="text-red-500 shrink-0 mt-0.5" />
                    <p className="text-sm font-medium text-red-700">{error}</p>
                  </div>
                )}

                <div className="flex gap-3 pt-2">
                  <button
                    type="button"
                    onClick={onClose}
                    className="flex-1 py-3.5 border-2 border-gray-200 text-gray-600 font-bold rounded-xl hover:border-gray-300 hover:bg-gray-50 transition-all text-sm"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="flex-1 py-3.5 bg-[#60B246] hover:bg-[#4e8e38] text-white font-bold rounded-xl shadow-lg hover:shadow-xl transition-all text-sm"
                  >
                    Pay - NPR {totalAmount.toLocaleString()}
                  </button>
                </div>

                <div className="flex items-center justify-center gap-2 text-xs text-gray-400 pt-1">
                  <Lock size={12} />
                  <span>Secured with 256-bit SSL encryption</span>
                </div>
              </form>
            </>
          )}
        </div>
      </div>
    </>
  );
};

export default EsewaPaymentModal;
