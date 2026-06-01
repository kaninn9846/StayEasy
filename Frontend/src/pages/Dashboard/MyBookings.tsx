import { useState, useEffect } from "react";
import axios from "axios";
import { useNavigate } from "react-router-dom";
import { Package, Loader2, Eye, X, AlertCircle, FileSignature } from "lucide-react";

interface Booking {
  id: number;
  property_info: {
    id: number;
    title: string;
    address: string;
    city: string;
    price: number;
    images: Array<{ id: number; image: string }>;
  };
  check_in: string;
  check_out: string;
  total_price: number;
  status: "confirmed" | "pending" | "processing" | "completed" | "cancelled";
  agreement_info: { id: number; status: string } | null;
  created_at: string;
}

const MyBookings = () => {
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [cancelLoading, setCancelLoading] = useState<number | null>(null);
  const navigate = useNavigate();

  const API_BASE = "http://localhost:8000/api/users";

  // Fetch User Bookings
  const fetchBookings = async () => {
    setLoading(true);
    setError("");
    try {
      const token = localStorage.getItem("access");
      const bookingRes = await axios.get(`${API_BASE}/bookings/`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      // Filter for unique bookings (in case of duplicates)
      const uniqueBookings = Array.from(
        new Map((bookingRes.data.results || []).map((b: Booking) => [b.id, b])).values()
      ) as Booking[];
      setBookings(uniqueBookings);
    } catch (err: any) {
      setError(err.response?.data?.error || "Failed to fetch bookings");
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchBookings();
  }, []);

  // Handle booking cancellation
  const handleCancelBooking = async (bookingId: number) => {
    if (!window.confirm("Are you sure you want to cancel this booking?")) return;

    setCancelLoading(bookingId);
    try {
      const token = localStorage.getItem("access");
      await axios.post(`${API_BASE}/bookings/${bookingId}/cancel/`, 
        { reason: "User requested cancellation" },
        { headers: { Authorization: `Bearer ${token}` } }
      );

      // Remove cancelled booking from list
      setBookings(bookings.filter(b => b.id !== bookingId));
      
      // Show success message
      alert("Booking cancelled successfully!");
    } catch (err: any) {
      alert(err.response?.data?.error || "Failed to cancel booking");
    } finally {
      setCancelLoading(null);
    }
  };

  const getStatusBadgeColor = (status: string) => {
    switch (status) {
      case "confirmed":
        return "bg-green-100 text-green-800";
      case "pending":
        return "bg-yellow-100 text-yellow-800";
      case "processing":
        return "bg-blue-100 text-blue-800";
      case "completed":
        return "bg-purple-100 text-purple-800";
      case "cancelled":
        return "bg-red-100 text-red-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "confirmed":
        return "✓";
      case "pending":
        return "⏳";
      case "processing":
        return "⚙️";
      case "completed":
        return "✓✓";
      case "cancelled":
        return "✗";
      default:
        return "•";
    }
  };

  // Separate active and cancelled bookings
  const activeBookings = bookings.filter(b => b.status !== "cancelled");

  return (
    <div className="min-h-screen bg-gray-50 py-12">
      <div className="max-w-6xl mx-auto px-4">
        {/* Title */}
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-2">
            <Package className="text-[#A989C8]" size={32} />
            <h1 className="text-4xl font-bold text-gray-900">My Bookings</h1>
          </div>
          <p className="text-gray-600">View and manage your property bookings</p>
        </div>

        {/* Error Message */}
        {error && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg text-red-700 flex items-start gap-3">
            <AlertCircle size={20} className="flex-shrink-0 mt-0.5" />
            {error}
          </div>
        )}

        {/* Loading State */}
        {loading && (
          <div className="text-center py-16">
            <Loader2 className="inline-block animate-spin h-12 w-12 text-[#A989C8] mb-4" />
            <p className="text-gray-600">Loading your bookings...</p>
          </div>
        )}

        {/* Active Bookings Section */}
        {!loading && activeBookings.length > 0 && (
          <div className="mb-12">
            <h2 className="text-2xl font-bold text-gray-900 mb-6">Active Bookings</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {activeBookings.map((booking) => {
                const agreement = booking.agreement_info;
                return (
                <div
                  key={booking.id}
                  className="bg-white rounded-2xl border border-gray-200 overflow-hidden hover:shadow-xl transition-shadow"
                >
                  {/* Image */}
                  <div className="relative h-48 bg-gray-200 overflow-hidden">
                    {booking.property_info.images[0] ? (
                      <img
                        src={`http://localhost:8000${booking.property_info.images[0].image}`}
                        alt={booking.property_info.title}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center bg-gray-300">
                        <span className="text-gray-600">No image available</span>
                      </div>
                    )}
                    {/* Status Badge */}
                    <div className="absolute top-3 right-3">
                      <span
                        className={`px-3 py-1 rounded-full text-xs font-semibold flex items-center gap-1 ${getStatusBadgeColor(
                          booking.status
                        )}`}
                      >
                        {getStatusIcon(booking.status)} {booking.status.charAt(0).toUpperCase() + booking.status.slice(1)}
                      </span>
                    </div>
                  </div>

                  {/* Content */}
                  <div className="p-5">
                    <h3 className="font-bold text-lg text-gray-900 mb-1 line-clamp-2">
                      {booking.property_info.title}
                    </h3>
                    <p className="text-gray-600 text-sm mb-4">
                      📍 {booking.property_info.address}, {booking.property_info.city}
                    </p>

                    {/* Dates */}
                    <div className="grid grid-cols-2 gap-3 mb-4 pb-4 border-b border-gray-200">
                      <div>
                        <p className="text-gray-500 text-xs font-medium uppercase">Check-in</p>
                        <p className="font-semibold text-gray-900">
                          {new Date(booking.check_in).toLocaleDateString('en-US', {
                            month: 'short',
                            day: 'numeric'
                          })}
                        </p>
                      </div>
                      <div>
                        <p className="text-gray-500 text-xs font-medium uppercase">Check-out</p>
                        <p className="font-semibold text-gray-900">
                          {new Date(booking.check_out).toLocaleDateString('en-US', {
                            month: 'short',
                            day: 'numeric'
                          })}
                        </p>
                      </div>
                    </div>

                    {/* Price */}
                    <div className="mb-4">
                      <p className="text-gray-500 text-xs font-medium uppercase">Total Paid</p>
                      <p className="text-2xl font-bold text-[#A989C8]">
                        NPR {booking.total_price.toLocaleString()}
                      </p>
                    </div>

                    {/* Action Buttons */}
                    <div className="grid grid-cols-2 gap-3">
                      {agreement ? (
                        <button
                          onClick={() => navigate(`/agreements/${agreement.id}`)}
                          className={`flex items-center justify-center gap-2 px-4 py-2 rounded-lg transition font-medium text-sm ${
                            agreement.status === 'pending_tenant'
                              ? 'bg-amber-100 text-amber-700 hover:bg-amber-200'
                              : 'bg-emerald-100 text-emerald-700 hover:bg-emerald-200'
                          }`}
                        >
                          <FileSignature size={16} />
                          {agreement.status === 'pending_tenant' ? 'Complete Agreement' : 'View Agreement'}
                        </button>
                      ) : (
                        <button
                          onClick={() => navigate(`/property/${booking.property_info.id}`)}
                          className="flex items-center justify-center gap-2 px-4 py-2 bg-blue-100 text-blue-600 rounded-lg hover:bg-blue-200 transition font-medium text-sm"
                        >
                          <Eye size={16} />
                          View
                        </button>
                      )}
                      <button
                        onClick={() => handleCancelBooking(booking.id)}
                        disabled={cancelLoading === booking.id}
                        className="flex items-center justify-center gap-2 px-4 py-2 bg-red-100 text-red-600 rounded-lg hover:bg-red-200 transition font-medium text-sm disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        {cancelLoading === booking.id ? (
                          <Loader2 size={16} className="animate-spin" />
                        ) : (
                          <X size={16} />
                        )}
                        Cancel
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
            </div>
          </div>
        )}

        {/* Cancelled Bookings Section - Hidden */}
        {/* Cancelled bookings are automatically removed from active list and not shown */}
        {/* Users can view cancelled bookings in their history if needed */}

        {/* Empty State */}
        {!loading && bookings.length === 0 && (
          <div className="text-center py-16 bg-white rounded-2xl border border-gray-200">
            <Package className="inline-block text-gray-400 mb-4" size={48} />
            <h3 className="text-xl font-bold text-gray-900 mb-2">No bookings yet</h3>
            <p className="text-gray-600 mb-6">You haven't made any bookings yet. Start exploring properties!</p>
            <button
              onClick={() => navigate("/properties")}
              className="inline-block px-6 py-2 bg-[#A989C8] text-white rounded-lg hover:bg-[#8d6aa9] transition font-medium"
            >
              Browse Properties
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default MyBookings;
