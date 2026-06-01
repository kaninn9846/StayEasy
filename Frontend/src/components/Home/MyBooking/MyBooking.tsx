import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Eye, CheckCircle2, MapPin, FileSignature } from "lucide-react";
import PublicNavbar from "../../Navbar/PublicNavbar"; 
import Footer from "../../Footer";
import { getUserBookings } from "../../../services/api";

export default function MyBooking() {
  const navigate = useNavigate();
  const [bookings, setBookings] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchBookings();
  }, []);

  const fetchBookings = async () => {
    try {
      const data = await getUserBookings();
      setBookings(data || []);
      setLoading(false);
    } catch (error) {
      console.error("Fetch error:", error);
      setLoading(false);
    }
  };

  const getStatusLabel = (status: string): string => {
    switch(status.toLowerCase()) {
      case 'confirmed':
        return 'Booked';
      case 'pending':
        return 'Pending';
      case 'processing':
        return 'Pending';
      default:
        return status;
    }
  };

  const getStatusColor = (status: string) => {
    switch(status.toLowerCase()) {
      case 'confirmed':
        return 'bg-[#F0FDF4] text-[#10B981]';
      case 'pending':
        return 'bg-[#FEF3C7] text-[#D97706]';
      case 'cancelled':
        return 'bg-[#FEE2E2] text-[#EF4444]';
      default:
        return 'bg-slate-100 text-slate-600';
    }
  };

  return (
    <div className="min-h-screen bg-[#F9FAFB] font-sans text-slate-900">
      <PublicNavbar />
      
      <main className="max-w-[1200px] mx-auto px-6 py-10">
        {/* --- HEADER (Matched to Wishlist) --- */}
        <header className="mb-8 text-left">
          <div className="flex items-center gap-2.5 mb-1">
            <CheckCircle2 className="text-[#A989C8]" size={24} />
            <h1 className="text-3xl font-bold text-slate-900 tracking-tight">
              My Bookings
            </h1>
          </div>
          <p className="text-slate-400 text-sm ml-1 font-medium">
            View and manage all your property bookings
          </p>
        </header>

        {loading ? (
          <div className="text-center py-12">
            <p className="text-slate-500">Loading your bookings...</p>
          </div>
        ) : bookings.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-slate-500">You haven't made any bookings yet.</p>
          </div>
        ) : (
          <>
            {/* --- BOOKINGS LIST --- */}
            <div className="flex flex-col gap-6">
            {bookings.map((booking, index) => (
              <div 
                key={index} 
                className="bg-white rounded-[24px] p-6 border border-slate-100 shadow-sm flex flex-col md:flex-row items-center gap-8 transition-all hover:shadow-md"
              >
                {/* Image Thumbnail */}
                <div className="w-full md:w-56 h-36 rounded-[18px] overflow-hidden shrink-0 border border-slate-50">
                  <img 
                    src={booking.property_info.images?.[0]?.image ? `http://127.0.0.1:8000${booking.property_info.images[0].image}` : "https://images.unsplash.com/photo-1522708323590-d24dbb6b0267"} 
                    alt={booking.property_info.title} 
                    className="w-full h-full object-cover"
                  />
                </div>

                {/* Booking Info */}
                <div className="flex-1 w-full">
                  <div className="flex justify-between items-start mb-4">
                    <div className="text-left">
                      <h3 className="text-lg font-bold text-slate-900 mb-0.5 leading-tight">
                        {booking.property_info.title}
                      </h3>
                      <div className="flex items-center gap-1 text-slate-400 text-[10px] font-medium">
                        <MapPin size={10} className="text-[#A989C8]" /> {booking.property_info.city}
                      </div>
                    </div>
                    
                    {/* Status Tag */}
                    <div className={`flex items-center gap-1.5 ${getStatusColor(booking.status)} px-3 py-1 rounded-full border`}>
                      <CheckCircle2 size={12} />
                      <span className="text-[9px] font-bold uppercase tracking-widest">
                        {getStatusLabel(booking.status)}
                      </span>
                    </div>
                  </div>

                  {/* Details Grid */}
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-5 text-left">
                    <div>
                      <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mb-1">Booking ID</p>
                      <p className="text-xs font-bold text-slate-700">{booking.id}</p>
                    </div>
                    <div>
                      <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mb-1">Check-In</p>
                      <p className="text-xs font-bold text-slate-700">{new Date(booking.check_in).toLocaleDateString()}</p>
                    </div>
                    <div>
                      <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mb-1">Check-Out</p>
                      <p className="text-xs font-bold text-slate-700">{new Date(booking.check_out).toLocaleDateString()}</p>
                    </div>
                    <div>
                      <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mb-1">Total Amount</p>
                      <p className="text-sm font-bold text-[#A989C8] tracking-tight">
                        NPR {parseFloat(booking.total_price).toLocaleString()}
                      </p>
                    </div>
                  </div>

                  {/* Footer of the booking card */}
                  <div className="flex justify-between items-center pt-4 border-t border-slate-50">
                    <div className="flex items-center gap-2">
                      {booking.agreement_info && booking.agreement_info.status === 'pending_tenant' && (
                        <button
                          onClick={() => navigate(`/agreements/${booking.agreement_info.id}`)}
                          className="flex items-center gap-1.5 px-3 py-1.5 bg-amber-100 text-amber-700 rounded-lg text-[10px] font-bold uppercase tracking-widest hover:bg-amber-200 transition-all"
                        >
                          <FileSignature size={12} />
                          Complete Agreement
                        </button>
                      )}
                      {booking.agreement_info && booking.agreement_info.status !== 'pending_tenant' && (
                        <button
                          onClick={() => navigate(`/agreements/${booking.agreement_info.id}`)}
                          className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-100 text-emerald-700 rounded-lg text-[10px] font-bold uppercase tracking-widest hover:bg-emerald-200 transition-all"
                        >
                          <FileSignature size={12} />
                          View Agreement
                        </button>
                      )}
                    </div>
                    <div className="flex items-center gap-3">
                      <div className="text-[9px] font-bold uppercase tracking-widest">
                        <p className="text-slate-400">Status: <span className={getStatusColor(booking.status).split(' ')[1]}>{getStatusLabel(booking.status).toUpperCase()}</span></p>
                      </div>
                      <button 
                        onClick={() => navigate(`/property/${booking.property_info.id}`)}
                        className="flex items-center gap-1.5 text-[#A989C8] font-bold text-[10px] uppercase tracking-widest hover:opacity-70 transition-all"
                      >
                        <Eye size={14} />
                        View Details
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            ))}
            </div>
          </>
        )}
      </main>

      <Footer />
    </div>
  );
}