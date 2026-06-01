import { CheckCircle, Download, FileSignature, AlertCircle } from "lucide-react";
import { useEffect, useState } from "react";
import { createBooking } from "../../../services/api";

export default function Success({ bookingData, onSignAgreement }: { bookingData: any; onSignAgreement: () => void }) {
  const [booking, setBooking] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    createBookingFromData();
  }, []);

  const createBookingFromData = async () => {
    try {
      console.log("📍 Step 1: Checking bookingData:", bookingData);
      
      if (!bookingData || !bookingData.propertyId) {
        setError("Missing property ID - booking data not received properly");
        setLoading(false);
        return;
      }
      
      if (!bookingData.moveInDate && !bookingData.check_in) {
        setError("Missing move-in date");
        setLoading(false);
        return;
      }

      const checkInStr = bookingData.check_in || bookingData.moveInDate;
      const checkOutStr = bookingData.check_out || bookingData.moveOutDate;

      if (!checkOutStr) {
        setError("Missing move-out date");
        setLoading(false);
        return;
      }

      // Calculate total price from monthly rate
      const propertyPrice = bookingData.total_price || 25000;

      console.log("📍 Step 2: Prepared booking data:", {
        propertyId: parseInt(bookingData.propertyId),
        checkIn: checkInStr,
        checkOut: checkOutStr,
        totalPrice: propertyPrice
      });

      const response = await createBooking(
        parseInt(bookingData.propertyId),
        checkInStr,
        checkOutStr,
        propertyPrice
      );
      
      console.log("📍 Step 3: Booking created successfully:", response);
      setBooking(response);
      setError(null);
    } catch (error: any) {
      console.error("❌ Booking creation error:", error);
      
      // Get detailed error message
      let errorMsg = "Failed to create booking";
      
      if (error.response?.data) {
        console.error("📍 Server response:", error.response.data);
        
        // Check if it's a validation error with field details
        if (typeof error.response.data === 'object') {
          // Get the first error message
          for (const [key, value] of Object.entries(error.response.data)) {
            if (Array.isArray(value)) {
              errorMsg = `${key}: ${value[0]}`;
            } else if (typeof value === 'string') {
              errorMsg = `${key}: ${value}`;
            }
            break;
          }
        } else {
          errorMsg = error.response.data.detail || error.response.data;
        }
      } else if (error.message) {
        errorMsg = error.message;
      }
      
      console.error("❌ Final error message:", errorMsg);
      setError(errorMsg);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="max-w-4xl mx-auto bg-white rounded-[40px] px-4 sm:px-6 py-8 sm:py-12 shadow-sm border border-gray-50 text-center">
        <p className="text-gray-600">Creating your booking...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="max-w-4xl mx-auto bg-white rounded-[40px] px-4 sm:px-6 py-8 sm:py-12 shadow-sm border border-red-100">
        <div className="flex items-center justify-center mb-4">
          <AlertCircle className="text-red-500" size={40} />
        </div>
        <h2 className="text-xl sm:text-2xl font-bold text-red-600 text-center mb-4">Error Creating Booking</h2>
        <p className="text-red-600 text-center mb-6">{error}</p>
        <button 
          onClick={() => window.location.reload()}
          className="w-full py-3 bg-red-500 text-white font-bold rounded-2xl hover:bg-red-600"
        >
          Try Again
        </button>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="max-w-4xl mx-auto bg-white rounded-[40px] px-4 sm:px-6 py-8 sm:py-12 shadow-sm border border-gray-50 text-center">
        <p>Creating your booking...</p>
      </div>
    );
  }

  if (!booking) {
    return (
      <div className="max-w-4xl mx-auto bg-white rounded-[40px] px-4 sm:px-6 py-8 sm:py-12 shadow-sm border border-gray-50 text-center">
        <p>Unable to create booking. Please try again.</p>
      </div>
    );
  }
  return (
    <div className="max-w-4xl mx-auto bg-white rounded-[40px] px-4 sm:px-6 py-8 sm:py-12 shadow-sm border border-gray-50 text-center">
      <div className="flex justify-center mb-6">
        <div className="w-20 h-20 bg-emerald-500 rounded-full flex items-center justify-center text-white shadow-lg shadow-emerald-100">
          <CheckCircle size={40} />
        </div>
      </div>
      <h1 className="text-2xl sm:text-3xl font-black text-gray-900 mb-4">Booking Confirmed!</h1>
      <p className="text-gray-500 mb-10 max-w-md mx-auto font-medium">Your booking has been successfully confirmed. We've sent the details to your email.</p>

      <div className="bg-gray-50 rounded-[32px] p-4 sm:p-8 mb-10 text-left space-y-4">
        <h3 className="font-bold text-gray-800 border-b border-gray-200 pb-4 mb-4">Booking Details</h3>
        <div className="flex justify-between text-sm"><span className="text-gray-400 font-medium">Booking ID</span><span className="font-bold text-gray-800">{booking.id}</span></div>
        <div className="flex justify-between text-sm"><span className="text-gray-400 font-medium">Name</span><span className="font-bold text-gray-800">{bookingData.fullName}</span></div>
        <div className="flex justify-between text-sm"><span className="text-gray-400 font-medium">Move In Date</span><span className="font-bold text-gray-800">{new Date(booking.check_in).toLocaleDateString()}</span></div>
        <div className="flex justify-between text-sm"><span className="text-gray-400 font-medium">Move Out Date</span><span className="font-bold text-gray-800">{new Date(booking.check_out).toLocaleDateString()}</span></div>
        <div className="flex justify-between text-sm pt-4 border-t border-gray-200"><span className="text-gray-400 font-medium">Total Paid</span><span className="font-bold text-[#A989C8] text-lg">NPR {parseInt(booking.total_price).toLocaleString()}</span></div>
      </div>

      <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 justify-center">
        <button onClick={onSignAgreement} className="w-full sm:w-auto px-6 sm:px-10 py-4 bg-[#A989C8] text-white font-bold rounded-2xl flex items-center gap-2 justify-center transition hover:bg-[#9370DB] shadow-lg shadow-purple-100"><FileSignature size={18} /> Sign Agreement</button>
        <button className="w-full sm:w-auto px-6 sm:px-10 py-4 border border-gray-200 text-gray-600 font-bold rounded-2xl hover:bg-gray-50 transition flex items-center gap-2 justify-center"><Download size={18} /> Download Invoice</button>
      </div>
    </div>
  );
}