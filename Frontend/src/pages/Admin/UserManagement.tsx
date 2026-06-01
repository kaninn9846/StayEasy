import { useState, useEffect } from "react";
import { Header } from "../../components/admin/Header";
import UserDetailModal from "../../components/admin/UserDetailModal";
import { Users, Building2, Loader2, Search, Mail, Calendar, ShieldCheck, ShieldAlert, ChevronRight, Filter } from "lucide-react";
import API from "../../services/api";

interface User {
  id: number;
  username: string;
  email: string;
  first_name: string;
  last_name: string;
  user_type: string;
  role: string;
  email_verified: boolean;
  kyc_status?: string;
  date_joined: string;
  bookings_count?: number;
  properties_count?: number;
  total_bookings?: number;
}

const UserManagement = () => {
  const [activeTab, setActiveTab] = useState<"users" | "landlords">("users");
  const [users, setUsers] = useState<User[]>([]);
  const [landlords, setLandlords] = useState<User[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [selectedUserId, setSelectedUserId] = useState<number | null>(null);
  const [modalOpen, setModalOpen] = useState(false);

  const openUserDetail = (id: number) => {
    setSelectedUserId(id);
    setModalOpen(true);
  };

  const fetchUsers = async () => {
    setLoading(true);
    setError("");
    try {
      const response = await API.get("admin/users/");
      const data = response.data;
      setUsers(Array.isArray(data) ? data : (data.results || []));
    } catch (err: any) {
      let errorMessage = "Failed to fetch users";
      if (err.response?.status === 401) errorMessage = "Unauthorized: Invalid or expired token. Please login again.";
      else if (err.response?.status === 403) errorMessage = "Forbidden: Admin access required.";
      else if (err.response?.data?.error) errorMessage = err.response.data.error;
      else if (err.message) errorMessage = err.message;
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const fetchLandlords = async () => {
    setLoading(true);
    setError("");
    try {
      const response = await API.get("admin/landlords/");
      const data = response.data;
      setLandlords(Array.isArray(data) ? data : (data.results || []));
    } catch (err: any) {
      let errorMessage = "Failed to fetch landlords";
      if (err.response?.status === 401) errorMessage = "Unauthorized: Invalid or expired token. Please login again.";
      else if (err.response?.status === 403) errorMessage = "Forbidden: Admin access required.";
      else if (err.response?.data?.error) errorMessage = err.response.data.error;
      else if (err.message) errorMessage = err.message;
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (activeTab === "users") fetchUsers();
    else fetchLandlords();
  }, [activeTab]);

  const data = activeTab === "users" ? users : landlords;

  const filtered = data.filter((u) => {
    const q = search.toLowerCase();
    return (
      u.first_name.toLowerCase().includes(q) ||
      u.last_name.toLowerCase().includes(q) ||
      u.email.toLowerCase().includes(q) ||
      u.username.toLowerCase().includes(q)
    );
  });

  const isVerified = (u: User) =>
    activeTab === "users" ? u.email_verified : u.kyc_status === "approved";

  const verifiedCount = data.filter(isVerified).length;
  const unverifiedCount = data.length - verifiedCount;

  const getInitials = (first: string, last: string) => {
    return `${(first || '')[0] || ''}${(last || '')[0] || ''}`.toUpperCase() || '?';
  };

  const avatarColors = [
    'bg-purple-500', 'bg-blue-500', 'bg-green-500', 'bg-orange-500',
    'bg-pink-500', 'bg-teal-500', 'bg-indigo-500', 'bg-rose-500',
  ];

  const getAvatarColor = (id: number) => avatarColors[id % avatarColors.length];

  return (
    <div className="min-h-screen bg-[#F8F9FA] pb-12 font-sans text-gray-800">
      <Header />

      <main className="max-w-7xl mx-auto px-4 sm:px-6 py-8">
        {/* Header */}
        <div className="flex justify-between items-end mb-10">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <Users className="text-[#A989C8]" size={24} />
              <h1 className="text-2xl sm:text-3xl font-black text-gray-900 tracking-tight">User Management</h1>
            </div>
            <p className="text-gray-500 font-medium">Manage tenants and property owners</p>
          </div>
          <div className="relative w-full max-w-xs hidden sm:block">
            <Search size={18} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              placeholder={`Search ${activeTab === "users" ? "tenants" : "landlords"}...`}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 bg-white border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-[#A989C8]/30 focus:border-[#A989C8] outline-none transition-all shadow-sm"
            />
          </div>
        </div>

        {/* Stats Row */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <div className="bg-white p-6 rounded-[2rem] border border-gray-100 shadow-sm">
            <div className="flex justify-between items-start mb-4">
              <div className="p-2 bg-purple-50 rounded-lg text-purple-500">
                <Users size={22} />
              </div>
            </div>
            <h4 className="text-4xl font-black text-gray-900">{data.length}</h4>
            <p className="text-sm font-bold text-gray-500 tracking-tight mt-1">Total {activeTab === "users" ? "Tenants" : "Landlords"}</p>
          </div>
          <div className="bg-white p-6 rounded-[2rem] border border-gray-100 shadow-sm">
            <div className="flex justify-between items-start mb-4">
              <div className="p-2 bg-green-50 rounded-lg text-green-500">
                <ShieldCheck size={22} />
              </div>
            </div>
            <h4 className="text-4xl font-black text-green-600">{verifiedCount}</h4>
            <p className="text-sm font-bold text-gray-500 tracking-tight mt-1">Verified</p>
          </div>
          <div className="bg-white p-6 rounded-[2rem] border border-gray-100 shadow-sm">
            <div className="flex justify-between items-start mb-4">
              <div className="p-2 bg-yellow-50 rounded-lg text-yellow-500">
                <ShieldAlert size={22} />
              </div>
            </div>
            <h4 className="text-4xl font-black text-yellow-600">{unverifiedCount}</h4>
            <p className="text-sm font-bold text-gray-500 tracking-tight mt-1">Unverified</p>
          </div>
          <div className="bg-white p-6 rounded-[2rem] border border-gray-100 shadow-sm">
            <div className="flex justify-between items-start mb-4">
              <div className="p-2 bg-blue-50 rounded-lg text-blue-500">
                <Building2 size={22} />
              </div>
            </div>
            <h4 className="text-4xl font-black text-blue-600">
              {data.length > 0
                ? (data.reduce((s, u) => s + (activeTab === "users" ? (u.bookings_count || 0) : (u.properties_count || 0)), 0) / data.length).toFixed(1)
                : '0'}
            </h4>
            <p className="text-sm font-bold text-gray-500 tracking-tight mt-1">{activeTab === "users" ? "Avg Bookings" : "Avg Properties"}</p>
          </div>
        </div>

        {/* Tabs + Mobile Search */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
          <div className="bg-white rounded-[2rem] border border-gray-100 p-1.5 shadow-sm inline-flex">
            <button
              onClick={() => setActiveTab("users")}
              className={`relative px-5 py-2 rounded-xl font-bold text-sm flex items-center gap-2 transition-all ${
                activeTab === "users"
                  ? "bg-gradient-to-r from-[#A989C8] to-purple-700 text-white shadow-md"
                  : "text-gray-600 hover:text-gray-900"
              }`}
            >
              <Users size={16} />
              Tenants
              <span className={`ml-1 px-2 py-0.5 rounded-full text-[10px] font-black ${
                activeTab === "users" ? "bg-white/25 text-white" : "bg-gray-200 text-gray-600"
              }`}>{users.length}</span>
            </button>
            <button
              onClick={() => setActiveTab("landlords")}
              className={`relative px-5 py-2 rounded-xl font-bold text-sm flex items-center gap-2 transition-all ${
                activeTab === "landlords"
                  ? "bg-gradient-to-r from-[#A989C8] to-purple-700 text-white shadow-md"
                  : "text-gray-600 hover:text-gray-900"
              }`}
            >
              <Building2 size={16} />
              Landlords
              <span className={`ml-1 px-2 py-0.5 rounded-full text-[10px] font-black ${
                activeTab === "landlords" ? "bg-white/25 text-white" : "bg-gray-200 text-gray-600"
              }`}>{landlords.length}</span>
            </button>
          </div>
          <div className="relative w-full sm:hidden">
            <Search size={18} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              placeholder={`Search ${activeTab === "users" ? "tenants" : "landlords"}...`}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 bg-white border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-[#A989C8]/30 focus:border-[#A989C8] outline-none transition-all shadow-sm"
            />
          </div>
        </div>

        {/* Error */}
        {error && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-[2rem] text-red-700 text-sm font-bold flex items-center gap-3">
            <ShieldAlert size={18} className="shrink-0" />
            {error}
          </div>
        )}

        {/* Loading */}
        {loading && (
          <div className="flex items-center justify-center py-32">
            <div className="bg-white rounded-[2rem] p-10 border border-gray-100 shadow-sm text-center">
              <Loader2 size={40} className="animate-spin text-[#A989C8] mx-auto mb-4" />
              <p className="text-gray-500 font-bold">Loading {activeTab === "users" ? "tenants" : "landlords"}...</p>
            </div>
          </div>
        )}

        {/* User Cards */}
        {!loading && filtered.length > 0 && (
          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-5">
            {filtered.map((u) => (
              <div
                key={u.id}
                onClick={() => openUserDetail(u.id)}
                className="group bg-white rounded-[2rem] border border-gray-100 p-6 hover:shadow-lg hover:border-[#A989C8]/30 transition-all duration-200 cursor-pointer shadow-sm"
              >
                <div className="flex items-start gap-4">
                  {/* Avatar */}
                  <div className={`w-14 h-14 rounded-2xl ${getAvatarColor(u.id)} flex items-center justify-center text-white font-bold text-xl shadow-sm shrink-0`}>
                    {getInitials(u.first_name, u.last_name)}
                  </div>

                  {/* Details */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <h3 className="font-black text-gray-900 text-base truncate">
                          {u.first_name} {u.last_name}
                        </h3>
                        <p className="text-sm text-gray-500 flex items-center gap-1.5 mt-0.5">
                          <Mail size={13} className="shrink-0" />
                          <span className="truncate">{u.email}</span>
                        </p>
                        <p className="text-xs text-gray-400 flex items-center gap-1 mt-0.5">
                          <span>@{u.username}</span>
                          <span className="text-gray-300 mx-1">·</span>
                          <span className="capitalize">{u.user_type}</span>
                        </p>
                      </div>
                      <ChevronRight size={16} className="text-gray-300 group-hover:text-[#A989C8] transition-colors shrink-0 mt-1" />
                    </div>

                    {/* Bottom Row */}
                    <div className="flex items-center justify-between mt-3 pt-3 border-t border-gray-50">
                      <div className="flex items-center gap-2 text-xs text-gray-500">
                        <Calendar size={12} />
                        {new Date(u.date_joined).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                      </div>
                      {/* Status Badge */}
                      <span
                        className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-black shrink-0 ${
                          isVerified(u)
                            ? "bg-green-50 text-green-700 border border-green-200"
                            : "bg-yellow-50 text-yellow-700 border border-yellow-200"
                        }`}
                      >
                        {isVerified(u) ? (
                          <ShieldCheck size={11} />
                        ) : (
                          <ShieldAlert size={11} />
                        )}
                        {activeTab === "users"
                          ? (isVerified(u) ? "Verified" : "Unverified")
                          : (u.kyc_status === "approved" ? "KYC OK"
                            : u.kyc_status === "pending" ? "KYC Pending"
                            : u.kyc_status === "not_submitted" ? "No KYC"
                            : "KYC Rejected")
                        }
                      </span>
                    </div>

                    {/* Stats Row */}
                    <div className="flex items-center gap-4 mt-2 text-xs text-gray-400">
                      {activeTab === "users" ? (
                        <span className="inline-flex items-center gap-1">
                          <Building2 size={12} className="text-purple-400" />
                          <span className="font-bold text-gray-600">{u.bookings_count || 0}</span> bookings
                        </span>
                      ) : (
                        <>
                          <span className="inline-flex items-center gap-1">
                            <Building2 size={12} className="text-orange-400" />
                            <span className="font-bold text-gray-600">{u.properties_count || 0}</span> properties
                          </span>
                          <span className="inline-flex items-center gap-1">
                            <Users size={12} className="text-blue-400" />
                            <span className="font-bold text-gray-600">{u.total_bookings || 0}</span> bookings
                          </span>
                        </>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Empty State */}
        {!loading && filtered.length === 0 && (
          <div className="bg-white rounded-[2rem] border border-gray-100 p-16 text-center shadow-sm">
            <div className="w-16 h-16 mx-auto mb-4 bg-gray-100 rounded-2xl flex items-center justify-center">
              {activeTab === "users" ? (
                <Users size={32} className="text-gray-400" />
              ) : (
                <Building2 size={32} className="text-gray-400" />
              )}
            </div>
            <p className="text-gray-600 font-bold text-lg">
              {search ? "No matching results" : `No ${activeTab === "users" ? "tenants" : "landlords"} found`}
            </p>
            {search && (
              <button
                onClick={() => setSearch("")}
                className="mt-3 text-sm text-[#A989C8] font-black hover:text-purple-800 transition-colors uppercase tracking-wider"
              >
                Clear search
              </button>
            )}
          </div>
        )}
      </main>

      {/* User Detail Modal */}
      {selectedUserId && (
        <UserDetailModal
          userId={selectedUserId}
          userType={activeTab}
          isOpen={modalOpen}
          onClose={() => setModalOpen(false)}
          onKycUpdate={() => { if (activeTab === "landlords") fetchLandlords(); }}
        />
      )}
    </div>
  );
};

export default UserManagement;
