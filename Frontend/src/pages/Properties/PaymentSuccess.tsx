import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { CheckCircle2, Loader2, ShieldCheck } from 'lucide-react';
import PublicNavbar from '../../components/Navbar/PublicNavbar';
import Footer from '../../components/Footer';
import API from '../../services/api';

const PaymentSuccess: React.FC = () => {
  const { bookingId } = useParams<{ bookingId: string }>();
  const navigate = useNavigate();
  const [verifying, setVerifying] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [bookingData, setBookingData] = useState<any>(null);
  const [transactionId, setTransactionId] = useState('');
  const [refId, setRefId] = useState('');

  useEffect(() => {
    const searchParams = new URLSearchParams(window.location.search);
    const hasUrlParams = searchParams.get('oid') || searchParams.get('refId');

    if (hasUrlParams) {
      verifyPayment();
    } else {
      fetchBookingDetails();
    }
  }, [bookingId]);

  const fetchBookingDetails = async () => {
    try {
      const response = await API.get(`bookings/${bookingId}/`);
      setBookingData(response.data);
      setTransactionId(response.data.esewa_ref_id || '');
      setRefId(response.data.esewa_ref_id || '');
      setVerifying(false);
    } catch (error: any) {
      console.error('Error fetching booking details:', error);
      setError(error.response?.data?.error || error.message || 'Failed to load booking details');
      setVerifying(false);
    }
  };

  const verifyPayment = async () => {
    try {
      // Get eSewa response from URL query params
      // eSewa sandbox redirects with: oid, refId, amount, scd, signature
      const searchParams = new URLSearchParams(window.location.search);
      
      const esewaResponse = {
        oid: searchParams.get('oid') || searchParams.get('transaction_id'),
        refId: searchParams.get('refId') || searchParams.get('ref_id'),
        amount: searchParams.get('amount') || searchParams.get('amt'),
        scd: searchParams.get('scd'),
        signature: searchParams.get('signature'),
      };

      // Validate required fields
      if (!esewaResponse.oid || !esewaResponse.refId || !esewaResponse.signature) {
        throw new Error('Missing payment response parameters from eSewa');
      }

      // Save for display
      setTransactionId(esewaResponse.oid);
      setRefId(esewaResponse.refId);

      // Verify payment with backend
      const response = await API.post('payment/esewa/verify/', esewaResponse);

      if (response.data.success) {
        // Get booking details
        const bookingResponse = await API.get(`bookings/${bookingId}/`);
        setBookingData(bookingResponse.data);
        setVerifying(false);
      } else {
        throw new Error(response.data.error || 'Payment verification failed');
      }
    } catch (error: any) {
      console.error('Payment verification error:', error);
      navigate(`/payment-failed/${bookingId}`);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 flex flex-col font-sans">
      <PublicNavbar />

      <main className="flex-grow max-w-3xl mx-auto w-full px-6 py-12">
        {verifying ? (
          // Loading state
          <div className="flex items-center justify-center min-h-[500px]">
            <div className="bg-white rounded-3xl p-12 border border-gray-200 shadow-lg text-center">
              <Loader2 className="w-20 h-20 text-[#A989C8] animate-spin mx-auto mb-6" />
              <h2 className="text-3xl font-bold text-gray-800 mb-2">Processing Payment</h2>
              <p className="text-gray-600">Verifying your payment with eSewa...</p>
            </div>
          </div>
        ) : error ? (
          // Error state
          <div className="flex items-center justify-center min-h-[500px]">
            <div className="bg-white rounded-3xl p-12 border border-red-200 shadow-lg max-w-md w-full">
              <div className="flex justify-center mb-4">
                <div className="bg-red-100 rounded-full p-4">
                  <svg className="w-12 h-12 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </div>
              </div>
              <h2 className="text-2xl font-bold text-red-600 mb-2 text-center">Payment Failed</h2>
              <p className="text-gray-600 text-center mb-6">{error}</p>
              <div className="space-y-3">
                <button
                  onClick={() => navigate(-1)}
                  className="w-full px-6 py-3 bg-[#A989C8] text-white rounded-xl font-bold hover:bg-[#9677b4] transition-colors"
                >
                  Try Again
                </button>
                <button
                  onClick={() => navigate('/properties')}
                  className="w-full px-6 py-3 border border-gray-300 text-gray-700 rounded-xl font-bold hover:bg-gray-50 transition-colors"
                >
                  Back to Properties
                </button>
              </div>
            </div>
          </div>
        ) : (
          // Success state
          <div className="space-y-6">
            {/* Success Card */}
            <div className="bg-white rounded-3xl p-8 border border-green-200 shadow-lg">
              <div className="flex items-start gap-6 mb-8">
                <div className="flex-shrink-0">
                  <div className="flex items-center justify-center h-20 w-20 rounded-full bg-green-100">
                    <CheckCircle2 className="h-12 w-12 text-green-600" />
                  </div>
                </div>
                <div className="flex-grow">
                  <h2 className="text-3xl font-bold text-gray-900">Payment Successful!</h2>
                  <p className="text-gray-600 mt-1">Your booking has been confirmed</p>
                </div>
              </div>

              {/* Transaction Details */}
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

              {/* Booking Details */}
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
                      <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-bold ${
                        bookingData.status === 'confirmed' ? 'bg-green-100 text-green-800' : 'bg-blue-100 text-blue-800'
                      }`}>
                        {bookingData.status === 'confirmed' ? 'BOOKED' : (bookingData.status?.toUpperCase() || 'PROCESSING')}
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

            {/* Next Steps */}
            <div className="bg-gradient-to-r from-[#A989C8]/10 to-purple-50 rounded-3xl p-8 border border-[#A989C8]/20">
              <h3 className="font-bold text-gray-900 mb-4 text-lg">What's Next?</h3>
              <ul className="space-y-3">
                <li className="flex items-start gap-3">
                  <span className="text-[#A989C8] font-bold">1</span>
                  <span className="text-gray-700">Your booking is confirmed and payment has been processed</span>
                </li>
                <li className="flex items-start gap-3">
                  <span className="text-[#A989C8] font-bold">2</span>
                  <span className="text-gray-700">You'll receive a confirmation email shortly</span>
                </li>
                <li className="flex items-start gap-3">
                  <span className="text-[#A989C8] font-bold">3</span>
                  <span className="text-gray-700">View your booking in "My Bookings" to see all details</span>
                </li>
              </ul>
            </div>

            {/* Action Buttons */}
            <div className="flex gap-4 justify-center pt-4">
              <button
                onClick={() => navigate('/my-bookings')}
                className="px-8 py-3 bg-[#A989C8] text-white rounded-xl font-bold hover:bg-[#9677b4] transition-colors shadow-md"
              >
                View My Bookings
              </button>
              <button
                onClick={() => navigate('/properties')}
                className="px-8 py-3 border border-gray-300 text-gray-700 rounded-xl font-bold hover:bg-gray-50 transition-colors"
              >
                Browse More Properties
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
