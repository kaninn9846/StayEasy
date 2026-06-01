import { useState, useEffect } from "react";
import { Header } from "../../components/admin/Header";
import { Package, Loader2, Search, Calendar, Users, Home, CheckCircle2, Clock, XCircle, ArrowRight } from "lucide-react";
import API from "../../services/api";

interface Booking {
  id: number;
  user_info: {
    id: number;
    username: string;
    email: string;
    first_name: string;
    last_name: string;
  };
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
  status: "pending" | "processing" | "confirmed" | "completed" | "cancelled";
  payment_status: string;
  payment_type: string;
  created_at: string;
}

const STATUS_STYLE: Record<string, { label: string; color: string; bg: string }> = {
  pending: { label: "Pending", color: "text-purple-700", bg: "bg-purple-50 border-purple-200" },
  processing: { label: "Processing", color: "text-blue-700", bg: "bg-blue-50 border-blue-200" },
  confirmed: { label: "Confirmed", color: "text-green-700", bg: "bg-green-50 border-green-200" },
  completed: { label: "Completed", color: "text-gray-700", bg: "bg-gray-50 border-gray-200" },
  cancelled: { label: "Cancelled", color: "text-red-700", bg: "bg-red-50 border-red-200" },
};

const BookingManagement = () => {
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [filterStatus, setFilterStatus] = useState("all");
  const [editingId, setEditingId] = useState<number | null>(null);
  const [newStatus, setNewStatus] = useState<string>("");

  const fetchBookings = async () => {
    setLoading(true);
    setError("");
    try {
      const response = await API.get("admin/bookings/");
      const data = response.data;
      setBookings(Array.isArray(data) ? data : (data.results || []));
    } catch (err: any) {
      let msg = "Failed to fetch bookings";
      if (err.response?.status === 401) msg = "Unauthorized: Please login again.";
      else if (err.response?.status === 403) msg = "Forbidden: Admin access required.";
      else if (err.response?.data?.error) msg = err.response.data.error;
      else if (err.message) msg = err.message;
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  const updateBookingStatus = async (bookingId: number) => {
    if (!newStatus) return;
    try {
      await API.patch(`admin/bookings/${bookingId}/update-status/`, { status: newStatus });
      setEditingId(null);
      fetchBookings();
    } catch (err: any) {
      alert(err.response?.data?.error || "Failed to update status");
    }
  };

  useEffect(() => { fetchBookings(); }, []);

  const filtered = bookings.filter((b) => {
    const matchStatus = filterStatus === "all" || b.status === filterStatus;
    const q = search.toLowerCase();
    const matchSearch =
      b.property_info.title.toLowerCase().includes(q) ||
      b.user_info.first_name.toLowerCase().includes(q) ||
      b.user_info.last_name.toLowerCase().includes(q) ||
      b.user_info.email.toLowerCase().includes(q);
    return matchStatus && matchSearch;
  });

  const stats = [
    { label: "Total", value: bookings.length, icon: Package, color: "text-purple-500", bg: "bg-purple-50" },
    { label: "Processing", value: bookings.filter(b => b.status === "pending" || b.status === "processing").length, icon: Clock, color: "text-blue-500", bg: "bg-blue-50" },
    { label: "Confirmed", value: bookings.filter(b => b.status === "confirmed").length, icon: CheckCircle2, color: "text-green-500", bg: "bg-green-50" },
    { label: "Completed", value: bookings.filter(b => b.status === "completed").length, icon: Package, color: "text-gray-500", bg: "bg-gray-50" },
    { label: "Cancelled", value: bookings.filter(b => b.status === "cancelled").length, icon: XCircle, color: "text-red-500", bg: "bg-red-50" },
  ];

  const statusFilters = ["all", "pending", "processing", "confirmed", "completed", "cancelled"];

  return (
    <div className="min-h-screen bg-[#F8F9FA] pb-12 font-sans text-gray-800">
      <Header />
      <main className="max-w-7xl mx-auto px-4 sm:px-6 py-8">
        {/* Header */}
        <div className="flex justify-between items-end mb-10">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <Package className="text-[#A989C8]" size={24} />
              <h1 className="text-2xl sm:text-3xl font-black text-gray-900 tracking-tight">Booking Management</h1>
            </div>
            <p className="text-gray-500 font-medium">View and manage all bookings</p>
          </div>
          <div className="relative w-full max-w-xs hidden sm:block">
            <Search size={18} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              placeholder="Search bookings..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 bg-white border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-[#A989C8]/30 focus:border-[#A989C8] outline-none transition-all shadow-sm"
            />
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-5 mb-8">
          {stats.map((s, i) => {
            const Icon = s.icon;
            return (
              <div key={i} className="bg-white p-5 rounded-[2rem] border border-gray-100 shadow-sm">
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center mb-3 ${s.bg}`}>
                  <Icon size={20} className={s.color} />
                </div>
                <p className="text-2xl font-black text-gray-900">{s.value}</p>
                <p className="text-xs text-gray-400 font-bold uppercase mt-0.5">{s.label}</p>
              </div>
            );
          })}
        </div>

        {/* Filter + Mobile Search */}
        <div className="flex flex-col sm:flex-row sm:items-center gap-4 mb-8">
          <div className="bg-white rounded-[2rem] border border-gray-100 p-1.5 shadow-sm inline-flex overflow-x-auto">
            {statusFilters.map((s) => (
              <button
                key={s}
                onClick={() => setFilterStatus(s)}
                className={`px-4 py-2 rounded-xl font-bold text-xs whitespace-nowrap transition-all ${
                  filterStatus === s
                    ? 'bg-gradient-to-r from-[#A989C8] to-purple-700 text-white shadow-md'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                {s === "all" ? "All" : s.charAt(0).toUpperCase() + s.slice(1)}
              </button>
            ))}
          </div>
          <div className="relative w-full sm:hidden">
            <Search size={18} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              placeholder="Search bookings..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 bg-white border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-[#A989C8]/30 focus:border-[#A989C8] outline-none transition-all shadow-sm"
            />
          </div>
        </div>

        {/* Error */}
        {error && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-[2rem] text-red-700 text-sm font-bold flex items-center gap-3">
            <XCircle size={18} className="shrink-0" />
            {error}
          </div>
        )}

        {/* Loading */}
        {loading && (
          <div className="flex items-center justify-center py-32">
            <div className="bg-white rounded-[2rem] p-10 border border-gray-100 shadow-sm text-center">
              <Loader2 size={40} className="animate-spin text-[#A989C8] mx-auto mb-4" />
              <p className="text-gray-500 font-bold">Loading bookings...</p>
            </div>
          </div>
        )}

        {/* List */}
        {!loading && filtered.length > 0 && (
          <div className="space-y-4">
            {filtered.map((booking) => {
              const badge = STATUS_STYLE[booking.status] || STATUS_STYLE.pending;
              return (
                <div key={booking.id} className="bg-white rounded-[2rem] border border-gray-100 shadow-sm p-6 hover:shadow-lg transition-shadow">
                  <div className="flex flex-col lg:flex-row gap-6">
                    {/* Image */}
                    <div className="w-full lg:w-48 h-32 rounded-2xl bg-gray-100 overflow-hidden shrink-0">
                      {booking.property_info.images[0] ? (
                        <img
                          src={`http://localhost:8000${booking.property_info.images[0].image}`}
                          alt={booking.property_info.title}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center bg-gray-100">
                          <Home size={32} className="text-gray-300" />
                        </div>
                      )}
                    </div>

                    {/* Details */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-4">
                        <div>
                          <h3 className="font-black text-gray-900 text-lg">{booking.property_info.title}</h3>
                          <p className="text-sm text-gray-500 mt-0.5">{booking.property_info.address}, {booking.property_info.city}</p>
                        </div>
                        <span className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[10px] font-black border shrink-0 ${badge.bg} ${badge.color}`}>
                          {badge.label}
                        </span>
                      </div>

                      {/* Tenant */}
                      <div className="flex items-center gap-4 mt-3 text-sm text-gray-600">
                        <span className="inline-flex items-center gap-1.5">
                          <Users size={14} className="text-purple-400" />
                          {booking.user_info.first_name} {booking.user_info.last_name}
                        </span>
                        <span className="text-gray-300">|</span>
                        <span className="text-xs text-gray-400">{booking.user_info.email}</span>
                      </div>

                      {/* Dates & Price */}
                      <div className="flex flex-wrap items-center gap-x-6 gap-y-2 mt-3 text-sm">
                        <span className="inline-flex items-center gap-1.5 text-gray-500">
                          <Calendar size={14} className="text-blue-400" />
                          {new Date(booking.check_in).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} – {new Date(booking.check_out).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                        </span>
                        <span className="font-black text-gray-900">NPR {booking.total_price.toLocaleString()}</span>
                        <span className="text-[10px] font-bold text-gray-400 uppercase">
                          {booking.payment_status} · {booking.payment_type}
                        </span>
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="flex lg:flex-col items-center lg:items-end justify-between lg:justify-center gap-3 shrink-0">
                      {editingId === booking.id ? (
                        <div className="flex flex-col gap-2 w-full">
                          <select
                            value={newStatus}
                            onChange={(e) => setNewStatus(e.target.value)}
                            className="px-3 py-2 border border-gray-200 rounded-xl text-sm font-bold focus:ring-2 focus:ring-[#A989C8]/30 outline-none"
                          >
                            <option value="">Select status</option>
                            {Object.keys(STATUS_STYLE).map((s) => (
                              <option key={s} value={s}>{STATUS_STYLE[s].label}</option>
                            ))}
                          </select>
                          <div className="flex gap-2">
                            <button
                              onClick={() => updateBookingStatus(booking.id)}
                              className="flex-1 px-3 py-2 bg-green-500 text-white rounded-xl text-xs font-bold hover:bg-green-600 transition-colors"
                            >
                              Save
                            </button>
                            <button
                              onClick={() => setEditingId(null)}
                              className="flex-1 px-3 py-2 bg-gray-200 text-gray-700 rounded-xl text-xs font-bold hover:bg-gray-300 transition-colors"
                            >
                              Cancel
                            </button>
                          </div>
                        </div>
                      ) : (
                        <button
                          onClick={() => { setEditingId(booking.id); setNewStatus(booking.status); }}
                          className="inline-flex items-center gap-2 px-4 py-2.5 bg-[#A989C8] text-white rounded-xl text-xs font-bold hover:bg-[#9678b5] transition-colors"
                        >
                          Change Status <ArrowRight size={14} />
                        </button>
                      )}
                      <p className="text-[10px] text-gray-400 font-bold text-right">
                        #{booking.id}
                      </p>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Empty */}
        {!loading && filtered.length === 0 && (
          <div className="bg-white rounded-[2rem] border border-gray-100 p-16 text-center shadow-sm">
            <div className="w-16 h-16 mx-auto mb-4 bg-gray-100 rounded-2xl flex items-center justify-center">
              <Package size={32} className="text-gray-400" />
            </div>
            <p className="text-gray-600 font-bold text-lg">
              {search || filterStatus !== "all" ? "No matching results" : "No bookings found"}
            </p>
            {(search || filterStatus !== "all") && (
              <button
                onClick={() => { setSearch(''); setFilterStatus('all'); }}
                className="mt-3 text-sm text-[#A989C8] font-black hover:text-purple-800 transition-colors uppercase tracking-wider"
              >
                Clear filters
              </button>
            )}
          </div>
        )}
      </main>
    </div>
  );
};

export default BookingManagement;
