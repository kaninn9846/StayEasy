import React, { useEffect, useRef, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { CheckCircle2, Loader2, ArrowRight } from 'lucide-react';
import PublicNavbar from '../../components/Navbar/PublicNavbar';
import Footer from '../../components/Footer';
import API, { getAgreementByBooking, createAgreementForBooking } from '../../services/api';

const PaymentSuccess: React.FC = () => {
  const { bookingId } = useParams<{ bookingId: string }>();
  const navigate = useNavigate();
  const [verifying, setVerifying] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [bookingData, setBookingData] = useState<any>(null);
  const [agreementId, setAgreementId] = useState<number | null>(null);
  const [transactionId, setTransactionId] = useState('');
  const [refId, setRefId] = useState('');
  const agreementIdRef = useRef<number | null>(null);
  const navigatingRef = useRef(false);

  useEffect(() => {
    const searchParams = new URLSearchParams(window.location.search);
    const hasUrlParams = searchParams.get('oid') || searchParams.get('refId');
    const urlAgreementId = searchParams.get('agreement_id');

    if (urlAgreementId) {
      storeAgreementId(Number(urlAgreementId));
      fetchBookingAndAgreement();
    } else if (hasUrlParams) {
      verifyPayment();
    } else {
      fetchBookingAndAgreement();
    }
  }, [bookingId]);

  const storeAgreementId = (id: number) => {
    setAgreementId(id);
    agreementIdRef.current = id;
    sessionStorage.setItem(`agreement_for_booking_${bookingId}`, String(id));
  };

  const lookupAgreementId = async (): Promise<number | null> => {
    if (!bookingId) return null;
    try {
      const agreement = await getAgreementByBooking(Number(bookingId));
      if (agreement?.id) {
        storeAgreementId(agreement.id);
        return agreement.id;
      }
    } catch (e: any) {
      console.warn('[lookupAgreementId] by-booking failed:', e?.response?.data || e);
    }
    try {
      const bookingRes = await API.get(`bookings/${bookingId}/`);
      if (bookingRes.data?.agreement_info?.id) {
        storeAgreementId(bookingRes.data.agreement_info.id);
        return bookingRes.data.agreement_info.id;
      }
    } catch (e: any) {
      console.warn('[lookupAgreementId] booking detail failed:', e?.response?.data || e);
    }
    try {
      const result = await createAgreementForBooking(Number(bookingId));
      const id = result?.agreement?.id;
      if (id) {
        storeAgreementId(id);
        return id;
      }
    } catch (e: any) {
      console.warn('[lookupAgreementId] create-for-booking failed:', e?.response?.data || e);
    }
    return null;
  };

  const fetchBookingAndAgreement = async () => {
    try {
      const response = await API.get(`bookings/${bookingId}/`);
      setBookingData(response.data);
      setTransactionId(response.data.esewa_ref_id || '');
      setRefId(response.data.esewa_ref_id || '');
      if (response.data.agreement_info) {
        storeAgreementId(response.data.agreement_info.id);
      }
      setVerifying(false);
    } catch (error: any) {
      console.error('Error fetching booking details:', error);
      setError(error.response?.data?.error || error.message || 'Failed to load booking details');
      setVerifying(false);
    }
  };

  const verifyPayment = async () => {
    try {
      const searchParams = new URLSearchParams(window.location.search);
      const esewaResponse = {
        oid: searchParams.get('oid') || searchParams.get('transaction_id'),
        refId: searchParams.get('refId') || searchParams.get('ref_id'),
        amount: searchParams.get('amount') || searchParams.get('amt'),
        scd: searchParams.get('scd'),
        signature: searchParams.get('signature'),
      };

      if (!esewaResponse.oid || !esewaResponse.refId || !esewaResponse.signature) {
        throw new Error('Missing payment response parameters from eSewa');
      }

      setTransactionId(esewaResponse.oid);
      setRefId(esewaResponse.refId);

      const response = await API.post('payment/esewa/verify/', esewaResponse);

      if (response.data.success) {
        if (response.data.agreement_id) {
          storeAgreementId(response.data.agreement_id);
        }
        const bookingResponse = await API.get(`bookings/${bookingId}/`);
        setBookingData(bookingResponse.data);
        if (!response.data.agreement_id && bookingResponse.data.agreement_info) {
          storeAgreementId(bookingResponse.data.agreement_info.id);
        }
        setVerifying(false);
      } else {
        throw new Error(response.data.error || 'Payment verification failed');
      }
    } catch (error: any) {
      console.error('Payment verification error:', error);
      navigate(`/payment-failed/${bookingId}`);
    }
  };

  const handleNext = async () => {
    if (navigatingRef.current) return;
    navigatingRef.current = true;

    let id = agreementIdRef.current || agreementId
      || Number(sessionStorage.getItem(`agreement_for_booking_${bookingId}`))
      || Number(sessionStorage.getItem('pending_agreement_id'))
      || null;

    if (!id) {
      id = await lookupAgreementId();
    }

    if (id) {
      navigate(`/agreements/${id}`);
    } else {
      navigate('/my-bookings');
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 flex flex-col font-sans">
      <PublicNavbar />
      <main className="flex-grow max-w-3xl mx-auto w-full px-6 py-12 flex items-center justify-center">
        {verifying ? (
          <div className="bg-white rounded-3xl p-12 border border-gray-200 shadow-lg text-center">
            <Loader2 className="w-20 h-20 text-[#A989C8] animate-spin mx-auto mb-6" />
            <h2 className="text-3xl font-bold text-gray-800 mb-2">Processing Payment</h2>
            <p className="text-gray-600">Verifying your payment with eSewa...</p>
          </div>
        ) : error ? (
          <div className="bg-white rounded-3xl p-12 border border-red-200 shadow-lg max-w-md w-full text-center">
            <div className="bg-red-100 rounded-full p-4 mx-auto mb-4 w-fit">
              <svg className="w-12 h-12 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </div>
            <h2 className="text-2xl font-bold text-red-600 mb-2">Payment Failed</h2>
            <p className="text-gray-600 mb-6">{error}</p>
            <div className="space-y-3">
              <button onClick={() => navigate(-1)} className="w-full px-6 py-3 bg-[#A989C8] text-white rounded-xl font-bold hover:bg-[#9677b4] transition-colors">Try Again</button>
              <button onClick={() => navigate('/home')} className="w-full px-6 py-3 border border-gray-300 text-gray-700 rounded-xl font-bold hover:bg-gray-50 transition-colors">Back to Home</button>
            </div>
          </div>
        ) : (
          <div className="w-full">
            <div className="bg-white rounded-3xl p-8 border border-green-200 shadow-lg">
              <div className="flex items-start gap-6 mb-8">
                <div className="flex-shrink-0">
                  <div className="flex items-center justify-center h-20 w-20 rounded-full bg-green-100">
                    <CheckCircle2 className="h-12 w-12 text-green-600" />
                  </div>
                </div>
                <div className="flex-grow">
                  <h2 className="text-3xl font-bold text-gray-900">Payment Successful!</h2>
                  <p className="text-gray-600 mt-1">Your payment has been completed successfully</p>
                </div>
              </div>

              <div className="bg-gradient-to-r from-green-50 to-emerald-50 rounded-2xl p-6 mb-8 border border-green-100">
                <h3 className="font-bold text-gray-900 mb-4">Transaction Details</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <p className="text-sm text-gray-600 mb-1">Transaction ID</p>
                    <p className="font-mono text-lg font-bold text-gray-900 break-all">{transactionId}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600 mb-1">Reference ID</p>
                    <p className="font-mono text-lg font-bold text-gray-900 break-all">{refId}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600 mb-1">Amount Paid</p>
                    <p className="font-bold text-lg text-gray-900">
                      Rs. {bookingData?.total_price?.toLocaleString() || '---'}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600 mb-1">Payment Method</p>
                    <p className="font-bold text-lg text-gray-900">eSewa</p>
                  </div>
                </div>
              </div>

              {bookingData && (
                <div className="border-t border-gray-200 pt-6">
                  <h3 className="font-bold text-gray-900 mb-4">Booking Details</h3>
                  <div className="space-y-3">
                    <div className="flex justify-between items-center py-2">
                      <span className="text-gray-600">Booking ID</span>
                      <span className="font-bold text-gray-900">#{bookingData.id}</span>
                    </div>
                    <div className="flex justify-between items-center py-2">
                      <span className="text-gray-600">Status</span>
                      <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-bold bg-yellow-100 text-yellow-800">
                        PAYMENT COMPLETED
                      </span>
                    </div>
                    <div className="flex justify-between items-center py-2">
                      <span className="text-gray-600">Check-in</span>
                      <span className="font-bold text-gray-900">
                        {bookingData.check_in ? new Date(bookingData.check_in).toLocaleDateString() : '---'}
                      </span>
                    </div>
                    <div className="flex justify-between items-center py-2">
                      <span className="text-gray-600">Check-out</span>
                      <span className="font-bold text-gray-900">
                        {bookingData.check_out ? new Date(bookingData.check_out).toLocaleDateString() : '---'}
                      </span>
                    </div>
                  </div>
                </div>
              )}
            </div>

            <div className="mt-6 flex justify-end">
              <button
                onClick={handleNext}
                className="flex items-center gap-2 px-8 py-3 bg-[#A989C8] text-white rounded-xl font-bold hover:bg-[#9677b4] transition-colors shadow-md"
              >
                Next
                <ArrowRight size={20} />
              </button>
            </div>
          </div>
        )}
      </main>
      <Footer />
    </div>
  );
};

export default PaymentSuccess;
